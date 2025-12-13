import express from 'express';
import cors from 'cors'; // <--- NEW: Allow Vercel to connect
import bot from './bot.js';
import { getChatIdByGstin, getUser } from './db/index.js';
import { generateOTP, verifyOTP } from './modules/otpHelper.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();

// Log server initialization
console.log('🌐 Express server initialized');

// =======================
// MIDDLEWARE
// =======================
app.use(express.json());

// CORS Configuration
// Allow both development and production origins
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000', '*'], 
    methods: ['GET', 'POST'],
    credentials: true
}));

// =======================
// HELPER FUNCTIONS
// =======================

// Helper function to get state name from state code
const getStateName = (stateCode) => {
    const stateMap = {
        '01': 'Jammu and Kashmir',
        '02': 'Himachal Pradesh',
        '03': 'Punjab',
        '04': 'Chandigarh',
        '05': 'Uttarakhand',
        '06': 'Haryana',
        '07': 'Delhi',
        '08': 'Rajasthan',
        '09': 'Uttar Pradesh',
        '10': 'Bihar',
        '11': 'Sikkim',
        '12': 'Arunachal Pradesh',
        '13': 'Nagaland',
        '14': 'Manipur',
        '15': 'Mizoram',
        '16': 'Tripura',
        '17': 'Meghalaya',
        '18': 'Assam',
        '19': 'West Bengal',
        '20': 'Jharkhand',
        '21': 'Odisha',
        '22': 'Chhattisgarh',
        '23': 'Madhya Pradesh',
        '24': 'Gujarat',
        '25': 'Daman and Diu',
        '26': 'Dadra and Nagar Haveli',
        '27': 'Maharashtra',
        '28': 'Andhra Pradesh',
        '29': 'Karnataka',
        '30': 'Goa',
        '31': 'Lakshadweep',
        '32': 'Kerala',
        '33': 'Tamil Nadu',
        '34': 'Puducherry',
        '35': 'Andaman and Nicobar Islands',
        '36': 'Telangana',
        '37': 'Andhra Pradesh',
        '38': 'Ladakh'
    };
    return stateMap[stateCode] || 'Unknown';
};

// =======================
// API ROUTES
// =======================

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'CompliBot API is running',
        timestamp: new Date().toISOString(),
        bot_connected: bot ? true : false
    });
});

// 1. Send OTP
app.post('/api/auth/otp', async (req, res) => {
    try {
        const { gstin } = req.body;
        console.log(`📨 OTP request received for GSTIN: ${gstin}`);

        if (!gstin) {
            console.log('❌ OTP request missing GSTIN');
            return res.status(400).json({ success: false, message: 'GSTIN is required' });
        }
        
        // Check if user exists in DB
        const chatId = await getChatIdByGstin(gstin);

        if (!chatId) {
            console.log(`❌ GSTIN not found in database: ${gstin}`);
            return res.status(400).json({ success: false, message: 'GSTIN not found in database' });
        }

        // Generate & Send
        const otp = generateOTP(gstin);
        console.log(`🔐 Generated OTP for GSTIN: ${gstin}`);

        try {
            await bot.telegram.sendMessage(chatId, `🔐 *CompliBot Login*\n\nYour OTP is: *${otp}*`, { parse_mode: 'Markdown' });
            console.log(`✅ OTP sent successfully to chat ID: ${chatId}`);
            res.json({ success: true, message: 'OTP sent successfully' });
        } catch (telegramErr) {
            console.error("❌ Telegram Error:", telegramErr);
            res.status(500).json({ success: false, message: 'Failed to send OTP' });
        }
    } catch (error) {
        console.error('❌ Error in OTP endpoint:', error);
        res.status(500).json({ success: false, message: 'Failed to send OTP' });
    }
});

// 2. Verify OTP
app.post('/api/auth/verify', async (req, res) => {
    try {
        const { gstin, otp } = req.body;
        console.log(`🔍 OTP verification request for GSTIN: ${gstin}`);

        if (!gstin || !otp) {
            console.log('❌ OTP verification missing required fields');
            return res.status(400).json({ success: false, message: 'GSTIN and OTP are required' });
        }

        if (verifyOTP(gstin, otp)) {
            // SUCCESS: Get user data and format it according to API contract
            const chatId = await getChatIdByGstin(gstin);
            const userData = await getUser(chatId);
            
            if (!userData) {
                console.log(`❌ User data not found for GSTIN: ${gstin}`);
                return res.status(400).json({ success: false, message: 'User data not found' });
            }

            // Format user object according to API contract
            const user = {
                gstin: userData.gstin,
                trade_name: userData.trade_name,
                legal_name: userData.legal_name || userData.trade_name, // Use trade_name as fallback
                business_type: userData.business_type || 'General',
                registration_date: userData.registration_date || new Date().toISOString().split('T')[0],
                state: getStateName(userData.state_code) || 'Unknown',
                status: 'Active'
            };
            
            console.log(`✅ OTP verification successful for GSTIN: ${gstin}`);
            res.json({ 
                success: true,
                user: user
            });
        } else {
            console.log(`❌ OTP verification failed for GSTIN: ${gstin}`);
            res.status(400).json({ success: false, message: 'Invalid OTP' });
        }
    } catch (error) {
        console.error('❌ Error in OTP verification endpoint:', error);
        res.status(500).json({ success: false, message: 'Verification failed' });
    }
});

// 3. Get Dashboard Data (Protected)
// Frontend will call this with GSTIN to get latest stats
app.get('/api/dashboard/:gstin', async (req, res) => {
    try {
        const { gstin } = req.params;
        console.log(`📊 Dashboard data request for GSTIN: ${gstin}`);
        
        // Security Check: In real life, verify JWT header here.
        
        const chatId = await getChatIdByGstin(gstin);
        if (!chatId) {
            console.log(`❌ Dashboard request - User not found for GSTIN: ${gstin}`);
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const user = await getUser(chatId);
        console.log(`✅ Dashboard data retrieved for GSTIN: ${gstin}`);

        // Mock Data for now (Later, Member 3 will provide real tax data)
        res.json({
            success: true,
            profile: user,
            stats: {
                pendingFilings: 1,
                nextDeadline: '20th Dec',
                penaltiesSaved: 500
            }
        });
    } catch (error) {
        console.error('❌ Error in dashboard endpoint:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

export default app;
import express from 'express';
import cors from 'cors'; // <--- NEW: Allow Vercel to connect
import bot from './bot.js';
import { getChatIdByGstin, getUser } from './db/index.js';
import { generateOTP, verifyOTP } from './modules/otpHelper.js';

const app = express();

// =======================
// MIDDLEWARE
// =======================
app.use(express.json());

// CORS Configuration
// In production, replace '*' with your actual Vercel URL (e.g., 'https://complibot.vercel.app')
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST']
}));

// =======================
// API ROUTES
// =======================

// 1. Send OTP
app.post('/api/auth/otp', async (req, res) => {
    const { gstin } = req.body;

    if (!gstin) return res.status(400).json({ error: 'GSTIN is required' });
    
    // Check if user exists in DB
    const chatId = await getChatIdByGstin(gstin);

    if (!chatId) {
        return res.status(404).json({ success: false, message: 'GSTIN not found. Please start the Telegram bot first.' });
    }

    // Generate & Send
    const otp = generateOTP(gstin);

    try {
        await bot.telegram.sendMessage(chatId, `🔐 *CompliBot Login*\n\nYour OTP is: *${otp}*`, { parse_mode: 'Markdown' });
        res.json({ success: true, message: 'OTP sent to Telegram' });
    } catch (err) {
        console.error("Telegram Error:", err);
        res.status(500).json({ success: false, message: 'Failed to send OTP via Telegram' });
    }
});

// 2. Verify OTP
app.post('/api/auth/verify', async (req, res) => {
    const { gstin, otp } = req.body;

    if (verifyOTP(gstin, otp)) {
        // SUCCESS: In a real app, return a JWT token here.
        // For Hackathon, returning the User Profile is enough.
        const chatId = await getChatIdByGstin(gstin);
        const user = await getUser(chatId);
        
        res.json({ 
            success: true, 
            message: 'Login Successful',
            user: user // Frontend will store this in localStorage
        });
    } else {
        res.status(401).json({ success: false, message: 'Invalid or Expired OTP' });
    }
});

// 3. Get Dashboard Data (Protected)
// Frontend will call this with GSTIN to get latest stats
app.get('/api/dashboard/:gstin', async (req, res) => {
    const { gstin } = req.params;
    
    // Security Check: In real life, verify JWT header here.
    
    const chatId = await getChatIdByGstin(gstin);
    if (!chatId) return res.status(404).json({ error: 'User not found' });

    const user = await getUser(chatId);

    // Mock Data for now (Later, Member 3 will provide real tax data)
    res.json({
        profile: user,
        stats: {
            pendingFilings: 1,
            nextDeadline: '20th Dec',
            penaltiesSaved: 500
        }
    });
});

export default app;
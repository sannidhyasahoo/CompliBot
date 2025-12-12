import bot from './bot.js';
import app from './server.js'; // Import the Express App
import dotenv from 'dotenv';



// Load environment variables
dotenv.config();

const startString = '🚀 CompliBot is online...';
const PORT = process.env.PORT || 3000;

// Startup function with proper error handling
const startApplication = async () => {
    try {
        // 1. Start Bot first
        console.log('🤖 Starting Telegram Bot...');
        await bot.launch();
        console.log('✅ Telegram Bot connected successfully');

        // 2. Start Express Server
        console.log(`🌐 Starting Express server on port ${PORT}...`);
        app.listen(PORT, () => {
            console.log(`${startString} (Web Dashboard on Port ${PORT})`);
            console.log(`📊 Dashboard API available at http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error('❌ Failed to start application:', error);
        process.exit(1);
    }
};

// Start the application
startApplication();

// Graceful Stop
const gracefulShutdown = (signal) => {
    console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
    bot.stop(signal);
    process.exit(0);
};

process.once('SIGINT', () => gracefulShutdown('SIGINT'));
process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));
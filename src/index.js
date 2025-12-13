const { initDB } = require('./db');
const bot = require('./bot');
const config = require('./config/env');

// Configuration from centralized config
const NODE_ENV = config.server.nodeEnv;
const LOG_LEVEL = config.logging.level;

// Initialize application
async function startApplication() {
    try {
        console.log('🚀 Starting CompliBot Application...');
        console.log(`🌍 Environment: ${NODE_ENV}`);
        console.log(`📊 Log Level: ${LOG_LEVEL}`);

        // Initialize database
        console.log('📊 Initializing database...');
        await initDB();

        // Check if bot token is available
        if (!config.telegram.botToken) {
            console.log('⚠️  Telegram bot token not configured. Skipping bot startup.');
            console.log('💡 To enable the bot, add TELEGRAM_BOT_TOKEN to your .env file');
            return;
        }

        // Start Telegram bot
        console.log('🤖 Starting Telegram bot...');
        await bot.launch();

        console.log('✅ CompliBot is running successfully!');
        console.log('📋 Available services:');
        console.log('   • Telegram Bot: Active');
        console.log('   • Database: Connected');
        console.log('   • GST Processing: Ready');
        console.log('   • Multilingual Support: English, Hindi, Telugu');

        // Graceful shutdown
        process.once('SIGINT', () => {
            console.log('🛑 Received SIGINT, shutting down gracefully...');
            bot.stop('SIGINT');
            process.exit(0);
        });

        process.once('SIGTERM', () => {
            console.log('🛑 Received SIGTERM, shutting down gracefully...');
            bot.stop('SIGTERM');
            process.exit(0);
        });

    } catch (error) {
        console.error('❌ Failed to start application:', error);

        if (error.message.includes('401: Unauthorized')) {
            console.error('💡 Please check your TELEGRAM_BOT_TOKEN in the .env file');
        } else if (error.message.includes('GOOGLE_AI_API_KEY')) {
            console.error('💡 Please check your GOOGLE_AI_API_KEY in the .env file');
        } else if (error.message.includes('Database')) {
            console.error('💡 Please check your database configuration in the .env file');
        }

        process.exit(1);
    }
}

// Start the application
if (require.main === module) {
    startApplication();
}

module.exports = {
    startApplication,
    bot
};
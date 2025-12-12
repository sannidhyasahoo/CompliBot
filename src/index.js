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

        // Start Telegram bot
        console.log('🤖 Starting Telegram bot...');
        await bot.launch();

        console.log('✅ CompliBot is running successfully!');
        console.log('📋 Available services:');
        console.log('   • Telegram Bot: Active');
        console.log('   • Database: Connected');
        console.log('   • GST Processing: Ready');

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
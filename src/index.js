const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Configuration
const config = {
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 8080,
    googleAI: {
        apiKey: process.env.GOOGLE_AI_API_KEY || "AIzaSyAa53MAoT_Zn_lJcqwUrH_qz36abpjUYOg",
        modelName: process.env.GOOGLE_AI_MODEL || "gemini-2.5-flash-lite"
    },
    telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN
    },
    gst: {
        version: "GST3.2.3",
        maxFileSize: 10 * 1024 * 1024 // 10MB
    }
};

console.log('🔧 Configuration loaded:');
console.log(`• Environment: ${config.environment}`);
console.log(`• Port: ${config.port}`);
console.log(`• AI Model: ${config.googleAI.modelName}`);
console.log(`• GST Version: ${config.gst.version}`);
console.log(`• Max File Size: ${(config.gst.maxFileSize / 1024 / 1024).toFixed(1)}MB`);
console.log(`• Telegram Bot: ${config.telegram.botToken ? 'Configured' : 'Not configured'}`);

console.log('\n🚀 Starting CompliBot Application...');
console.log(`🌍 Environment: ${config.environment}`);
console.log(`📊 Log Level: info`);

// Initialize database
console.log('📊 Initializing database...');
require('./db/index');

// Start Telegram bot if token is provided
if (config.telegram.botToken) {
    console.log('🤖 Starting Telegram bot...');
    const bot = require('./bot');

    bot.launch()
        .then(() => {
            console.log('✅ Telegram bot started successfully');
        })
        .catch((error) => {
            console.error('❌ Failed to start Telegram bot:', error);
        });

    // Enable graceful stop
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
} else {
    console.log('⚠️  Telegram bot token not provided. Bot will not start.');
    console.log('   Set TELEGRAM_BOT_TOKEN environment variable to enable bot functionality.');
}

// Start API server
console.log('🌐 Starting API server...');
const server = require('./server');

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

console.log('✅ CompliBot application started successfully!');
console.log(`📡 API Server: http://localhost:${config.port}`);
console.log(`🤖 Telegram Bot: ${config.telegram.botToken ? 'Active' : 'Inactive'}`);
console.log('\n💡 Ready to process GST invoices and assist with compliance!');
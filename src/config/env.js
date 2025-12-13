/**
 * Environment Configuration for CompliBot
 * Centralizes all environment variable handling
 */

require('dotenv').config();

const config = {
    // Application settings
    environment: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT) || 8080,

    // Google AI configuration
    googleAI: {
        apiKey: process.env.GOOGLE_AI_API_KEY || "AIzaSyAJyyvDgvJVM-K5_XaW8rLZU8vI9lE6Ulw",
        modelName: process.env.GOOGLE_AI_MODEL || "gemini-1.5-flash"
    },

    // Telegram bot configuration
    telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN
    },

    // Database configuration
    database: {
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN
    },

    // GST configuration
    gst: {
        version: process.env.GST_VERSION || "GST3.2.3",
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || (10 * 1024 * 1024) // 10MB
    },

    // Logging configuration
    logging: {
        level: process.env.LOG_LEVEL || 'info'
    }
};

// Validation
if (!config.googleAI.apiKey) {
    console.warn('⚠️  GOOGLE_AI_API_KEY not set. AI features may not work properly.');
}

if (!config.telegram.botToken) {
    console.warn('⚠️  TELEGRAM_BOT_TOKEN not set. Bot will not start.');
}

module.exports = config;
require('dotenv').config();

/**
 * Environment Configuration Validation
 * Validates and exports all environment variables with defaults
 */

// Required environment variables
const requiredEnvVars = [
    'GOOGLE_AI_API_KEY',
    'TURSO_DATABASE_URL',
    'TURSO_AUTH_TOKEN'
];

// Validate required environment variables
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => {
        console.error(`   - ${varName}`);
    });
    console.error('\n💡 Please check your .env file and ensure all required variables are set.');
    process.exit(1);
}

// Export configuration object
const config = {
    // Google AI Configuration
    googleAI: {
        apiKey: process.env.GOOGLE_AI_API_KEY,
        modelName: process.env.GOOGLE_AI_MODEL_NAME || 'gemini-2.5-flash-lite'
    },

    // Server Configuration
    server: {
        port: parseInt(process.env.PORT) || 8080,
        nodeEnv: process.env.NODE_ENV || 'development',
        corsOrigin: process.env.CORS_ORIGIN || '*',
        apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:8080'
    },

    // Database Configuration
    database: {
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN
    },

    // Telegram Bot Configuration
    telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN,
        required: false // Optional for API-only usage
    },

    // GST Configuration
    gst: {
        version: process.env.GST_VERSION || 'GST3.2.3',
        defaultTaxRate: parseFloat(process.env.DEFAULT_TAX_RATE) || 12.0,
        defaultDiffPercent: parseFloat(process.env.DEFAULT_DIFF_PERCENT) || 0.65
    },

    // File Upload Configuration
    upload: {
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB
        allowedTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || [
            'image/jpeg',
            'image/png',
            'image/jpg',
            'application/pdf'
        ]
    },

    // Security Configuration
    security: {
        requestTimeout: parseInt(process.env.REQUEST_TIMEOUT) || 30000
    },

    // Logging Configuration
    logging: {
        level: process.env.LOG_LEVEL || 'info'
    }
};

// Validate optional Telegram configuration if bot features are used
if (process.env.ENABLE_TELEGRAM_BOT === 'true' && !config.telegram.botToken) {
    console.error('❌ TELEGRAM_BOT_TOKEN is required when ENABLE_TELEGRAM_BOT=true');
    process.exit(1);
}

// Log configuration in development
if (config.server.nodeEnv === 'development') {
    console.log('🔧 Configuration loaded:');
    console.log(`   • Environment: ${config.server.nodeEnv}`);
    console.log(`   • Port: ${config.server.port}`);
    console.log(`   • AI Model: ${config.googleAI.modelName}`);
    console.log(`   • GST Version: ${config.gst.version}`);
    console.log(`   • Max File Size: ${(config.upload.maxFileSize / 1024 / 1024).toFixed(1)}MB`);
    console.log(`   • Telegram Bot: ${config.telegram.botToken ? 'Configured' : 'Not configured'}`);
}

module.exports = config;
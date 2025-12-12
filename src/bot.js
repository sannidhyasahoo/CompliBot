const { Telegraf } = require('telegraf');
const { getUser, addUser, getChatIdByGstin } = require('./db');
const config = require('./config/env');

// Bot configuration from centralized config
const BOT_TOKEN = config.telegram.botToken;
const NODE_ENV = config.server.nodeEnv;
const API_BASE_URL = config.server.apiBaseUrl;

if (!BOT_TOKEN) {
    console.warn('⚠️  TELEGRAM_BOT_TOKEN not configured. Bot features will be disabled.');
}

// Initialize bot
const bot = new Telegraf(BOT_TOKEN);

// Bot commands
bot.start(async (ctx) => {
    const welcomeMessage = `
🤖 Welcome to CompliBot - Your GST Compliance Assistant!

I can help you with:
📄 Process GST invoices from images
📊 Generate GST return JSON format
🔍 Validate GSTIN numbers
📋 Track your GST filings

Use /help to see all available commands.
    `;

    await ctx.reply(welcomeMessage);
});

bot.help((ctx) => {
    const helpMessage = `
📋 Available Commands:

/start - Start the bot
/help - Show this help message
/register - Register your GSTIN
/profile - View your profile
/process - Process an invoice image
/status - Check your filing status

📄 To process an invoice:
1. Send /process command
2. Upload your invoice image
3. Get structured GST data

🔧 Environment: ${NODE_ENV}
    `;

    ctx.reply(helpMessage);
});

bot.command('register', async (ctx) => {
    const chatId = ctx.chat.id;

    try {
        const existingUser = await getUser(chatId);
        if (existingUser) {
            return ctx.reply('✅ You are already registered!\nUse /profile to view your details.');
        }

        ctx.reply(`
📝 To register, please provide your details in this format:

/register_details GSTIN TradeName StateCode

Example:
/register_details 29AAACH7409R1Z2 "ABC Traders" 29

State codes: 29=Karnataka, 27=Maharashtra, 07=Delhi, etc.
        `);
    } catch (error) {
        console.error('Registration check error:', error);
        ctx.reply('❌ Error checking registration. Please try again.');
    }
});

bot.command('register_details', async (ctx) => {
    const chatId = ctx.chat.id;
    const args = ctx.message.text.split(' ').slice(1);

    if (args.length < 3) {
        return ctx.reply('❌ Invalid format. Use: /register_details GSTIN TradeName StateCode');
    }

    const [gstin, tradeName, stateCode] = args;

    try {
        await addUser({
            telegram_chat_id: chatId,
            gstin: gstin,
            trade_name: tradeName,
            state_code: stateCode
        });

        ctx.reply(`✅ Registration successful!
        
📋 Your Details:
GSTIN: ${gstin}
Trade Name: ${tradeName}
State Code: ${stateCode}

You can now use /process to upload invoices.`);
    } catch (error) {
        console.error('Registration error:', error);
        ctx.reply('❌ Registration failed. Please check your details and try again.');
    }
});

bot.command('profile', async (ctx) => {
    const chatId = ctx.chat.id;

    try {
        const user = await getUser(chatId);
        if (!user) {
            return ctx.reply('❌ You are not registered. Use /register to get started.');
        }

        const profileMessage = `
👤 Your Profile:

📋 GSTIN: ${user.gstin}
🏢 Trade Name: ${user.trade_name}
📍 State Code: ${user.state_code}
📅 Registered: ${user.registration_date}
💰 Default Tax Rate: ${user.default_tax_rate}%
        `;

        ctx.reply(profileMessage);
    } catch (error) {
        console.error('Profile fetch error:', error);
        ctx.reply('❌ Error fetching profile. Please try again.');
    }
});

bot.command('process', (ctx) => {
    ctx.reply(`
📄 Invoice Processing

Please upload your invoice image (JPG, PNG, or PDF) and I'll extract the GST data for you.

Supported formats:
• JPEG/JPG images
• PNG images  
• PDF documents

Just send the file after this message!
    `);
});

// Handle document/photo uploads
bot.on(['photo', 'document'], async (ctx) => {
    const chatId = ctx.chat.id;

    try {
        const user = await getUser(chatId);
        if (!user) {
            return ctx.reply('❌ Please register first using /register');
        }

        ctx.reply('📄 Processing your invoice... This may take a few moments.');

        // Here you would integrate with your GST processing API
        // For now, just acknowledge receipt
        ctx.reply(`
✅ Invoice received! 

🔄 Processing features:
• Data extraction from image
• GST validation
• Return format generation

This feature will be integrated with the GST processing API.
Use the web API at ${API_BASE_URL}/generate-gst-json for now.
        `);

    } catch (error) {
        console.error('Invoice processing error:', error);
        ctx.reply('❌ Error processing invoice. Please try again.');
    }
});

// Error handling
bot.catch((err, ctx) => {
    console.error('Bot error:', err);
    ctx.reply('❌ Something went wrong. Please try again.');
});

// Export bot for use in other modules
module.exports = bot;
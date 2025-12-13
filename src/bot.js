import { Telegraf, session } from 'telegraf';
import dotenv from 'dotenv';
import stage from './scenes/index.js'; // <--- IMPORT THIS
import { getUser } from './db/index.js'; // <--- IMPORT THIS

dotenv.config();

if (!process.env.BOT_TOKEN) {
    console.error('❌ BOT_TOKEN is missing from environment variables');
    throw new Error('❌ BOT_TOKEN is missing');
}

const bot = new Telegraf(process.env.BOT_TOKEN);

// Log bot initialization
console.log('🤖 Telegram bot initialized with token:', process.env.BOT_TOKEN.substring(0, 10) + '...');

// Middleware
bot.use(session());
bot.use(stage.middleware()); // <--- ENABLE THIS

// Global Error Handling
bot.catch((err, ctx) => {
    console.error(`❌ Global Error:`, err);
    ctx.reply('⚠️ Oops, something went wrong.');
});

// START COMMAND (The Entry Point)
bot.start(async (ctx) => {
    try {
        console.log(`🤖 Bot start command from chat ID: ${ctx.chat.id}`);
        
        const existingUser = await getUser(ctx.chat.id);

        if (existingUser) {
            console.log(`👋 Returning user: ${existingUser.trade_name} (${existingUser.gstin})`);
            ctx.reply(`👋 Welcome back, ${existingUser.trade_name}!\n\nUse /status to check filing status.`);
        } else {
            console.log(`🆕 New user starting onboarding for chat ID: ${ctx.chat.id}`);
            ctx.scene.enter('onboarding');
        }
    } catch (error) {
        console.error('❌ Error in bot start command:', error);
        ctx.reply('⚠️ Sorry, there was an error processing your request. Please try again.');
    }
});

// Status command to check user registration
bot.command('status', async (ctx) => {
    try {
        const user = await getUser(ctx.chat.id);
        if (user) {
            ctx.reply(`📊 *Your Status*\n\nBusiness: ${user.trade_name}\nGSTIN: ${user.gstin}\nState: ${user.state_code}\nRegistered: ${user.registration_date || 'N/A'}\n\n✅ You can now use the web dashboard!`, { parse_mode: 'Markdown' });
        } else {
            ctx.reply('❌ You are not registered yet. Please use /start to begin registration.');
        }
    } catch (error) {
        console.error('❌ Error in status command:', error);
        ctx.reply('⚠️ Error retrieving your status. Please try again.');
    }
});

// Helper Command to clear session/DB for testing (Optional)
bot.command('reset', (ctx) => {
    // You might want to add a deleteUser function to db/index.js for this
    ctx.reply('Debug: Please manually delete your row in the users table to reset.');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

export default bot;
import { Telegraf, Scenes, session } from 'telegraf';
import dotenv from 'dotenv';
import stage from './scenes/index.js'; // <--- IMPORT THIS
import { getUser } from './db/index.js'; // <--- IMPORT THIS

dotenv.config();

if (!process.env.BOT_TOKEN) throw new Error('❌ BOT_TOKEN is missing');

const bot = new Telegraf(process.env.BOT_TOKEN);

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
    
    // 2. ADD 'await' HERE vvv
    const existingUser = await getUser(ctx.chat.id);

    if (existingUser) {
        ctx.reply(`👋 Welcome back, ${existingUser.trade_name}!\n\nUse /status to check filing status.`);
    } else {
        ctx.scene.enter('onboarding');
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
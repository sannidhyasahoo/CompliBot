const { Scenes } = require('telegraf');
const { addUser } = require('../db/index');
const AIOrchestrator = require('../ai/orchestrator');

const { WizardScene } = Scenes;

// Initialize AI Orchestrator for contextual help
const aiOrchestrator = new AIOrchestrator();

const onboardingScene = new WizardScene(
    'onboarding', // Scene ID

    // ===========================
    // STEP 1: Welcome & Ask for Trade Name
    // ===========================
    async (ctx) => {
        await ctx.reply('🙏 Welcome to CompliBot - Your Intelligent GST Assistant!\n\n🤖 I\'m powered by advanced AI and can understand natural language. I\'ll help you with GST compliance, calculations, SMS filing, and much more!\n\nLet\'s get you set up so I can provide personalized assistance.\n\nFirst, what is your **Business/Trade Name**?\n\n📝 Example: "Ramesh General Store" or "ABC Enterprises"', { parse_mode: 'Markdown' });
        return ctx.wizard.next();
    },

    // ===========================
    // STEP 2: Ask for GSTIN
    // ===========================
    async (ctx) => {
        // Save the previous answer (Business Name) to session state
        ctx.wizard.state.trade_name = ctx.message.text.trim();

        await ctx.reply(`Perfect! Nice to meet you, **${ctx.wizard.state.trade_name}**! 🏢\n\nNow I need your **15-digit GSTIN** to provide accurate GST assistance.\n\n🔢 Please enter your GSTIN:\n\n📝 Example: 29ABCDE1234F1Z5`, { parse_mode: 'Markdown' });
        return ctx.wizard.next();
    },

    // ===========================
    // STEP 3: Validate & Save
    // ===========================
    async (ctx) => {
        const gstin = ctx.message.text.toUpperCase();

        // Basic Regex Validation for GSTIN (15 chars)
        const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

        if (!gstinRegex.test(gstin)) {
            ctx.reply('⚠️ That doesn\'t look like a valid GSTIN. Please try again (e.g., 29ABCDE1234F1Z5).');
            return; // Do NOT advance to next step; keep them here
        }

        // Extract State Code (First 2 digits of GSTIN)
        const stateCode = gstin.substring(0, 2);

        // Prepare User Object
        const newUser = {
            telegram_chat_id: ctx.chat.id,
            gstin: gstin,
            trade_name: ctx.wizard.state.trade_name,
            state_code: stateCode
        };

        try {
            // Save to DB
            await addUser(newUser);

            await ctx.reply(`🎉 Welcome to CompliBot, ${newUser.trade_name}!\n\n📋 **Your Registration Details:**\n🏢 Business: ${newUser.trade_name}\n🔢 GSTIN: ${newUser.gstin}\n📍 State Code: ${stateCode}\n\n🤖 **I'm your intelligent GST compliance assistant!**\n\nI understand natural language, so just talk to me like you would to a human assistant:\n\n💬 **Try saying:**\n• "File NIL return for March 2024"\n• "Calculate GST on ₹5000 at 18%"\n• "What is GST rate for medicines?"\n• "Help me with GST compliance"\n\n📄 **For invoice processing:** Just upload an image and I'll extract the data automatically!\n\n🌟 **No commands to remember - just chat naturally!**`, { parse_mode: 'Markdown' });

            // Send AI demo message after a short delay
            setTimeout(async () => {
                await ctx.reply('🤖 **Quick AI Demo!**\n\nTry asking me something right now:\n• "What is GST rate for rice?"\n• "Calculate GST on ₹1000 at 18%"\n• "File NIL return for this month"\n\nI\'ll understand and respond immediately! 🚀', { parse_mode: 'Markdown' });
            }, 2000);

            return ctx.scene.leave(); // Exit the wizard
        } catch (err) {
            console.error('❌ Registration Error:', err);

            if (err.message.includes('UNIQUE constraint failed: users.gstin')) {
                ctx.reply('⚠️ This GSTIN is already registered. Use /status to check your details.');
            } else if (err.message.includes('UNIQUE constraint failed: users.telegram_chat_id')) {
                ctx.reply('⚠️ You are already registered. Use /status to check your details.');
            } else if (err.message.includes('FOREIGN KEY constraint failed')) {
                ctx.reply(`⚠️ Invalid state code (${stateCode}) in GSTIN. Please check your GSTIN format.`);
            } else {
                ctx.reply('❌ Registration failed. Please try /start again or contact support.');
            }
            return ctx.scene.leave();
        }
    }
);

module.exports = onboardingScene;
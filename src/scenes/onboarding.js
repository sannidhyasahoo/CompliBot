import { Scenes } from 'telegraf';
import { addUser } from '../db/index.js'; // Import the helper we wrote earlier

const { WizardScene } = Scenes;

const onboardingScene = new WizardScene(
    'onboarding', // Scene ID

    // ===========================
    // STEP 1: Ask for Trade Name
    // ===========================
    (ctx) => {
        ctx.reply('👋 Welcome to CompliBot! \n\nI see you are new here. Let\'s get you set up.\n\nFirst, what is your **Business Name**? (e.g., Ramesh General Store)');
        return ctx.wizard.next();
    },

    // ===========================
    // STEP 2: Ask for GSTIN
    // ===========================
    (ctx) => {
        // Save the previous answer (Business Name) to session state
        ctx.wizard.state.trade_name = ctx.message.text;

        ctx.reply('Got it. Now, please enter your **15-digit GSTIN**.');
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
            addUser(newUser);
            
            ctx.reply(`✅ **Setup Complete!**\n\nBusiness: ${newUser.trade_name}\nGSTIN: ${newUser.gstin}\n\nYou can now use /status to check your filings.`);
            return ctx.scene.leave(); // Exit the wizard
        } catch (err) {
            console.error(err);
            if (err.message.includes('UNIQUE constraint failed')) {
                ctx.reply('⚠️ This GSTIN is already registered.');
            } else {
                ctx.reply('❌ Database Error. Please try /start again.');
            }
            return ctx.scene.leave();
        }
    }
);

export default onboardingScene;
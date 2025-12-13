const { Telegraf, session, Scenes } = require('telegraf');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config/env');
const { getUser, addUser, validateStateCode } = require('../db/index');
const { validateGSTIN, getStateCode } = require('../modules/gstHelper');

// Initialize Google AI
const genAI = new GoogleGenerativeAI(config.googleAI.apiKey);
const model = genAI.getGenerativeModel({ model: config.googleAI.modelName });

// Language support
const languages = {
    en: {
        welcome: "🙏 Welcome to CompliBot! I'll help you with GST compliance.\n\nPlease choose your preferred language:",
        onboarding_start: "Let's get you registered! I'll need some basic information about your business.",
        ask_trade_name: "📝 What is your business/trade name?",
        ask_legal_name: "🏢 What is your legal business name? (Optional - press /skip if same as trade name)",
        ask_gstin: "🔢 Please enter your 15-digit GSTIN:",
        ask_state: "📍 Which state is your business registered in?",
        invalid_gstin: "❌ Invalid GSTIN format. Please enter a valid 15-digit GSTIN (e.g., 29AAACH7409R1Z2)",
        invalid_state: "❌ Invalid state code. Please enter a valid 2-digit state code (e.g., 29 for Karnataka)",
        registration_success: "✅ Registration successful! Welcome to CompliBot, {tradeName}!\n\n📋 Your Details:\nGSTIN: {gstin}\nTrade Name: {tradeName}\nState: {stateCode}\n\nYou can now:\n• Upload invoices for processing\n• Get GST compliance help\n• Ask questions about GST",
        help_message: "🤖 I can help you with:\n\n📄 Invoice Processing - Upload invoice images\n📊 GST Calculations - Tax calculations and validations\n❓ GST Questions - Ask me anything about GST\n📋 Filing Status - Check your compliance status\n\nJust type your question or upload an invoice image!",
        processing: "⏳ Processing your request...",
        error: "❌ Sorry, something went wrong. Please try again.",
        skip: "⏭️ Skipped"
    },
    hi: {
        welcome: "🙏 कंप्लाईबॉट में आपका स्वागत है! मैं आपकी जीएसटी अनुपालन में मदद करूंगा।\n\nकृपया अपनी पसंदीदा भाषा चुनें:",
        onboarding_start: "आइए आपका पंजीकरण करते हैं! मुझे आपके व्यवसाय के बारे में कुछ बुनियादी जानकारी चाहिए।",
        ask_trade_name: "📝 आपका व्यापारिक/व्यवसायिक नाम क्या है?",
        ask_legal_name: "🏢 आपका कानूनी व्यवसायिक नाम क्या है? (वैकल्पिक - यदि व्यापारिक नाम के समान है तो /skip दबाएं)",
        ask_gstin: "🔢 कृपया अपना 15-अंकीय जीएसटीआईएन दर्ज करें:",
        ask_state: "📍 आपका व्यवसाय किस राज्य में पंजीकृत है?",
        invalid_gstin: "❌ अमान्य जीएसटीआईएन प्रारूप। कृपया एक वैध 15-अंकीय जीएसटीआईएन दर्ज करें (जैसे, 29AAACH7409R1Z2)",
        invalid_state: "❌ अमान्य राज्य कोड। कृपया एक वैध 2-अंकीय राज्य कोड दर्ज करें (जैसे, कर्नाटक के लिए 29)",
        registration_success: "✅ पंजीकरण सफल! कंप्लाईबॉट में आपका स्वागत है, {tradeName}!\n\n📋 आपका विवरण:\nजीएसटीआईएन: {gstin}\nव्यापारिक नाम: {tradeName}\nराज्य: {stateCode}\n\nअब आप कर सकते हैं:\n• प्रसंस्करण के लिए चालान अपलोड करें\n• जीएसटी अनुपालन सहायता प्राप्त करें\n• जीएसटी के बारे में प्रश्न पूछें",
        help_message: "🤖 मैं आपकी इनमें मदद कर सकता हूं:\n\n📄 चालान प्रसंस्करण - चालान छवियां अपलोड करें\n📊 जीएसटी गणना - कर गणना और सत्यापन\n❓ जीएसटी प्रश्न - जीएसटी के बारे में कुछ भी पूछें\n📋 फाइलिंग स्थिति - अपनी अनुपालन स्थिति जांचें\n\nबस अपना प्रश्न टाइप करें या चालान छवि अपलोड करें!",
        processing: "⏳ आपके अनुरोध को संसाधित कर रहा हूं...",
        error: "❌ क्षमा करें, कुछ गलत हुआ। कृपया पुनः प्रयास करें।",
        skip: "⏭️ छोड़ दिया गया"
    },
    te: {
        welcome: "🙏 కంప్లైబాట్‌కు స్వాగతం! నేను మీ GST అనుపాలనలో సహాయం చేస్తాను।\n\nదయచేసి మీ ఇష్టమైన భాషను ఎంచుకోండి:",
        onboarding_start: "మిమ్మల్ని నమోదు చేద్దాం! మీ వ్యాపారం గురించి కొంత ప్రాథమిక సమాచారం అవసరం.",
        ask_trade_name: "📝 మీ వ్యాపార/వాణిజ్య పేరు ఏమిటి?",
        ask_legal_name: "🏢 మీ చట్టపరమైన వ్యాపార పేరు ఏమిటి? (ఐచ్ఛికం - వాణిజ్య పేరు వలెనే ఉంటే /skip నొక్కండి)",
        ask_gstin: "🔢 దయచేసి మీ 15-అంకెల GSTIN ను నమోదు చేయండి:",
        ask_state: "📍 మీ వ్యాపారం ఏ రాష్ట్రంలో నమోదు చేయబడింది?",
        invalid_gstin: "❌ చెల్లని GSTIN ఫార్మాట్. దయచేసి చెల్లుబాటు అయ్యే 15-అంకెల GSTIN ను నమోదు చేయండి (ఉదా., 29AAACH7409R1Z2)",
        invalid_state: "❌ చెల్లని రాష్ట్ర కోడ్. దయచేసి చెల్లుబాటు అయ్యే 2-అంకెల రాష్ట్ర కోడ్ ను నమోదు చేయండి (ఉదా., కర్ణాటక కోసం 29)",
        registration_success: "✅ నమోదు విజయవంతం! కంప్లైబాట్‌కు స్వాగతం, {tradeName}!\n\n📋 మీ వివరాలు:\nGSTIN: {gstin}\nవాణిజ్య పేరు: {tradeName}\nరాష్ట్రం: {stateCode}\n\nఇప్పుడు మీరు చేయగలరు:\n• ప్రాసెసింగ్ కోసం ఇన్‌వాయిస్‌లను అప్‌లోడ్ చేయండి\n• GST అనుపాలన సహాయం పొందండి\n• GST గురించి ప్రశ్నలు అడగండి",
        help_message: "🤖 నేను మీకు ఇవిటిలో సహాయం చేయగలను:\n\n📄 ఇన్‌వాయిస్ ప్రాసెసింగ్ - ఇన్‌వాయిస్ చిత్రాలను అప్‌లోడ్ చేయండి\n📊 GST లెక్కలు - పన్ను లెక్కలు మరియు ధృవీకరణలు\n❓ GST ప్రశ్నలు - GST గురించి ఏదైనా అడగండి\n📋 ఫైలింగ్ స్థితి - మీ అనుపాలన స్థితిని తనిఖీ చేయండి\n\nమీ ప్రశ్నను టైప్ చేయండి లేదా ఇన్‌వాయిస్ చిత్రాన్ని అప్‌లోడ్ చేయండి!",
        processing: "⏳ మీ అభ్యర్థనను ప్రాసెస్ చేస్తున్నాను...",
        error: "❌ క్షమించండి, ఏదో తప్పు జరిగింది. దయచేసి మళ్లీ ప్రయత్నించండి.",
        skip: "⏭️ దాటవేయబడింది"
    }
};

// State codes mapping for user-friendly display
const stateNames = {
    '01': 'Jammu and Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh',
    '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan',
    '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh',
    '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram', '16': 'Tripura',
    '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal', '20': 'Jharkhand',
    '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
    '25': 'Daman and Diu', '26': 'Dadra and Nagar Haveli', '27': 'Maharashtra',
    '28': 'Andhra Pradesh', '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep',
    '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry', '35': 'Andaman and Nicobar Islands',
    '36': 'Telangana', '37': 'Andhra Pradesh (New)', '38': 'Ladakh'
};

// Create onboarding scene
const onboardingScene = new Scenes.WizardScene(
    'onboarding',
    // Step 1: Language selection
    async (ctx) => {
        const keyboard = {
            inline_keyboard: [
                [
                    { text: '🇮🇳 English', callback_data: 'lang_en' },
                    { text: '🇮🇳 हिंदी', callback_data: 'lang_hi' }
                ],
                [
                    { text: '🇮🇳 తెలుగు', callback_data: 'lang_te' }
                ]
            ]
        };

        await ctx.reply(languages.en.welcome, { reply_markup: keyboard });
        return ctx.wizard.next();
    },

    // Step 2: Handle language selection and ask for trade name
    async (ctx) => {
        if (ctx.callbackQuery) {
            const lang = ctx.callbackQuery.data.split('_')[1];
            ctx.session.language = lang;
            await ctx.answerCbQuery();
            await ctx.editMessageText(languages[lang].onboarding_start);
            await ctx.reply(languages[lang].ask_trade_name);
        } else {
            // Default to English if no callback
            ctx.session.language = 'en';
            await ctx.reply(languages.en.ask_trade_name);
        }
        return ctx.wizard.next();
    },

    // Step 3: Get trade name and ask for legal name
    async (ctx) => {
        const lang = ctx.session.language || 'en';
        if (!ctx.message?.text) {
            await ctx.reply(languages[lang].ask_trade_name);
            return;
        }

        ctx.session.tradeName = ctx.message.text.trim();
        await ctx.reply(languages[lang].ask_legal_name);
        return ctx.wizard.next();
    },

    // Step 4: Get legal name and ask for GSTIN
    async (ctx) => {
        const lang = ctx.session.language || 'en';

        if (ctx.message?.text === '/skip') {
            ctx.session.legalName = ctx.session.tradeName;
            await ctx.reply(languages[lang].skip);
        } else if (ctx.message?.text) {
            ctx.session.legalName = ctx.message.text.trim();
        } else {
            await ctx.reply(languages[lang].ask_legal_name);
            return;
        }

        await ctx.reply(languages[lang].ask_gstin);
        return ctx.wizard.next();
    },

    // Step 5: Get GSTIN and ask for state
    async (ctx) => {
        const lang = ctx.session.language || 'en';
        if (!ctx.message?.text) {
            await ctx.reply(languages[lang].ask_gstin);
            return;
        }

        const gstin = ctx.message.text.trim().toUpperCase();

        if (!validateGSTIN(gstin)) {
            await ctx.reply(languages[lang].invalid_gstin);
            return;
        }

        ctx.session.gstin = gstin;

        // Create state selection keyboard
        const stateKeyboard = {
            inline_keyboard: [
                [
                    { text: '29 - Karnataka', callback_data: 'state_29' },
                    { text: '27 - Maharashtra', callback_data: 'state_27' }
                ],
                [
                    { text: '07 - Delhi', callback_data: 'state_07' },
                    { text: '33 - Tamil Nadu', callback_data: 'state_33' }
                ],
                [
                    { text: '36 - Telangana', callback_data: 'state_36' },
                    { text: '24 - Gujarat', callback_data: 'state_24' }
                ],
                [
                    { text: '📝 Enter manually', callback_data: 'state_manual' }
                ]
            ]
        };

        await ctx.reply(languages[lang].ask_state, { reply_markup: stateKeyboard });
        return ctx.wizard.next();
    },

    // Step 6: Get state and complete registration
    async (ctx) => {
        const lang = ctx.session.language || 'en';
        let stateCode;

        if (ctx.callbackQuery) {
            if (ctx.callbackQuery.data === 'state_manual') {
                await ctx.answerCbQuery();
                await ctx.editMessageText('📝 Please enter your 2-digit state code (e.g., 29 for Karnataka):');
                return; // Wait for manual input
            } else {
                stateCode = ctx.callbackQuery.data.split('_')[1];
                await ctx.answerCbQuery();
            }
        } else if (ctx.message?.text) {
            stateCode = ctx.message.text.trim();
        } else {
            await ctx.reply(languages[lang].ask_state);
            return;
        }

        // Validate state code
        if (!stateCode || stateCode.length !== 2 || !/^\d{2}$/.test(stateCode)) {
            await ctx.reply(languages[lang].invalid_state);
            return;
        }

        try {
            // Save user to database
            const userData = {
                telegram_chat_id: ctx.chat.id,
                gstin: ctx.session.gstin,
                trade_name: ctx.session.tradeName,
                legal_name: ctx.session.legalName,
                state_code: stateCode
            };

            await addUser(userData);

            const successMessage = languages[lang].registration_success
                .replace('{tradeName}', ctx.session.tradeName)
                .replace('{gstin}', ctx.session.gstin)
                .replace('{stateCode}', `${stateCode} - ${stateNames[stateCode] || 'Unknown'}`);

            await ctx.reply(successMessage);

            // Clear session data
            ctx.session = {};

            return ctx.scene.leave();
        } catch (error) {
            console.error('Registration error:', error);
            await ctx.reply(languages[lang].error);
        }
    }
);

// Create the bot
const bot = new Telegraf(config.telegram.botToken);

// Create stage and register scenes
const stage = new Scenes.Stage([onboardingScene]);

// Middleware
bot.use(session());
bot.use(stage.middleware());

// Helper function to get user language
const getUserLanguage = async (chatId) => {
    try {
        const user = await getUser(chatId);
        return user?.language || 'en';
    } catch (error) {
        return 'en';
    }
};

// Helper function to detect language from text
const detectLanguage = (text) => {
    // Simple language detection based on script
    if (/[\u0900-\u097F]/.test(text)) return 'hi'; // Devanagari script
    if (/[\u0C00-\u0C7F]/.test(text)) return 'te'; // Telugu script
    return 'en'; // Default to English
};

// Helper function to get AI response in user's language
const getAIResponse = async (question, userLanguage = 'en') => {
    try {
        const languagePrompt = {
            en: "You are a helpful GST (Goods and Services Tax) compliance assistant for Indian businesses. Answer the following question in English:",
            hi: "आप भारतीय व्यवसायों के लिए एक सहायक जीएसटी (वस्तु एवं सेवा कर) अनुपालन सहायक हैं। निम्नलिखित प्रश्न का उत्तर हिंदी में दें:",
            te: "మీరు భారతీయ వ్యాపారాల కోసం సహాయక GST (వస్తువులు మరియు సేవల పన్ను) అనుపాలన సహాయకుడు. కింది ప్రశ్నకు తెలుగులో సమాధానం ఇవ్వండి:"
        };

        const prompt = `${languagePrompt[userLanguage]} ${question}
        
        Please provide accurate, helpful information about GST compliance, tax calculations, filing procedures, or related business matters. Keep the response concise and practical.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error('AI response error:', error);
        const errorMessages = {
            en: "I'm sorry, I couldn't process your question right now. Please try again later.",
            hi: "क्षमा करें, मैं अभी आपके प्रश्न को संसाधित नहीं कर सका। कृपया बाद में पुनः प्रयास करें।",
            te: "క్షమించండి, నేను ప్రస్తుతం మీ ప్రశ్నను ప్రాసెస్ చేయలేకపోయాను. దయచేసి తర్వాత మళ్లీ ప్రయత్నించండి."
        };
        return errorMessages[userLanguage] || errorMessages.en;
    }
};

// Start command
bot.start(async (ctx) => {
    try {
        const existingUser = await getUser(ctx.chat.id);

        if (existingUser) {
            const lang = existingUser.language || 'en';
            await ctx.reply(`👋 Welcome back, ${existingUser.trade_name}!\n\n${languages[lang].help_message}`);
        } else {
            await ctx.scene.enter('onboarding');
        }
    } catch (error) {
        console.error('Start command error:', error);
        await ctx.reply(languages.en.error);
    }
});

// Help command
bot.help(async (ctx) => {
    try {
        const lang = await getUserLanguage(ctx.chat.id);
        await ctx.reply(languages[lang].help_message);
    } catch (error) {
        console.error('Help command error:', error);
        await ctx.reply(languages.en.help_message);
    }
});

// Status command
bot.command('status', async (ctx) => {
    try {
        const user = await getUser(ctx.chat.id);
        if (user) {
            const statusMessage = `📊 *Your Status*\n\n🏢 Business: ${user.trade_name}\n🔢 GSTIN: ${user.gstin}\n📍 State: ${user.state_code} - ${stateNames[user.state_code] || 'Unknown'}\n📅 Registered: ${user.registration_date || 'N/A'}\n\n✅ You can now use all CompliBot features!`;
            await ctx.reply(statusMessage, { parse_mode: 'Markdown' });
        } else {
            await ctx.reply('❌ You are not registered yet. Please use /start to begin registration.');
        }
    } catch (error) {
        console.error('Status command error:', error);
        await ctx.reply('⚠️ Error retrieving your status. Please try again.');
    }
});

// Handle text messages (questions)
bot.on('text', async (ctx) => {
    try {
        const user = await getUser(ctx.chat.id);
        if (!user) {
            await ctx.reply('Please register first using /start');
            return;
        }

        const userLanguage = user.language || detectLanguage(ctx.message.text) || 'en';
        const processingMessage = languages[userLanguage].processing;

        const processingMsg = await ctx.reply(processingMessage);

        const aiResponse = await getAIResponse(ctx.message.text, userLanguage);

        // Delete processing message and send response
        await ctx.deleteMessage(processingMsg.message_id);
        await ctx.reply(aiResponse);

    } catch (error) {
        console.error('Text message error:', error);
        const lang = await getUserLanguage(ctx.chat.id);
        await ctx.reply(languages[lang].error);
    }
});

// Handle photo/document uploads (invoices)
bot.on(['photo', 'document'], async (ctx) => {
    try {
        const user = await getUser(ctx.chat.id);
        if (!user) {
            await ctx.reply('Please register first using /start');
            return;
        }

        const userLanguage = user.language || 'en';

        await ctx.reply(`📄 Invoice received! Processing with AI...\n\n💡 For now, please use our web API at ${config.server.apiBaseUrl}/generate-gst-json to process invoice images.\n\nFull integration coming soon!`);

    } catch (error) {
        console.error('File upload error:', error);
        const lang = await getUserLanguage(ctx.chat.id);
        await ctx.reply(languages[lang].error);
    }
});

// Error handling
bot.catch((err, ctx) => {
    console.error('Bot error:', err);
    ctx.reply('❌ Something went wrong. Please try again.').catch(() => { });
});

module.exports = bot;
const { Telegraf, session, Scenes } = require('telegraf');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getUser, addUser } = require('./db/index');
const { validateGSTIN, getStateCode } = require('./modules/gstHelper');
const onboardingScene = require('./scenes/onboarding');

// Load environment variables
require('dotenv').config();

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "AIzaSyAa53MAoT_Zn_lJcqwUrH_qz36abpjUYOg");
const model = genAI.getGenerativeModel({ model: process.env.GOOGLE_AI_MODEL || "gemini-2.5-flash-lite" });

// Language support
const languages = {
    en: {
        welcome: "🙏 Welcome to CompliBot! I'll help you with GST compliance.",
        help_message: "🤖 I can help you with:\n\n📄 **Invoice Processing** - Upload invoice images\n📊 **GST Calculations** - Tax calculations and validations\n📱 **NIL Return Filing** - Easy SMS filing for NIL returns\n❓ **GST Questions** - Ask me anything about GST\n📋 **Filing Status** - Check your compliance status\n\n💡 **Quick Actions:**\n• Upload invoice → Get JSON automatically\n• Type 'nil' or /nil → File NIL return via SMS\n• Type 'json' → Download GST return JSON\n• Use /commands for all available commands",
        processing: "⏳ Processing your request...",
        error: "❌ Sorry, something went wrong. Please try again.",
        not_registered: "Please register first using /start"
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

// Create the bot
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Create stage and register scenes
const stage = new Scenes.Stage([onboardingScene]);

// Session middleware
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

// Fallback responses when AI is unavailable
const getFallbackResponse = (question) => {
    const q = question.toLowerCase();

    if (q.includes('rate') || q.includes('gst rate')) {
        return "📊 **Common GST Rates in India:**\n\n" +
            "• **5%**: Essential items (rice, wheat, medicines)\n" +
            "• **12%**: Processed foods, computers\n" +
            "• **18%**: Most goods and services\n" +
            "• **28%**: Luxury items (cars, tobacco)\n" +
            "• **0%**: Exempt items (fresh fruits, vegetables)\n\n" +
            "For specific items, please check the official GST rate finder.";
    }

    if (q.includes('calculate') || q.includes('calculation')) {
        return "🧮 **GST Calculation:**\n\n" +
            "**For Intra-State (within same state):**\n" +
            "• CGST = (Amount × Rate) ÷ 2\n" +
            "• SGST = (Amount × Rate) ÷ 2\n\n" +
            "**For Inter-State (different states):**\n" +
            "• IGST = Amount × Rate\n\n" +
            "**Example:** ₹1000 at 18%\n" +
            "• Intra-state: CGST ₹90 + SGST ₹90 = ₹180\n" +
            "• Inter-state: IGST ₹180";
    }

    if (q.includes('file') || q.includes('filing') || q.includes('return') || q.includes('nil')) {
        return "📋 **GST Filing Information:**\n\n" +
            "• **GSTR-1**: Monthly/Quarterly sales return\n" +
            "• **GSTR-3B**: Monthly summary return\n" +
            "• **Due dates**: 11th, 20th of following month\n" +
            "• **NIL returns**: Can be filed via SMS\n\n" +
            "📱 **Quick NIL Return:**\n" +
            "• Type 'nil' or use /nil command\n" +
            "• Click the SMS link to file instantly\n" +
            "• Get 6-digit code and confirm\n\n" +
            "Upload invoice images for automatic JSON generation!";
    }

    if (q.includes('invoice') || q.includes('json')) {
        return "📄 **Invoice Processing:**\n\n" +
            "1. Upload your invoice image\n" +
            "2. I'll extract GST data automatically\n" +
            "3. Type 'json' to get GST return format\n" +
            "4. Download the JSON for filing\n\n" +
            "Supported formats: JPG, PNG, PDF";
    }

    // Default response
    return "🤖 **CompliBot Help:**\n\n" +
        "I can help you with:\n" +
        "• **Invoice Processing** - Upload images for GST data extraction\n" +
        "• **GST Calculations** - Tax calculations and rates\n" +
        "• **Filing Guidance** - Return filing procedures\n" +
        "• **JSON Generation** - GST return format creation\n\n" +
        "Try uploading an invoice image or ask specific GST questions!";
};

// Rate limiting for AI calls
let lastAICall = 0;
const AI_CALL_INTERVAL = 2000; // 2 seconds between calls

const canMakeAICall = () => {
    const now = Date.now();
    if (now - lastAICall < AI_CALL_INTERVAL) {
        return false;
    }
    lastAICall = now;
    return true;
};

// Helper function to get AI response with quota handling
const getAIResponse = async (question, userLanguage = 'en') => {
    // Check rate limiting
    if (!canMakeAICall()) {
        console.log('Rate limiting AI call');
        return getFallbackResponse(question);
    }

    try {
        const prompt = `You are a helpful GST (Goods and Services Tax) compliance assistant for Indian businesses. Answer the following question in English: ${question}
        
        Please provide accurate, helpful information about GST compliance, tax calculations, filing procedures, or related business matters. Keep the response concise and practical.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error('AI response error:', error);

        // Handle specific quota errors
        if (error.status === 429 || error.message?.includes('quota')) {
            console.log('Quota exceeded, using fallback response');
            return getFallbackResponse(question) + "\n\n⚠️ AI quota exceeded. Using fallback responses.";
        }

        // Handle other errors - use fallback
        console.log('AI error, using fallback response');
        return getFallbackResponse(question);
    }
};

// Start command
bot.start(async (ctx) => {
    try {
        const existingUser = await getUser(ctx.chat.id);

        if (existingUser) {
            await ctx.reply(`👋 Welcome back, ${existingUser.trade_name}!\n\n${languages.en.help_message}`);
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
        await ctx.reply(languages.en.help_message);
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

// NIL return command
bot.command('nil', async (ctx) => {
    try {
        const user = await getUser(ctx.chat.id);
        if (!user) {
            await ctx.reply('❌ Please register first using /start');
            return;
        }

        const { generateQuickNIL } = require('./tools/nilReturnTool');
        const result = await generateQuickNIL({ chatId: ctx.chat.id });

        if (result.success) {
            const filing = result.data.filing;
            const period = result.data.period;

            let message = `📱 *NIL Return SMS Ready!*\n\n`;
            message += `🏢 **Business:** ${result.data.taxpayer.tradeName}\n`;
            message += `🔢 **GSTIN:** \`${result.data.taxpayer.gstin}\`\n`;
            message += `📅 **Period:** ${period.display}\n`;
            message += `📋 **Return Type:** ${period.returnType}\n\n`;
            message += `📱 **Click the button below to send SMS:**\n\n`;
            message += `**Step 1:** Tap "Send SMS" → Your SMS app opens\n`;
            message += `**Step 2:** Review and send to 14409\n`;
            message += `**Step 3:** Wait for 6-digit code\n`;
            message += `**Step 4:** Use /confirm <code> command\n\n`;
            message += `⚠️ **Use your registered mobile number only**`;

            const keyboard = {
                inline_keyboard: [
                    [
                        {
                            text: '📱 Send NIL Return SMS',
                            url: filing.shortUrl || filing.deepLinks.primary
                        }
                    ],
                    [
                        { text: '📋 GSTR-1 NIL', callback_data: 'nil_gstr1' },
                        { text: '❓ Help', callback_data: 'nil_help' }
                    ]
                ]
            };

            await ctx.reply(message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        } else {
            await ctx.reply(`❌ ${result.message}`);
        }
    } catch (error) {
        console.error('NIL command error:', error);
        await ctx.reply('❌ Error generating NIL return. Please try again.');
    }
});

// Confirm command for verification codes
bot.command('confirm', async (ctx) => {
    try {
        const user = await getUser(ctx.chat.id);
        if (!user) {
            await ctx.reply('❌ Please register first using /start');
            return;
        }

        const args = ctx.message.text.split(' ');
        if (args.length < 2) {
            await ctx.reply('❌ Please provide the 6-digit verification code.\n\nUsage: /confirm 123456');
            return;
        }

        const verificationCode = args[1];
        if (!/^\d{6}$/.test(verificationCode)) {
            await ctx.reply('❌ Verification code must be exactly 6 digits.\n\nExample: /confirm 123456');
            return;
        }

        const { generateConfirmationLink } = require('./tools/nilReturnTool');
        const result = await generateConfirmationLink({
            verificationCode: verificationCode,
            returnType: 'GSTR-3B',
            chatId: ctx.chat.id
        });

        if (result.success) {
            const confirmation = result.data.confirmation;

            let message = `✅ *Confirmation SMS Ready!*\n\n`;
            message += `🔢 **Code:** ${verificationCode}\n`;
            message += `📱 **Click below to send confirmation:**\n\n`;
            message += `This will complete your NIL return filing.`;

            const keyboard = {
                inline_keyboard: [
                    [
                        {
                            text: '📱 Send Confirmation SMS',
                            url: confirmation.shortUrl || confirmation.deepLinks.primary
                        }
                    ]
                ]
            };

            await ctx.reply(message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        } else {
            await ctx.reply(`❌ ${result.message}`);
        }
    } catch (error) {
        console.error('Confirm command error:', error);
        await ctx.reply('❌ Error generating confirmation SMS. Please try again.');
    }
});

// Handle text messages (questions)
bot.on('text', async (ctx) => {
    try {
        const user = await getUser(ctx.chat.id);
        if (!user) {
            await ctx.reply(languages.en.not_registered);
            return;
        }

        const messageText = ctx.message.text.toLowerCase().trim();

        // Check for JSON-related requests
        if (messageText === 'json' || messageText === 'get json' || messageText === 'show json' || messageText === 'download json') {
            if (!ctx.session.lastInvoiceData) {
                // Offer sample JSON when no invoice data is available
                const keyboard = {
                    inline_keyboard: [
                        [
                            { text: '📄 Get Sample JSON', callback_data: 'sample_json' },
                            { text: '📤 Upload Invoice', callback_data: 'upload_help' }
                        ]
                    ]
                };

                await ctx.reply(
                    '❌ No invoice data found.\n\n' +
                    '💡 **Options:**\n' +
                    '• Upload an invoice image to get actual JSON\n' +
                    '• Get a sample GST return JSON for reference\n\n' +
                    'Choose an option below:',
                    {
                        parse_mode: 'Markdown',
                        reply_markup: keyboard
                    }
                );
                return;
            }

            try {
                const { generateGSTReturnFormat } = require('./tools/jsonGenerator');
                const gstReturnData = generateGSTReturnFormat(ctx.session.lastInvoiceData);

                // Send as file
                const jsonString = JSON.stringify(gstReturnData, null, 2);
                await ctx.replyWithDocument({
                    source: Buffer.from(jsonString, 'utf8'),
                    filename: `gst_return_${Date.now()}.json`
                }, {
                    caption: '📄 *GST Return JSON*\n\nComplete GST return format ready for filing with the GST portal.',
                    parse_mode: 'Markdown'
                });
                return;
            } catch (jsonError) {
                console.error('JSON generation error:', jsonError);
                await ctx.reply('❌ Error generating JSON. Please try processing the invoice again.');
                return;
            }
        }

        // Check for NIL return requests
        if (messageText.includes('nil') || messageText.includes('file nil') || messageText.includes('nil return')) {
            try {
                const { generateQuickNIL } = require('./tools/nilReturnTool');
                const result = await generateQuickNIL({ chatId: ctx.chat.id });

                if (result.success) {
                    const filing = result.data.filing;
                    const period = result.data.period;

                    let message = `📱 *NIL Return SMS Ready!*\n\n`;
                    message += `🏢 **Business:** ${result.data.taxpayer.tradeName}\n`;
                    message += `🔢 **GSTIN:** \`${result.data.taxpayer.gstin}\`\n`;
                    message += `📅 **Period:** ${period.display}\n`;
                    message += `📋 **Return Type:** ${period.returnType}\n\n`;
                    message += `📱 **Click the button below to send SMS:**\n`;
                    message += `The SMS will be sent to 14409 with your NIL return details.\n\n`;
                    message += `⚠️ **Important:**\n`;
                    message += `• Use your registered mobile number\n`;
                    message += `• Wait for 6-digit verification code\n`;
                    message += `• Send confirmation SMS with the code`;

                    const keyboard = {
                        inline_keyboard: [
                            [
                                {
                                    text: '📱 Send NIL Return SMS',
                                    url: filing.shortUrl || filing.deepLinks.primary
                                }
                            ],
                            [
                                { text: '❓ Help', callback_data: 'nil_help' },
                                { text: '🔄 Different Period', callback_data: 'nil_custom' }
                            ]
                        ]
                    };

                    await ctx.reply(message, {
                        parse_mode: 'Markdown',
                        reply_markup: keyboard
                    });
                } else {
                    await ctx.reply(`❌ ${result.message}`);
                }
                return;
            } catch (error) {
                console.error('NIL return error:', error);
                await ctx.reply('❌ Error generating NIL return. Please try again.');
                return;
            }
        }

        // Handle regular GST questions
        const processingMsg = await ctx.reply(languages.en.processing);

        // Try AI response with fallback
        let response;
        try {
            response = await getAIResponse(ctx.message.text);
        } catch (error) {
            console.error('AI processing failed:', error);
            response = getFallbackResponse(ctx.message.text);
        }

        // Delete processing message and send response
        await ctx.deleteMessage(processingMsg.message_id);
        await ctx.reply(response);

    } catch (error) {
        console.error('Text message error:', error);
        await ctx.reply(languages.en.error);
    }
});

// Handle photo/document uploads (invoices)
bot.on(['photo', 'document'], async (ctx) => {
    try {
        const user = await getUser(ctx.chat.id);
        if (!user) {
            await ctx.reply(languages.en.not_registered);
            return;
        }

        // Show processing message
        const processingMsg = await ctx.reply('⏳ Processing your invoice with AI...');

        try {
            // Get the largest photo or document
            let fileId;
            let mimeType = 'image/jpeg';

            if (ctx.message.photo) {
                const photos = ctx.message.photo;
                fileId = photos[photos.length - 1].file_id;
            } else if (ctx.message.document) {
                fileId = ctx.message.document.file_id;
                mimeType = ctx.message.document.mime_type || 'application/pdf';
            }

            if (!fileId) {
                await ctx.editMessageText('❌ Could not process the file. Please try again.');
                return;
            }

            // Get file from Telegram
            const file = await ctx.telegram.getFile(fileId);
            const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

            // Download file
            const fetch = require('node-fetch');
            const response = await fetch(fileUrl);
            const buffer = await response.buffer();

            // Use the JSON generator tool
            const { generateGSTReturnJSON } = require('./tools/jsonGenerator');

            // Create a mock request object for the generator
            const mockReq = {
                file: {
                    buffer: buffer,
                    mimetype: mimeType
                }
            };

            // Create a mock response object
            let result = null;
            const mockRes = {
                json: (data) => { result = data; },
                status: () => mockRes
            };

            // Call the generator
            await generateGSTReturnJSON(mockReq, mockRes);

            if (result && result.success) {
                const extractedData = result.data.extractedInvoiceData;
                const gstReturnData = result.data.gstReturnFormat;

                // Store the data in session
                ctx.session.lastInvoiceData = extractedData;

                // Format response
                const { supplier, recipient, invoice, items } = extractedData;
                let message = '';

                if (result.fallback) {
                    message = `⚠️ *AI Processing Unavailable - Sample Data Generated*\n\n`;
                    message += `🤖 AI quota exceeded. Here's a sample GST return format for reference:\n\n`;
                } else {
                    message = `✅ *Invoice processed successfully!*\n\n`;
                }

                // Supplier info
                message += `📤 *Supplier:*\n`;
                message += `• GSTIN: \`${supplier.gstin}\`\n`;
                message += `• Name: ${supplier.legalName}\n\n`;

                // Invoice info
                message += `📄 *Invoice Details:*\n`;
                message += `• Number: ${invoice.number}\n`;
                message += `• Date: ${invoice.date}\n`;
                message += `• Total Value: ₹${invoice.totalValue.toLocaleString('en-IN')}\n\n`;

                // Items summary
                message += `📦 *Items (${items.length}):*\n`;
                items.forEach((item, index) => {
                    message += `${index + 1}. ${item.description}\n`;
                    message += `   • Taxable: ₹${item.taxableValue.toLocaleString('en-IN')} @ ${item.taxRate}%\n`;
                });

                message += `\n💾 *JSON Data Generated*\n`;
                message += `Type "json" to get the complete GST return JSON format.`;

                if (result.fallback) {
                    message += `\n\n💡 *Note:* This is sample data. For actual invoice processing, please try again when AI service is available.`;
                }

                const keyboard = {
                    inline_keyboard: [
                        [
                            { text: '📄 Get JSON', callback_data: 'get_json' },
                            { text: '📊 View Summary', callback_data: 'view_summary' }
                        ]
                    ]
                };

                await ctx.editMessageText(message, {
                    parse_mode: 'Markdown',
                    reply_markup: keyboard
                });
            } else {
                await ctx.editMessageText('❌ Failed to process invoice. Please ensure the image is clear and try again.');
            }

        } catch (processingError) {
            console.error('Invoice processing error:', processingError);
            await ctx.editMessageText('❌ Failed to process invoice. Please ensure the image is clear and try again.');
        }

    } catch (error) {
        console.error('File upload error:', error);
        await ctx.reply(languages.en.error);
    }
});

// Handle callback queries (button presses)
bot.on('callback_query', async (ctx) => {
    try {
        const data = ctx.callbackQuery.data;
        await ctx.answerCbQuery();

        if (data === 'get_json') {
            if (!ctx.session.lastInvoiceData) {
                await ctx.reply('❌ No invoice data found. Please upload an invoice first.');
                return;
            }

            try {
                const { generateGSTReturnFormat } = require('./tools/jsonGenerator');
                const gstReturnData = generateGSTReturnFormat(ctx.session.lastInvoiceData);

                // Send as file
                const jsonString = JSON.stringify(gstReturnData, null, 2);
                await ctx.replyWithDocument({
                    source: Buffer.from(jsonString, 'utf8'),
                    filename: `gst_return_${Date.now()}.json`
                }, {
                    caption: '📄 *GST Return JSON*\n\nComplete GST return format ready for filing with the GST portal.',
                    parse_mode: 'Markdown'
                });
            } catch (error) {
                console.error('JSON generation error:', error);
                await ctx.reply('❌ Error generating JSON. Please try processing the invoice again.');
            }
        } else if (data === 'view_summary') {
            if (!ctx.session.lastInvoiceData) {
                await ctx.reply('❌ No invoice data found. Please upload an invoice first.');
                return;
            }

            const data = ctx.session.lastInvoiceData;
            const totalTaxable = data.items.reduce((sum, item) => sum + item.taxableValue, 0);
            const totalTax = data.items.reduce((sum, item) => sum + (item.totalTax || 0), 0);

            const summary = `📊 *Invoice Summary*\n\n` +
                `📄 Invoice: ${data.invoice.number}\n` +
                `📅 Date: ${data.invoice.date}\n` +
                `💰 Taxable Value: ₹${totalTaxable.toLocaleString('en-IN')}\n` +
                `💸 Total Tax: ₹${totalTax.toLocaleString('en-IN')}\n` +
                `💵 Invoice Value: ₹${data.invoice.totalValue.toLocaleString('en-IN')}\n\n` +
                `📦 Items: ${data.items.length}\n` +
                `🏢 Supplier: ${data.supplier.legalName}\n` +
                `🏪 Recipient: ${data.recipient.legalName}`;

            await ctx.reply(summary, { parse_mode: 'Markdown' });
        } else if (data === 'sample_json') {
            try {
                const { generateFallbackJSON } = require('./tools/jsonGenerator');
                const fallbackData = generateFallbackJSON();

                // Send as file
                const jsonString = JSON.stringify(fallbackData.gstReturnFormat, null, 2);
                await ctx.replyWithDocument({
                    source: Buffer.from(jsonString, 'utf8'),
                    filename: `sample_gst_return_${Date.now()}.json`
                }, {
                    caption: '📄 *Sample GST Return JSON*\n\n' +
                        'This is a sample GST return format for reference.\n' +
                        'Upload your invoice image to get actual data extracted.',
                    parse_mode: 'Markdown'
                });
            } catch (error) {
                console.error('Sample JSON error:', error);
                await ctx.reply('❌ Error generating sample JSON. Please try again.');
            }
        } else if (data === 'upload_help') {
            await ctx.reply(
                '📤 *How to Upload Invoice:*\n\n' +
                '1. Take a clear photo of your invoice\n' +
                '2. Or scan the invoice as PDF\n' +
                '3. Send the image/document to this chat\n' +
                '4. I\'ll process it with AI and extract GST data\n' +
                '5. Get your GST return JSON instantly!\n\n' +
                '📋 **Supported formats:** JPG, PNG, PDF\n' +
                '💡 **Tip:** Ensure text is clear and readable',
                { parse_mode: 'Markdown' }
            );
        } else if (data === 'nil_help') {
            const { getNILReturnHelp } = require('./tools/nilReturnTool');
            const result = await getNILReturnHelp({ chatId: ctx.chat.id });

            if (result.success) {
                let message = `📱 *NIL Return Help*\n\n`;
                message += result.data.instructions.join('\n') + '\n\n';
                message += `**Common Issues:**\n`;
                result.data.commonIssues.forEach(issue => {
                    message += `❓ ${issue.issue}\n💡 ${issue.solution}\n\n`;
                });

                await ctx.reply(message, { parse_mode: 'Markdown' });
            }
        } else if (data === 'nil_gstr1') {
            const { generateQuickNIL } = require('./tools/nilReturnTool');
            const result = await generateQuickNIL({
                chatId: ctx.chat.id,
                returnType: 'GSTR-1'
            });

            if (result.success) {
                const filing = result.data.filing;
                const period = result.data.period;

                let message = `📱 *GSTR-1 NIL Return SMS Ready!*\n\n`;
                message += `🏢 **Business:** ${result.data.taxpayer.tradeName}\n`;
                message += `🔢 **GSTIN:** \`${result.data.taxpayer.gstin}\`\n`;
                message += `📅 **Period:** ${period.display}\n`;
                message += `📋 **Return Type:** GSTR-1\n\n`;
                message += `📱 **Click below to send SMS:**`;

                const keyboard = {
                    inline_keyboard: [
                        [
                            {
                                text: '📱 Send GSTR-1 NIL SMS',
                                url: filing.shortUrl || filing.deepLinks.primary
                            }
                        ]
                    ]
                };

                await ctx.reply(message, {
                    parse_mode: 'Markdown',
                    reply_markup: keyboard
                });
            } else {
                await ctx.reply(`❌ ${result.message}`);
            }
        } else if (data === 'nil_custom') {
            await ctx.reply(
                '📅 *Custom Period NIL Return*\n\n' +
                'To file NIL return for a specific period, use:\n\n' +
                '`/nil MMYYYY`\n\n' +
                'Examples:\n' +
                '• `/nil 112024` - November 2024\n' +
                '• `/nil 102024` - October 2024\n' +
                '• `/nil 092024` - September 2024\n\n' +
                'Or just type: "File NIL return for November 2024"',
                { parse_mode: 'Markdown' }
            );
        }

    } catch (error) {
        console.error('Callback query error:', error);
        await ctx.reply('❌ Error processing request. Please try again.');
    }
});

// Error handling
bot.catch((err, ctx) => {
    console.error('Bot error:', err);
    ctx.reply('❌ Something went wrong. Please try again.').catch(() => { });
});

module.exports = bot;
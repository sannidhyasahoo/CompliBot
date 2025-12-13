/**
 * SMS Filing AI Agent
 * Specialized agent for GST SMS filing operations
 */

const { generateText, generateObject } = require('ai');
const { google } = require('@ai-sdk/google');
const { z } = require('zod');
const config = require('../../config/env');
const smsHelper = require('../../modules/smsHelperAPI');

// Initialize AI model
const model = google('gemini-2.5-flash-lite', {
    apiKey: config.googleAI.apiKey
});

// Set environment variable for Vercel AI SDK compatibility
if (config.googleAI.apiKey && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = config.googleAI.apiKey;
}

// SMS filing parameters schema
const SMSFilingSchema = z.object({
    gstin: z.string(),
    period: z.string(),
    returnType: z.enum(['GSTR-1', 'GSTR-3B']),
    isQuarterly: z.boolean().default(false),
    action: z.enum(['file_nil', 'confirm_code', 'get_help', 'check_eligibility'])
});

class SMSAgent {
    constructor() {
        this.name = 'SMS Filing Agent';
        this.capabilities = [
            'nil_return_filing',
            'sms_generation',
            'eligibility_check',
            'confirmation_handling'
        ];
    }

    /**
     * Process SMS filing request
     * @param {string} userInput - User's message
     * @param {object} context - Request context
     * @returns {Promise<object>} - Processing result
     */
    async process(userInput, context = {}) {
        try {
            // Extract SMS filing parameters from user input
            const filingParams = await this.extractFilingParameters(userInput, context);

            console.log('[SMS Agent] Filing params:', filingParams);

            // Route to appropriate handler based on action
            switch (filingParams.action) {
                case 'file_nil':
                    return await this.handleNilFiling(filingParams, context);
                case 'confirm_code':
                    return await this.handleConfirmation(userInput, context);
                case 'check_eligibility':
                    return await this.handleEligibilityCheck(filingParams, context);
                case 'get_help':
                default:
                    return await this.handleSMSHelp(userInput, context);
            }

        } catch (error) {
            console.error('[SMS Agent] Processing error:', error);
            return {
                message: "❌ I encountered an error with SMS filing. Please check your GSTIN and try again.",
                error: error.message
            };
        }
    }

    /**
     * Extract filing parameters from user input
     * @param {string} userInput - User's message
     * @param {object} context - Request context
     * @returns {Promise<object>} - Extracted parameters
     */
    async extractFilingParameters(userInput, context = {}) {
        const prompt = `
        Extract GST SMS filing parameters from the user's message.
        
        User Message: "${userInput}"
        User GSTIN: ${context.gstin || 'Not provided'}
        
        Look for:
        1. GSTIN (15-digit format like 29ABCDE1234F1Z5)
        2. Period/Month (like "March 2024", "03/2024", "032024")
        3. Return Type (GSTR-1 or GSTR-3B, default to GSTR-3B)
        4. Quarterly filing indicator (for GSTR-1)
        5. Action intent:
           - file_nil: User wants to file NIL return
           - confirm_code: User has verification code to confirm
           - check_eligibility: User wants to check if eligible
           - get_help: General SMS filing help
        
        Common patterns:
        - "File NIL return for March" → file_nil
        - "I got code 123456" → confirm_code  
        - "Can I file via SMS?" → check_eligibility
        - "SMS filing help" → get_help
        
        Use context GSTIN if not provided in message.
        Default period to current month if not specified.
        `;

        try {
            const result = await generateObject({
                model,
                schema: SMSFilingSchema,
                prompt
            });

            // Use context GSTIN if not extracted
            if (!result.object.gstin && context.gstin) {
                result.object.gstin = context.gstin;
            }

            // Default period to current month if not provided
            if (!result.object.period) {
                const now = new Date();
                result.object.period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            }

            return result.object;
        } catch (error) {
            console.error('Parameter extraction error:', error);
            // Return default parameters
            return {
                gstin: context.gstin || '',
                period: new Date().toISOString().slice(0, 7), // YYYY-MM format
                returnType: 'GSTR-3B',
                isQuarterly: false,
                action: 'get_help'
            };
        }
    }

    /**
     * Handle NIL return filing
     * @param {object} params - Filing parameters
     * @param {object} context - Request context
     * @returns {Promise<object>} - Filing result
     */
    async handleNilFiling(params, context = {}) {
        try {
            const { gstin, period, returnType, isQuarterly } = params;

            // Validate GSTIN
            if (!smsHelper.validateGSTIN(gstin)) {
                return {
                    message: "❌ Invalid GSTIN format. Please provide a valid 15-digit GSTIN (e.g., 29ABCDE1234F1Z5)",
                    actions: [{
                        type: 'request_gstin',
                        payload: { currentGstin: gstin }
                    }]
                };
            }

            // Create complete SMS filing
            const filing = await smsHelper.createCompleteSMSFiling(gstin, period, returnType, isQuarterly);

            // Generate user-friendly message
            const message = await this.generateFilingMessage(filing, context);

            return {
                message: message,
                data: filing,
                actions: [{
                    type: 'sms_filing',
                    payload: {
                        shortUrl: filing.shortUrl,
                        smsBody: filing.step1.smsBody,
                        deepLinks: filing.step1.deepLinks,
                        returnType: returnType,
                        period: period
                    }
                }]
            };

        } catch (error) {
            console.error('[SMS Agent] NIL filing error:', error);
            return {
                message: "❌ Failed to prepare SMS filing. Please check your GSTIN and period format.",
                error: error.message
            };
        }
    }

    /**
     * Handle verification code confirmation
     * @param {string} userInput - User's message with code
     * @param {object} context - Request context
     * @returns {Promise<object>} - Confirmation result
     */
    async handleConfirmation(userInput, context = {}) {
        try {
            // Extract verification code from user input
            const codeMatch = userInput.match(/\b\d{6}\b/);

            if (!codeMatch) {
                return {
                    message: "❌ I couldn't find a 6-digit verification code in your message. Please provide the code you received from 14409.",
                    actions: [{
                        type: 'request_code',
                        payload: { format: 'Please send: 123456 (your 6-digit code)' }
                    }]
                };
            }

            const verificationCode = codeMatch[0];
            const returnType = context.lastReturnType || 'GSTR-3B';

            // Generate confirmation SMS
            const confirmation = await smsHelper.createConfirmationSMS(verificationCode, returnType);

            const message = `✅ **Step 2: Confirmation SMS Ready**

📱 **Send this SMS to 14409:**
\`${confirmation.smsBody}\`

📋 **Instructions:**
1. Tap the button below to open SMS app
2. Review the pre-filled message
3. Send the SMS
4. Wait for final confirmation from GST

⏰ **Important:** Code expires in 30 minutes!`;

            return {
                message: message,
                data: confirmation,
                actions: [{
                    type: 'confirmation_sms',
                    payload: {
                        shortUrl: confirmation.shortUrl,
                        smsBody: confirmation.smsBody,
                        deepLinks: confirmation.deepLinks,
                        verificationCode: verificationCode
                    }
                }]
            };

        } catch (error) {
            console.error('[SMS Agent] Confirmation error:', error);
            return {
                message: "❌ Failed to process verification code. Please ensure it's a valid 6-digit code.",
                error: error.message
            };
        }
    }

    /**
     * Handle eligibility check
     * @param {object} params - Filing parameters
     * @param {object} context - Request context
     * @returns {Promise<object>} - Eligibility result
     */
    async handleEligibilityCheck(params, context = {}) {
        try {
            const { returnType } = params;
            const eligibility = smsHelper.getEligibilityRequirements(returnType);

            const message = `📋 **SMS Filing Eligibility for ${returnType}**

✅ **Requirements:**
${eligibility.required.map(req => `• ${req}`).join('\n')}

⚠️ **Important Checks:**
${eligibility.validationChecks.map(check => `${check}`).join('\n')}

📱 **Filing Process:**
${eligibility.process.map((step, i) => `${i + 1}. ${step}`).join('\n')}

💡 **Ready to file?** Just say "File NIL return for [month]" and I'll help you!`;

            return {
                message: message,
                data: eligibility,
                actions: [{
                    type: 'eligibility_info',
                    payload: {
                        returnType: returnType,
                        eligible: true, // We can't check actual eligibility without API access
                        requirements: eligibility.required
                    }
                }]
            };

        } catch (error) {
            console.error('[SMS Agent] Eligibility check error:', error);
            return {
                message: "❌ Failed to check eligibility. Please try again.",
                error: error.message
            };
        }
    }

    /**
     * Handle SMS filing help
     * @param {string} userInput - User's message
     * @param {object} context - Request context
     * @returns {Promise<object>} - Help response
     */
    async handleSMSHelp(userInput, context = {}) {
        const prompt = `
        The user needs help with GST SMS filing. Their message: "${userInput}"
        User GSTIN: ${context.gstin || 'Not provided'}
        
        Provide helpful guidance on:
        1. What SMS filing is and when to use it
        2. Supported return types (GSTR-1, GSTR-3B)
        3. Step-by-step process
        4. Requirements and eligibility
        5. Common issues and solutions
        
        Keep it concise, friendly, and actionable. Use emojis appropriately.
        Include specific examples they can try.
        `;

        try {
            const result = await generateText({
                model,
                prompt
            });

            return {
                message: result.text,
                actions: [{
                    type: 'sms_help_menu',
                    payload: {
                        options: [
                            '📱 File GSTR-3B NIL return',
                            '📄 File GSTR-1 NIL return',
                            '✅ Check eligibility',
                            '❓ SMS filing FAQ'
                        ]
                    }
                }]
            };
        } catch (error) {
            console.error('[SMS Agent] Help generation error:', error);
            return {
                message: `📱 **GST SMS Filing Help**

I can help you file NIL returns via SMS for:
• **GSTR-3B** - Monthly NIL returns
• **GSTR-1** - Monthly/Quarterly NIL returns

🚀 **Quick Start:**
1. Say "File NIL return for March 2024"
2. I'll generate the SMS for you
3. Send it to 14409
4. Confirm with verification code

💡 **Examples:**
• "File GSTR-3B for March"
• "File quarterly GSTR-1 for Q1"
• "Check SMS eligibility"

Just tell me what you need!`
            };
        }
    }

    /**
     * Generate user-friendly filing message
     * @param {object} filing - SMS filing data
     * @param {object} context - Request context
     * @returns {Promise<string>} - Formatted message
     */
    async generateFilingMessage(filing, context = {}) {
        const { returnType, period, gstin } = filing;

        // Handle period formatting safely
        let periodFormatted = 'Current Period';
        if (period && typeof period === 'string' && period.length >= 6) {
            periodFormatted = `${period.slice(0, 2)}/${period.slice(2)}`;
        } else if (period) {
            periodFormatted = period.toString();
        }

        return `📱 **${returnType} NIL Return SMS Ready**

🏢 **GSTIN:** ${gstin}
📅 **Period:** ${periodFormatted}
📋 **Type:** ${returnType} NIL Return

**Step 1: Send Initial SMS**
📱 Tap the button below to send SMS to 14409

**Step 2: Confirmation** 
⏳ Wait for 6-digit code, then send confirmation

**SMS Content:**
\`${filing.step1?.smsBody || 'SMS content not available'}\`

✅ **Ready to file?** Tap "Send SMS" below!

⚠️ **Important:** Use your registered mobile number only.`;
    }
}

module.exports = SMSAgent;
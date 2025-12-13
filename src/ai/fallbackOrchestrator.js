/**
 * Fallback AI Orchestrator
 * Uses pattern matching for intent classification when AI models are not available
 */

const smsHelper = require('../modules/smsHelperAPI');
const { calculateGST } = require('../modules/gstHelper');

class FallbackOrchestrator {
    constructor() {
        this.name = 'Fallback Orchestrator';
        this.patterns = {
            sms_filing: [
                /file\s+(nil|gstr|return)/i,
                /sms\s+filing/i,
                /nil\s+return/i,
                /gstr[-\s]?[13]b?/i
            ],
            json_generation: [
                /generate\s+json/i,
                /json\s+generator?/i,
                /invoice\s+processing/i,
                /extract\s+data/i,
                /generate.*invoice/i,
                /json.*invoice/i
            ],
            calculations: [
                /calculate\s+gst/i,
                /gst\s+calculation/i,
                /tax\s+calculation/i,
                /\d+\s*%?\s+gst/i,
                /gst\s+on\s+\d+/i
            ],
            gst_query: [
                /gst\s+rate/i,
                /tax\s+rate/i,
                /what\s+is.*gst/i,
                /hsn\s+code/i,
                /compliance/i
            ]
        };
    }

    /**
     * Classify intent using pattern matching
     * @param {string} userInput - User's message
     * @param {object} context - Request context
     * @returns {object} - Intent classification
     */
    classifyIntent(userInput, context = {}) {
        const input = userInput.toLowerCase();

        for (const [intent, patterns] of Object.entries(this.patterns)) {
            for (const pattern of patterns) {
                if (pattern.test(input)) {
                    return {
                        intent,
                        confidence: 0.8,
                        entities: this.extractEntities(userInput, intent),
                        reasoning: `Matched pattern: ${pattern.source}`
                    };
                }
            }
        }

        return {
            intent: 'general_help',
            confidence: 0.5,
            entities: {},
            reasoning: 'No specific pattern matched'
        };
    }

    /**
     * Extract entities from user input
     * @param {string} userInput - User's message
     * @param {string} intent - Classified intent
     * @returns {object} - Extracted entities
     */
    extractEntities(userInput, intent) {
        const entities = {};

        // Extract GSTIN
        const gstinMatch = userInput.match(/\b\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z]\d\b/);
        if (gstinMatch) {
            entities.gstin = gstinMatch[0];
        }

        // Extract month/period
        const monthMatch = userInput.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2}\/\d{4}|\d{4}-\d{2})\b/i);
        if (monthMatch) {
            entities.month = monthMatch[0];
        }

        // Extract return type
        if (userInput.match(/gstr[-\s]?1/i)) {
            entities.returnType = 'GSTR-1';
        } else if (userInput.match(/gstr[-\s]?3b?/i)) {
            entities.returnType = 'GSTR-3B';
        }

        // Extract quarterly indicator
        if (userInput.match(/quarterly|quarter|q[1-4]/i)) {
            entities.isQuarterly = true;
        }

        // Extract amounts and rates for calculations
        if (intent === 'calculations') {
            // Look for amounts with or without currency symbols
            const amountMatch = userInput.match(/(?:₹|rs\.?|rupees?)\s*(\d+(?:,\d+)*(?:\.\d+)?)|(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:₹|rs\.?|rupees?)|(?:on|of)\s+(\d+(?:,\d+)*(?:\.\d+)?)/i);
            if (amountMatch) {
                entities.amount = parseFloat((amountMatch[1] || amountMatch[2] || amountMatch[3]).replace(/,/g, ''));
            }

            // Look for percentage rates
            const rateMatch = userInput.match(/(\d+(?:\.\d+)?)\s*%|at\s+(\d+(?:\.\d+)?)/i);
            if (rateMatch) {
                entities.taxRate = parseFloat(rateMatch[1] || rateMatch[2]);
            }
        }

        return entities;
    }

    /**
     * Process user request
     * @param {string} userInput - User's message
     * @param {object} context - Request context
     * @returns {Promise<object>} - Processing result
     */
    async processRequest(userInput, context = {}) {
        try {
            const intentResult = this.classifyIntent(userInput, context);

            console.log(`[Fallback Orchestrator] Intent: ${intentResult.intent} (confidence: ${intentResult.confidence})`);

            switch (intentResult.intent) {
                case 'sms_filing':
                    return await this.handleSMSFiling(userInput, intentResult, context);
                case 'json_generation':
                    return await this.handleJSONGeneration(userInput, intentResult, context);
                case 'calculations':
                    return await this.handleCalculations(userInput, intentResult, context);
                case 'gst_query':
                    return await this.handleGSTQuery(userInput, intentResult, context);
                default:
                    return await this.handleGeneralHelp(userInput, context);
            }
        } catch (error) {
            console.error('Fallback orchestrator error:', error);
            return {
                success: false,
                message: "Sorry, I encountered an error processing your request. Please try again.",
                error: error.message
            };
        }
    }

    /**
     * Handle SMS filing requests
     */
    async handleSMSFiling(userInput, intentResult, context) {
        try {
            const entities = intentResult.entities;
            const gstin = entities.gstin || context.gstin;
            const returnType = entities.returnType || 'GSTR-3B';
            const isQuarterly = entities.isQuarterly || false;

            if (!gstin) {
                return {
                    success: false,
                    message: "I need your GSTIN to help with SMS filing. Please provide your 15-digit GSTIN or register first using /start.",
                    actions: [{
                        type: 'request_gstin',
                        payload: { format: 'Please provide your 15-digit GSTIN (e.g., 29ABCDE1234F1Z5)' }
                    }]
                };
            }

            // Validate GSTIN format
            if (!smsHelper.validateGSTIN(gstin)) {
                return {
                    success: false,
                    message: `❌ Invalid GSTIN format: ${gstin}. Please provide a valid 15-digit GSTIN (e.g., 29ABCDE1234F1Z5)`,
                    actions: [{
                        type: 'request_gstin',
                        payload: { currentGstin: gstin }
                    }]
                };
            }

            // Default to current month if no period specified
            let period = entities.month;
            if (!period) {
                const now = new Date();
                period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            }

            const filing = await smsHelper.createCompleteSMSFiling(gstin, period, returnType, isQuarterly);

            const message = `📱 **${returnType} NIL Return SMS Ready**

🏢 **GSTIN:** ${gstin}
📅 **Period:** ${period}

**Step 1: Send Initial SMS**
\`${filing.step1.smsBody}\`

**Step 2: Confirmation**
After receiving verification code, send:
\`CNF ${returnType === 'GSTR-1' ? 'R1' : '3B'} <6-digit-code>\`

✅ Ready to file via SMS!`;

            return {
                success: true,
                message: message,
                intent: intentResult.intent,
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
            return {
                success: false,
                message: "❌ Failed to prepare SMS filing. Please check your GSTIN format.",
                error: error.message
            };
        }
    }

    /**
     * Handle JSON generation requests
     */
    async handleJSONGeneration(userInput, intentResult, context) {
        return {
            success: true,
            message: `📄 **GST JSON Generator**

I can help you generate GST JSON from:

• **Invoice Images** - Upload a photo of your invoice
• **Manual Data** - Provide invoice details manually
• **Existing Data** - Convert your existing invoice data

📷 **To get started:** Upload an invoice image or describe what you need!

💡 **Tip:** Make sure invoice images are clear and contain all GST details.`,
            intent: intentResult.intent,
            actions: [{
                type: 'request_file_upload',
                payload: {
                    acceptedTypes: ['image/jpeg', 'image/png', 'image/jpg'],
                    maxSize: '10MB'
                }
            }]
        };
    }

    /**
     * Handle GST calculations
     */
    async handleCalculations(userInput, intentResult, context) {
        try {
            const entities = intentResult.entities;
            const amount = entities.amount;
            const rate = entities.taxRate;

            if (!amount || !rate) {
                return {
                    success: true,
                    message: `🧮 **GST Calculator**

To calculate GST, I need:
• **Amount** (taxable value)
• **GST Rate** (5%, 12%, 18%, or 28%)

📝 **Example:** "Calculate GST on ₹10,000 at 18%"

Please provide both values and I'll calculate it for you!`,
                    intent: intentResult.intent
                };
            }

            // Perform calculation
            const gstAmounts = calculateGST(amount, rate, false); // Assume intra-state
            const totalAmount = amount + gstAmounts.cgst + gstAmounts.sgst;

            const message = `🧮 **GST Calculation Result**

💰 **Taxable Amount:** ₹${amount.toLocaleString('en-IN')}
📊 **GST Rate:** ${rate}%

**Tax Breakdown:**
• CGST (${rate / 2}%): ₹${gstAmounts.cgst.toLocaleString('en-IN')}
• SGST (${rate / 2}%): ₹${gstAmounts.sgst.toLocaleString('en-IN')}
• **Total GST:** ₹${(gstAmounts.cgst + gstAmounts.sgst).toLocaleString('en-IN')}

💳 **Final Amount:** ₹${totalAmount.toLocaleString('en-IN')}

💡 *Note: This is for intra-state transaction. For inter-state, IGST (${rate}%) would apply instead.*`;

            return {
                success: true,
                message: message,
                intent: intentResult.intent,
                data: {
                    taxableAmount: amount,
                    gstRate: rate,
                    cgst: gstAmounts.cgst,
                    sgst: gstAmounts.sgst,
                    totalGst: gstAmounts.cgst + gstAmounts.sgst,
                    finalAmount: totalAmount
                },
                actions: [{
                    type: 'calculation_result',
                    payload: {
                        calculation: gstAmounts,
                        totalAmount: totalAmount
                    }
                }]
            };
        } catch (error) {
            return {
                success: false,
                message: "❌ Failed to perform GST calculation. Please provide valid amount and rate values.",
                error: error.message
            };
        }
    }

    /**
     * Handle GST queries
     */
    async handleGSTQuery(userInput, intentResult, context) {
        // Simple pattern-based responses for common queries
        const input = userInput.toLowerCase();

        if (input.includes('rice') || input.includes('food grain')) {
            return {
                success: true,
                message: `🌾 **GST Rate for Rice**

Rice and food grains are generally **exempt** from GST (0% rate).

**Details:**
• Unprocessed rice: 0% GST
• Basmati rice: 0% GST  
• Parboiled rice: 0% GST
• Rice bran: 5% GST

**HSN Code:** 1006 (Rice)

💡 **Note:** Processed rice products may have different rates.`,
                intent: intentResult.intent
            };
        }

        if (input.includes('rate') && input.includes('18')) {
            return {
                success: true,
                message: `📊 **18% GST Rate Items**

Common items with 18% GST:
• Most services
• Computers and laptops
• Mobile phones
• Processed foods
• Textiles and garments
• Soaps and cosmetics

💡 **This is the standard GST rate** for most goods and services in India.`,
                intent: intentResult.intent
            };
        }

        return {
            success: true,
            message: `❓ **GST Information**

I can help you with:

📊 **Tax Rates**
• 0% - Essential items (rice, medicines)
• 5% - Basic necessities  
• 12% - Processed foods
• 18% - Standard rate (most items)
• 28% - Luxury items

📋 **Common Queries**
• GST rates for specific items
• HSN/SAC codes
• Filing procedures
• Compliance requirements

🧮 **Calculations**
• GST amount calculations
• Input tax credit
• Invoice totals

Just ask me about any specific GST topic!`,
            intent: intentResult.intent
        };
    }

    /**
     * Handle general help
     */
    async handleGeneralHelp(userInput, context) {
        return {
            success: true,
            message: `🤖 **CompliBot - GST Compliance Assistant**

I can help you with:

📱 **SMS Filing** - File NIL returns via SMS
• "File GSTR-3B for March"
• "File quarterly GSTR-1"

📄 **JSON Generation** - Create GST JSON from invoices
• Upload invoice images
• Generate return formats

🧮 **GST Calculations** - Tax calculations
• "Calculate GST on ₹10,000 at 18%"
• Tax breakdowns and totals

❓ **GST Queries** - Rules and rates
• "What is GST rate for rice?"
• Compliance guidance

💡 **Just tell me what you need help with!**`,
            intent: 'general_help'
        };
    }

    /**
     * Process file uploads
     */
    async processFile(fileData, context = {}) {
        return {
            success: false,
            message: "📄 File processing requires AI models that are currently unavailable. Please try again later or use the web interface for invoice processing.",
            fallback: true
        };
    }

    /**
     * Generate contextual help
     */
    async generateContextualHelp(userContext = {}) {
        return `🤖 I can help you with GST compliance, SMS filing, calculations, and more. Just ask me anything!`;
    }
}

module.exports = FallbackOrchestrator;
/**
 * AI Orchestration Layer for CompliBot
 * Simplified version that works with basic Google Generative AI
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config/env');

// Initialize AI model
const genAI = new GoogleGenerativeAI(config.googleAI.apiKey);
const model = genAI.getGenerativeModel({ model: config.googleAI.modelName });

/**
 * AI Orchestrator Class
 * Main coordinator that understands user intent and delegates to specialized agents
 */
class AIOrchestrator {
    constructor() {
        this.useAI = true; // Flag to control AI usage
    }

    /**
     * Simple intent classification using pattern matching
     */
    classifyIntentSimple(userInput) {
        const input = userInput.toLowerCase();

        if (input.includes('json') || input.includes('generate') || input.includes('download')) {
            return { intent: 'json_generation', confidence: 0.8 };
        }
        if (input.includes('nil') || input.includes('file') || input.includes('sms')) {
            return { intent: 'sms_filing', confidence: 0.8 };
        }
        if (input.includes('rate') || input.includes('tax') || input.includes('gst') || input.includes('calculate')) {
            return { intent: 'gst_query', confidence: 0.8 };
        }
        if (input.includes('invoice') || input.includes('process')) {
            return { intent: 'invoice_processing', confidence: 0.8 };
        }

        return { intent: 'general_help', confidence: 0.5 };
    }

    /**
     * Understand user intent from natural language input
     * @param {string} userInput - User's message
     * @param {object} context - Additional context (user data, chat history, etc.)
     * @returns {Promise<object>} - Intent classification result
     */
    async classifyIntent(userInput, context = {}) {
        try {
            if (this.useAI) {
                const prompt = `
                Analyze this user message for a GST compliance bot and respond with just the intent name:
                
                User Message: "${userInput}"
                
                Available intents:
                - json_generation (user wants GST JSON from invoice)
                - sms_filing (user wants to file NIL returns via SMS)
                - gst_query (user has GST questions/calculations)
                - invoice_processing (user uploaded invoice)
                - general_help (unclear or general help)
                
                Respond with only the intent name.
                `;

                const result = await model.generateContent(prompt);
                const response = await result.response;
                const intentText = response.text().trim().toLowerCase();

                const validIntents = ['json_generation', 'sms_filing', 'gst_query', 'invoice_processing', 'general_help'];
                const intent = validIntents.find(i => intentText.includes(i)) || 'general_help';

                return {
                    intent,
                    confidence: 0.8,
                    entities: {},
                    reasoning: 'AI-based classification'
                };
            } else {
                return this.classifyIntentSimple(userInput);
            }
        } catch (error) {
            console.error('Intent classification error:', error);
            this.useAI = false;
            return this.classifyIntentSimple(userInput);
        }
    }

    /**
     * Process user request with simple responses
     * @param {string} userInput - User's message
     * @param {object} context - Request context
     * @returns {Promise<object>} - Processed response
     */
    async processRequest(userInput, context = {}) {
        try {
            const intentResult = await this.classifyIntent(userInput, context);
            console.log(`[Orchestrator] Intent: ${intentResult.intent}`);

            // Simple response based on intent
            switch (intentResult.intent) {
                case 'json_generation':
                    return {
                        success: true,
                        message: "To generate GST JSON, please upload an invoice image first. After processing, type 'json' to download the GST return format.",
                        intent: intentResult.intent
                    };

                case 'sms_filing':
                    return {
                        success: true,
                        message: "For SMS filing of NIL returns, I can help you with the process. Please provide your GSTIN and the month you want to file for.",
                        intent: intentResult.intent
                    };

                case 'gst_query':
                    return await this.handleGSTQuery(userInput);

                case 'invoice_processing':
                    return {
                        success: true,
                        message: "Please upload your invoice image and I'll process it to extract GST data and generate the return JSON format.",
                        intent: intentResult.intent
                    };

                default:
                    return {
                        success: true,
                        message: "I can help you with:\n• Processing invoice images\n• Generating GST return JSON\n• GST calculations and queries\n• Filing NIL returns via SMS\n\nWhat would you like to do?",
                        intent: intentResult.intent
                    };
            }
        } catch (error) {
            console.error('Request processing error:', error);
            return {
                success: false,
                message: "Sorry, I encountered an error. Please try again.",
                error: error.message
            };
        }
    }

    /**
     * Handle GST-related queries
     */
    async handleGSTQuery(userInput) {
        try {
            if (this.useAI) {
                const prompt = `You are a GST compliance assistant. Answer this question concisely and accurately: ${userInput}`;
                const result = await model.generateContent(prompt);
                const response = await result.response;

                return {
                    success: true,
                    message: response.text(),
                    intent: 'gst_query'
                };
            } else {
                return {
                    success: true,
                    message: "I can help with GST queries, but AI processing is currently unavailable. Please try again later or contact support.",
                    intent: 'gst_query'
                };
            }
        } catch (error) {
            console.error('GST query error:', error);
            this.useAI = false;
            return {
                success: true,
                message: "I can help with GST queries. Please be more specific about what you'd like to know.",
                intent: 'gst_query'
            };
        }
    }

    /**
     * Generate contextual help based on user's current state
     * @param {object} userContext - User's context and history
     * @returns {Promise<string>} - Contextual help message
     */
    async generateContextualHelp(userContext = {}) {
        const isRegistered = userContext.isRegistered || false;
        const gstin = userContext.gstin || 'Not provided';

        if (isRegistered) {
            return `🤖 Welcome back! Here's what I can help you with:

📄 **Invoice Processing**: Upload invoice images to extract GST data
📊 **GST Calculations**: Ask about tax rates, calculations, compliance
📋 **JSON Generation**: Get GST return format after processing invoices
📱 **SMS Filing**: File NIL returns via SMS

💡 **Quick Actions**:
• Upload an invoice image → Get automatic processing
• Type "json" → Download GST return JSON
• Ask "What is GST rate for medicines?" → Get instant answers

Your GSTIN: ${gstin}`;
        } else {
            return `👋 Welcome to CompliBot! Please register first using /start to access all features.

After registration, I can help you with:
• Processing GST invoices
• Generating return JSON
• GST compliance queries
• SMS filing for NIL returns`;
        }
    }

    /**
     * Handle file uploads (images, documents)
     * @param {object} fileData - File information and buffer
     * @param {object} context - Request context
     * @returns {Promise<object>} - Processing result
     */
    async processFile(fileData, context = {}) {
        try {
            // For images, use the JSON generator tool
            if (fileData.mimetype?.startsWith('image/')) {
                return {
                    success: true,
                    message: "Invoice image received. Processing with AI to extract GST data...",
                    action: 'process_invoice_image',
                    fileData: fileData
                };
            }

            return {
                success: false,
                message: "Unsupported file type. Please upload an invoice image (JPG, PNG, etc.)"
            };
        } catch (error) {
            console.error('File processing error:', error);
            return {
                success: false,
                message: "Error processing file. Please try again."
            };
        }
    }
}

module.exports = AIOrchestrator;
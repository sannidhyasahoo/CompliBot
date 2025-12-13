/**
 * GST Query AI Agent
 * Specialized agent for answering GST-related questions and compliance queries
 */

const { generateText, generateObject } = require('ai');
const { google } = require('@ai-sdk/google');
const { z } = require('zod');
const config = require('../../config/env');
const { validateGSTIN, calculateGST, getStateCode } = require('../../modules/gstHelper');

// Initialize AI model
const model = google('gemini-2.5-flash-lite', {
    apiKey: config.googleAI.apiKey
});

// Set environment variable for Vercel AI SDK compatibility
if (config.googleAI.apiKey && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = config.googleAI.apiKey;
}

// Query classification schema
const QueryTypeSchema = z.object({
    category: z.enum([
        'tax_rates',
        'compliance_rules',
        'filing_procedures',
        'calculations',
        'penalties_interest',
        'registration',
        'returns',
        'input_credit',
        'general_gst'
    ]),
    complexity: z.enum(['basic', 'intermediate', 'advanced']),
    requiresCalculation: z.boolean(),
    entities: z.object({
        amount: z.number().optional(),
        taxRate: z.number().optional(),
        hsn: z.string().optional(),
        state: z.string().optional(),
        turnover: z.number().optional()
    }).optional()
});

class GSTQueryAgent {
    constructor() {
        this.name = 'GST Query Agent';
        this.capabilities = [
            'gst_questions',
            'tax_calculations',
            'compliance_guidance',
            'rule_explanations',
            'penalty_calculations'
        ];

        // GST knowledge base - key facts and rates
        this.knowledgeBase = {
            taxRates: {
                'nil': 0,
                'exempt': 0,
                'standard': [5, 12, 18, 28],
                'cess': 'Additional cess on luxury and sin goods'
            },
            thresholds: {
                'registration': 4000000, // 40 lakhs for goods
                'composition': 15000000, // 1.5 crores
                'ecommerce': 0 // Mandatory registration
            },
            dueDates: {
                'GSTR-1': '11th of next month',
                'GSTR-3B': '20th of next month',
                'GSTR-9': '31st December of next financial year'
            }
        };
    }

    /**
     * Process GST query
     * @param {string} userInput - User's question
     * @param {object} context - Request context
     * @returns {Promise<object>} - Query response
     */
    async process(userInput, context = {}) {
        try {
            // Classify the query type
            const queryType = await this.classifyQuery(userInput, context);

            console.log('[GST Agent] Query type:', queryType);

            // Route to appropriate handler
            if (queryType.requiresCalculation) {
                return await this.handleCalculation(userInput, queryType, context);
            }

            switch (queryType.category) {
                case 'tax_rates':
                    return await this.handleTaxRateQuery(userInput, context);
                case 'compliance_rules':
                    return await this.handleComplianceQuery(userInput, context);
                case 'filing_procedures':
                    return await this.handleFilingQuery(userInput, context);
                case 'calculations':
                    return await this.handleCalculation(userInput, queryType, context);
                case 'penalties_interest':
                    return await this.handlePenaltyQuery(userInput, context);
                default:
                    return await this.handleGeneralQuery(userInput, context);
            }

        } catch (error) {
            console.error('[GST Agent] Processing error:', error);
            return {
                message: "❌ I encountered an error while processing your GST query. Please try rephrasing your question.",
                error: error.message
            };
        }
    }

    /**
     * Classify the type of GST query
     * @param {string} userInput - User's question
     * @param {object} context - Request context
     * @returns {Promise<object>} - Query classification
     */
    async classifyQuery(userInput, context = {}) {
        const prompt = `
        Classify this GST-related query and extract relevant entities.
        
        User Question: "${userInput}"
        
        Categories:
        - tax_rates: Questions about GST rates, HSN codes, rate slabs
        - compliance_rules: Rules, regulations, eligibility criteria
        - filing_procedures: How to file returns, deadlines, procedures
        - calculations: Tax calculations, invoice amounts, input credit
        - penalties_interest: Late fees, penalties, interest calculations
        - registration: GST registration process, requirements
        - returns: Specific return types (GSTR-1, GSTR-3B, etc.)
        - input_credit: Input tax credit rules and calculations
        - general_gst: General GST concepts and definitions
        
        Look for:
        - Numbers that might be amounts or rates
        - HSN/SAC codes
        - State names
        - Turnover figures
        - Whether calculation is needed
        
        Examples:
        - "What is GST rate for rice?" → tax_rates, basic
        - "Calculate GST on 10000 at 18%" → calculations, basic, requiresCalculation=true
        - "GSTR-3B filing deadline" → filing_procedures, basic
        `;

        try {
            const result = await generateObject({
                model,
                schema: QueryTypeSchema,
                prompt
            });

            return result.object;
        } catch (error) {
            console.error('Query classification error:', error);
            return {
                category: 'general_gst',
                complexity: 'basic',
                requiresCalculation: false,
                entities: {}
            };
        }
    }

    /**
     * Handle tax rate queries
     * @param {string} userInput - User's question
     * @param {object} context - Request context
     * @returns {Promise<object>} - Tax rate response
     */
    async handleTaxRateQuery(userInput, context = {}) {
        const prompt = `
        Answer this GST tax rate question accurately and concisely.
        
        Question: "${userInput}"
        
        Provide:
        1. Direct answer to the rate question
        2. HSN/SAC code if relevant
        3. Any conditions or exceptions
        4. Practical example if helpful
        
        Use current GST rates:
        - 0% (Nil/Exempt): Basic necessities, healthcare, education
        - 5%: Essential items, food grains, medicines
        - 12%: Processed foods, textiles, chemicals
        - 18%: Most goods and services (standard rate)
        - 28%: Luxury items, automobiles, tobacco
        - Cess: Additional on luxury/sin goods
        
        Keep response under 200 words. Use emojis appropriately.
        `;

        const result = await generateText({
            model,
            prompt
        });

        return {
            message: result.text,
            category: 'tax_rates',
            actions: [{
                type: 'rate_info',
                payload: {
                    query: userInput,
                    category: 'tax_rates'
                }
            }]
        };
    }

    /**
     * Handle compliance rule queries
     * @param {string} userInput - User's question
     * @param {object} context - Request context
     * @returns {Promise<object>} - Compliance response
     */
    async handleComplianceQuery(userInput, context = {}) {
        const prompt = `
        Answer this GST compliance question with accurate, actionable guidance.
        
        Question: "${userInput}"
        
        Focus on:
        1. Clear explanation of the rule/requirement
        2. Who it applies to (eligibility/threshold)
        3. Consequences of non-compliance
        4. Practical steps to ensure compliance
        5. Relevant deadlines or timelines
        
        Common compliance areas:
        - Registration thresholds (₹40L for goods, ₹20L for services)
        - Return filing requirements
        - Invoice requirements
        - Input tax credit conditions
        - Composition scheme rules
        
        Provide authoritative, practical advice. Use bullet points for clarity.
        `;

        const result = await generateText({
            model,
            prompt
        });

        return {
            message: result.text,
            category: 'compliance_rules',
            actions: [{
                type: 'compliance_checklist',
                payload: {
                    query: userInput,
                    category: 'compliance'
                }
            }]
        };
    }

    /**
     * Handle filing procedure queries
     * @param {string} userInput - User's question
     * @param {object} context - Request context
     * @returns {Promise<object>} - Filing procedure response
     */
    async handleFilingQuery(userInput, context = {}) {
        const prompt = `
        Provide step-by-step guidance for this GST filing question.
        
        Question: "${userInput}"
        
        Include:
        1. Step-by-step procedure
        2. Required documents/information
        3. Deadlines and due dates
        4. Common mistakes to avoid
        5. Penalties for late filing
        
        Key filing information:
        - GSTR-1: 11th of next month (outward supplies)
        - GSTR-3B: 20th of next month (summary return)
        - GSTR-9: Annual return by 31st December
        - Late fee: ₹50 per day per return (max ₹5000)
        
        Make it actionable with clear next steps.
        `;

        const result = await generateText({
            model,
            prompt
        });

        return {
            message: result.text,
            category: 'filing_procedures',
            actions: [{
                type: 'filing_guide',
                payload: {
                    query: userInput,
                    category: 'filing'
                }
            }]
        };
    }

    /**
     * Handle GST calculations
     * @param {string} userInput - User's question
     * @param {object} queryType - Query classification
     * @param {object} context - Request context
     * @returns {Promise<object>} - Calculation response
     */
    async handleCalculation(userInput, queryType, context = {}) {
        try {
            const entities = queryType.entities || {};

            // Extract calculation parameters
            const amount = entities.amount || this.extractNumber(userInput, 'amount');
            const rate = entities.taxRate || this.extractNumber(userInput, 'rate');

            if (!amount || !rate) {
                return {
                    message: "🧮 **GST Calculator**\n\nTo calculate GST, I need:\n• **Amount** (taxable value)\n• **GST Rate** (5%, 12%, 18%, or 28%)\n\n📝 **Example:** \"Calculate GST on ₹10,000 at 18%\"\n\nPlease provide both values and I'll calculate it for you!",
                    actions: [{
                        type: 'calculator_form',
                        payload: {
                            amount: amount || null,
                            rate: rate || null
                        }
                    }]
                };
            }

            // Perform GST calculation
            const gstAmounts = calculateGST(amount, rate, false); // Assume intra-state for now
            const totalAmount = amount + gstAmounts.cgst + gstAmounts.sgst + gstAmounts.igst;

            const calculationResult = `🧮 **GST Calculation Result**

💰 **Taxable Amount:** ₹${amount.toLocaleString('en-IN')}
📊 **GST Rate:** ${rate}%

**Tax Breakdown:**
• CGST (${rate / 2}%): ₹${gstAmounts.cgst.toLocaleString('en-IN')}
• SGST (${rate / 2}%): ₹${gstAmounts.sgst.toLocaleString('en-IN')}
• **Total GST:** ₹${(gstAmounts.cgst + gstAmounts.sgst).toLocaleString('en-IN')}

💳 **Final Amount:** ₹${totalAmount.toLocaleString('en-IN')}

💡 *Note: This is for intra-state transaction. For inter-state, IGST (${rate}%) would apply instead of CGST+SGST.*`;

            return {
                message: calculationResult,
                data: {
                    taxableAmount: amount,
                    gstRate: rate,
                    cgst: gstAmounts.cgst,
                    sgst: gstAmounts.sgst,
                    igst: gstAmounts.igst,
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
            console.error('[GST Agent] Calculation error:', error);
            return {
                message: "❌ Failed to perform GST calculation. Please provide valid amount and rate values.",
                error: error.message
            };
        }
    }

    /**
     * Handle penalty and interest queries
     * @param {string} userInput - User's question
     * @param {object} context - Request context
     * @returns {Promise<object>} - Penalty response
     */
    async handlePenaltyQuery(userInput, context = {}) {
        const prompt = `
        Answer this GST penalty/interest question with specific rates and calculations.
        
        Question: "${userInput}"
        
        Include:
        1. Applicable penalty rates
        2. Interest calculation method
        3. How to calculate the penalty
        4. Ways to minimize or avoid penalties
        5. Recent updates to penalty structure
        
        Key penalty information:
        - Late filing: ₹50/day per return (max ₹5000)
        - Interest: 18% per annum on delayed tax payment
        - Non-filing: ₹10,000 or 0.25% of turnover (whichever is higher)
        - Wrong return: ₹10,000 per return
        
        Provide practical examples with calculations where relevant.
        `;

        const result = await generateText({
            model,
            prompt
        });

        return {
            message: result.text,
            category: 'penalties_interest',
            actions: [{
                type: 'penalty_calculator',
                payload: {
                    query: userInput,
                    category: 'penalties'
                }
            }]
        };
    }

    /**
     * Handle general GST queries
     * @param {string} userInput - User's question
     * @param {object} context - Request context
     * @returns {Promise<object>} - General response
     */
    async handleGeneralQuery(userInput, context = {}) {
        const prompt = `
        Answer this GST question comprehensively but concisely.
        
        Question: "${userInput}"
        User GSTIN: ${context.gstin || 'Not provided'}
        
        Provide:
        1. Clear, accurate answer
        2. Relevant examples or scenarios
        3. Practical implications
        4. Related concepts they should know
        5. Next steps or actions they can take
        
        Keep it under 300 words. Use emojis and formatting for readability.
        Focus on practical, actionable information.
        `;

        const result = await generateText({
            model,
            prompt
        });

        return {
            message: result.text,
            category: 'general_gst',
            actions: [{
                type: 'related_topics',
                payload: {
                    query: userInput,
                    suggestions: [
                        'GST rates and HSN codes',
                        'Filing procedures',
                        'Input tax credit',
                        'Compliance requirements'
                    ]
                }
            }]
        };
    }

    /**
     * Extract numeric values from user input
     * @param {string} text - Input text
     * @param {string} type - Type of number to extract (amount, rate, etc.)
     * @returns {number|null} - Extracted number
     */
    extractNumber(text, type = 'amount') {
        // Remove currency symbols and commas
        const cleanText = text.replace(/[₹,]/g, '');

        if (type === 'rate') {
            // Look for percentage values
            const rateMatch = cleanText.match(/(\d+(?:\.\d+)?)%/);
            if (rateMatch) return parseFloat(rateMatch[1]);

            // Look for common GST rates
            const commonRates = [5, 12, 18, 28];
            for (const rate of commonRates) {
                if (cleanText.includes(rate.toString())) {
                    return rate;
                }
            }
        } else {
            // Look for amount values
            const amountMatch = cleanText.match(/(\d+(?:,\d+)*(?:\.\d+)?)/);
            if (amountMatch) {
                return parseFloat(amountMatch[1].replace(/,/g, ''));
            }
        }

        return null;
    }
}

module.exports = GSTQueryAgent;
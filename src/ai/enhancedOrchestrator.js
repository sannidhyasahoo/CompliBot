/**
 * Enhanced AI Orchestrator with Tool Integration
 * Uses tool registry for better delegation and capability management
 */

const { generateObject, generateText } = require('ai');
const { google } = require('@ai-sdk/google');
const { z } = require('zod');
const config = require('../config/env');
const toolRegistry = require('../tools/toolRegistry');
const quotaManager = require('../tools/quotaManager');

// Initialize AI model with quota management
const getModel = () => {
    const bestModel = quotaManager.getBestAvailableModel() || config.googleAI.modelName;
    return google(bestModel, {
        apiKey: config.googleAI.apiKey
    });
};

// Set environment variable for Vercel AI SDK compatibility
if (config.googleAI.apiKey && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = config.googleAI.apiKey;
}

// Enhanced intent classification schema
const EnhancedIntentSchema = z.object({
    intent: z.enum([
        'gst_calculation',
        'sms_filing',
        'json_generation',
        'invoice_processing',
        'otp_operations',
        'validation',
        'compliance_check',
        'nil_reporting',
        'reporting',
        'general_help'
    ]),
    confidence: z.number().min(0).max(1),
    suggestedTools: z.array(z.string()),
    entities: z.object({
        gstin: z.string().optional(),
        taxableValue: z.number().optional(),
        gstRate: z.number().optional(),
        period: z.string().optional(),
        returnType: z.enum(['GSTR-1', 'GSTR-3B']).optional(),
        isQuarterly: z.boolean().optional(),
        verificationCode: z.string().optional(),
        hsnCode: z.string().optional(),
        description: z.string().optional(),
        invoiceData: z.any().optional()
    }),
    reasoning: z.string(),
    requiresFile: z.boolean().default(false)
});

/**
 * Enhanced AI Orchestrator Class
 * Integrates with tool registry for comprehensive capability management
 */
class EnhancedOrchestrator {
    constructor() {
        this.toolRegistry = toolRegistry;
        this.executionHistory = [];
        this.useAI = true;

        // Initialize fallback orchestrator
        const FallbackOrchestrator = require('./fallbackOrchestrator');
        this.fallbackOrchestrator = new FallbackOrchestrator();
    }

    /**
     * Enhanced intent classification with tool suggestions
     * @param {string} userInput - User's message
     * @param {object} context - Request context
     * @returns {Promise<object>} - Enhanced intent classification
     */
    async classifyIntentWithTools(userInput, context = {}) {
        try {
            const availableTools = Array.from(this.toolRegistry.getAllTools().keys());
            const toolCategories = this.toolRegistry.getStatistics().availableCategories;

            const prompt = `
            Analyze the user's message and classify their intent for a comprehensive GST compliance bot.
            Also suggest the most appropriate tools to handle this request.

            User Message: "${userInput}"
            
            Context:
            - User GSTIN: ${context.gstin || 'Not provided'}
            - Previous conversation: ${context.lastIntent || 'None'}
            - Has uploaded file: ${context.hasFile || false}
            - Available tool categories: ${toolCategories.join(', ')}

            Available intents:
            1. gst_calculation - Calculate GST amounts, validate GSTINs, get tax rates
            2. sms_filing - File GST returns via SMS (NIL returns, confirmations)
            3. json_generation - Generate GST JSON from data or invoices
            4. invoice_processing - Process uploaded invoice images
            5. otp_operations - Generate, verify, or manage OTPs
            6. validation - Validate GSTINs, invoice data, or other inputs
            7. compliance_check - Check compliance requirements and rules
            8. nil_reporting - Generate NIL reports, SMS NIL reports, eligibility checks
            9. reporting - Generate comprehensive GST reports and analytics
            10. general_help - General help or unclear intent

            Available tools: ${availableTools.join(', ')}

            Extract entities like:
            - GSTIN (15-digit format)
            - Taxable amounts and GST rates
            - Periods/months for filing
            - Return types (GSTR-1/GSTR-3B)
            - Verification codes (6-digit)
            - HSN codes or product descriptions
            - Invoice data structures

            Suggest 1-3 most relevant tools for this request.
            
            Examples:
            - "Calculate GST on 10000 at 18%" → gst_calculation, tools: [calculate_gst]
            - "File NIL return for March" → sms_filing, tools: [generate_nil_sms, format_filing_period]
            - "Generate NIL report for March" → nil_reporting, tools: [generate_nil_report, generate_sms_nil_report]
            - "SMS NIL report for Q1" → nil_reporting, tools: [generate_sms_nil_report, check_nil_eligibility]
            - "Generate JSON from invoice" → json_generation, tools: [generate_gst_json, validate_invoice_data]
            - "Validate GSTIN 29ABCDE1234F1Z5" → validation, tools: [validate_gstin]
            - "Check compliance status" → compliance_check, tools: [check_gst_compliance]
            - "Generate summary report" → reporting, tools: [generate_summary_report]
            `;

            const model = getModel();
            if (!model) {
                throw new Error('No AI models available due to quota limits');
            }

            const result = await generateObject({
                model,
                schema: EnhancedIntentSchema,
                prompt
            });

            // Record successful API usage
            quotaManager.recordUsage(config.googleAI.modelName);

            return result.object;
        } catch (error) {
            console.error('Enhanced intent classification error:', error);

            // Check if it's a quota error
            if (quotaManager.isQuotaError(error)) {
                console.warn('Quota exceeded during intent classification, using fallback');
                return {
                    intent: 'general_help',
                    confidence: 0.3,
                    suggestedTools: [],
                    entities: {},
                    reasoning: 'Quota exceeded, using fallback classification',
                    requiresFile: false,
                    quotaExceeded: true
                };
            }

            return {
                intent: 'general_help',
                confidence: 0.5,
                suggestedTools: ['validate_gstin', 'calculate_gst'],
                entities: {},
                reasoning: 'Failed to classify intent, defaulting to general help',
                requiresFile: false
            };
        }
    }

    /**
     * Process user request using tool-based approach
     * @param {string} userInput - User's message
     * @param {object} context - Request context
     * @returns {Promise<object>} - Processed response
     */
    async processRequest(userInput, context = {}) {
        try {
            // Try AI-based processing first
            if (this.useAI) {
                try {
                    // Step 1: Enhanced intent classification with tool suggestions
                    const intentResult = await this.classifyIntentWithTools(userInput, context);

                    // Check if quota was exceeded during classification
                    if (intentResult.quotaExceeded) {
                        return quotaManager.handleQuotaExceeded(userInput, intentResult.intent);
                    }

                    console.log(`[Enhanced Orchestrator] Intent: ${intentResult.intent} (confidence: ${intentResult.confidence})`);
                    console.log(`[Enhanced Orchestrator] Suggested tools: ${intentResult.suggestedTools.join(', ')}`);

                    // Step 2: Execute suggested tools
                    const toolResults = await this.executeToolChain(intentResult.suggestedTools, intentResult.entities, context);

                    // Step 3: Generate comprehensive response
                    const response = await this.generateResponse(userInput, intentResult, toolResults, context);

                    // Step 4: Record execution history
                    this.recordExecution(userInput, intentResult, toolResults, response);

                    return {
                        success: true,
                        ...response,
                        intent: intentResult.intent,
                        confidence: intentResult.confidence,
                        toolsUsed: intentResult.suggestedTools,
                        toolResults: toolResults
                    };

                } catch (aiError) {
                    console.warn('[Enhanced Orchestrator] AI processing failed, falling back:', aiError.message);
                    this.useAI = false;
                    return await this.fallbackOrchestrator.processRequest(userInput, context);
                }
            } else {
                // Use fallback orchestrator
                return await this.fallbackOrchestrator.processRequest(userInput, context);
            }

        } catch (error) {
            console.error('Enhanced orchestrator error:', error);
            return {
                success: false,
                message: "Sorry, I encountered an error processing your request. Please try again.",
                error: error.message
            };
        }
    }

    /**
     * Execute a chain of tools based on intent
     * @param {Array} suggestedTools - List of tool IDs to execute
     * @param {object} entities - Extracted entities
     * @param {object} context - Request context
     * @returns {Promise<Array>} - Tool execution results
     */
    async executeToolChain(suggestedTools, entities, context = {}) {
        const results = [];

        for (const toolId of suggestedTools) {
            try {
                // Prepare parameters for the tool
                const parameters = this.prepareToolParameters(toolId, entities, context);

                // Execute the tool
                const result = await this.toolRegistry.executeTool(toolId, parameters);

                results.push({
                    toolId: toolId,
                    success: result.success,
                    data: result.data,
                    message: result.message,
                    error: result.error,
                    actions: result.actions
                });

                // If a tool fails critically, stop the chain
                if (!result.success && this.isCriticalTool(toolId)) {
                    console.warn(`Critical tool ${toolId} failed, stopping chain`);
                    break;
                }

            } catch (error) {
                console.error(`Tool chain execution error [${toolId}]:`, error);
                results.push({
                    toolId: toolId,
                    success: false,
                    error: error.message,
                    message: `Failed to execute ${toolId}`
                });
            }
        }

        return results;
    }

    /**
     * Prepare parameters for a specific tool
     * @param {string} toolId - Tool identifier
     * @param {object} entities - Extracted entities
     * @param {object} context - Request context
     * @returns {object} - Prepared parameters
     */
    prepareToolParameters(toolId, entities, context) {
        const parameters = { ...entities };

        // Add context-specific parameters
        if (context.gstin && !parameters.gstin) {
            parameters.gstin = context.gstin;
        }

        // Tool-specific parameter preparation
        switch (toolId) {
            case 'calculate_gst':
                // Ensure numeric values
                if (parameters.taxableValue) parameters.taxableValue = Number(parameters.taxableValue);
                if (parameters.gstRate) parameters.gstRate = Number(parameters.gstRate);
                break;

            case 'generate_nil_sms':
                // Ensure period is in correct format
                if (!parameters.period && context.currentMonth) {
                    parameters.period = context.currentMonth;
                }
                if (!parameters.returnType) {
                    parameters.returnType = 'GSTR-3B';
                }
                break;

            case 'process_invoice_image':
                // Add file data from context
                if (context.fileData) {
                    parameters.file = context.fileData;
                }
                break;

            case 'verify_otp':
                // Ensure OTP is string
                if (parameters.verificationCode) {
                    parameters.otp = parameters.verificationCode.toString();
                }
                break;
        }

        return parameters;
    }

    /**
     * Generate comprehensive response from tool results
     * @param {string} userInput - Original user input
     * @param {object} intentResult - Intent classification result
     * @param {Array} toolResults - Tool execution results
     * @param {object} context - Request context
     * @returns {Promise<object>} - Generated response
     */
    async generateResponse(userInput, intentResult, toolResults, context) {
        try {
            // Check if any tools succeeded
            const successfulResults = toolResults.filter(result => result.success);
            const failedResults = toolResults.filter(result => !result.success);

            if (successfulResults.length === 0) {
                return {
                    message: "❌ I couldn't process your request successfully. Please check your input and try again.",
                    data: null,
                    actions: []
                };
            }

            // Generate contextual response based on intent and results
            const response = await this.generateContextualResponse(
                userInput,
                intentResult.intent,
                successfulResults,
                failedResults,
                context
            );

            // Combine actions from all successful tools
            const allActions = successfulResults
                .filter(result => result.actions)
                .flatMap(result => result.actions);

            return {
                message: response,
                data: successfulResults.length === 1 ? successfulResults[0].data : successfulResults.map(r => r.data),
                actions: allActions,
                summary: {
                    toolsExecuted: toolResults.length,
                    successful: successfulResults.length,
                    failed: failedResults.length
                }
            };

        } catch (error) {
            console.error('Response generation error:', error);
            return {
                message: "I processed your request but encountered an issue generating the response. Here are the raw results.",
                data: toolResults,
                actions: []
            };
        }
    }

    /**
     * Generate contextual response based on intent and results
     * @param {string} userInput - Original user input
     * @param {string} intent - Classified intent
     * @param {Array} successfulResults - Successful tool results
     * @param {Array} failedResults - Failed tool results
     * @param {object} context - Request context
     * @returns {Promise<string>} - Generated response message
     */
    async generateContextualResponse(userInput, intent, successfulResults, failedResults, context) {
        const prompt = `
        Generate a helpful, conversational response for a GST compliance bot user.
        
        User's original request: "${userInput}"
        Classified intent: ${intent}
        
        Successful tool results:
        ${successfulResults.map(r => `- ${r.toolId}: ${r.message}`).join('\n')}
        
        ${failedResults.length > 0 ? `Failed tools:\n${failedResults.map(r => `- ${r.toolId}: ${r.error}`).join('\n')}` : ''}
        
        Context:
        - User GSTIN: ${context.gstin || 'Not provided'}
        - User is registered: ${context.isRegistered || false}
        
        Generate a response that:
        1. Acknowledges what was accomplished
        2. Presents the results in a user-friendly way
        3. Suggests next steps if appropriate
        4. Uses emojis and formatting for readability
        5. Keeps it concise but informative
        
        Focus on being helpful and actionable. If calculations were done, show the numbers clearly.
        If SMS was generated, explain the next steps. If validation failed, guide them on fixing it.
        `;

        try {
            const model = getModel();
            if (!model) {
                throw new Error('No AI models available due to quota limits');
            }

            const result = await generateText({
                model,
                prompt
            });

            // Record successful API usage
            quotaManager.recordUsage(config.googleAI.modelName);

            return result.text;
        } catch (error) {
            console.error('Contextual response generation error:', error);

            // Check if it's a quota error
            if (quotaManager.isQuotaError(error)) {
                console.warn('Quota exceeded during response generation, using fallback');
                return quotaManager.getFallbackResponse(userInput, intent);
            }

            // Fallback to simple response
            if (successfulResults.length === 1) {
                return successfulResults[0].message;
            } else {
                return `✅ I've processed your request using ${successfulResults.length} tools. ${successfulResults.map(r => r.message).join(' ')}`;
            }
        }
    }

    /**
     * Check if a tool is critical for the operation
     * @param {string} toolId - Tool identifier
     * @returns {boolean} - Whether the tool is critical
     */
    isCriticalTool(toolId) {
        const criticalTools = [
            'validate_gstin',
            'process_invoice_image',
            'generate_otp',
            'verify_otp'
        ];
        return criticalTools.includes(toolId);
    }

    /**
     * Record execution history for analytics
     * @param {string} userInput - User input
     * @param {object} intentResult - Intent classification
     * @param {Array} toolResults - Tool results
     * @param {object} response - Generated response
     */
    recordExecution(userInput, intentResult, toolResults, response) {
        const execution = {
            timestamp: new Date().toISOString(),
            userInput: userInput,
            intent: intentResult.intent,
            confidence: intentResult.confidence,
            toolsUsed: intentResult.suggestedTools,
            toolResults: toolResults.map(r => ({
                toolId: r.toolId,
                success: r.success,
                error: r.error
            })),
            responseGenerated: !!response.message,
            success: response.success !== false
        };

        this.executionHistory.push(execution);

        // Keep only last 100 executions
        if (this.executionHistory.length > 100) {
            this.executionHistory = this.executionHistory.slice(-100);
        }
    }

    /**
     * Get execution statistics
     * @returns {object} - Execution statistics
     */
    getExecutionStats() {
        const total = this.executionHistory.length;
        const successful = this.executionHistory.filter(e => e.success).length;
        const intentCounts = {};
        const toolUsage = {};

        this.executionHistory.forEach(execution => {
            // Count intents
            if (!intentCounts[execution.intent]) {
                intentCounts[execution.intent] = 0;
            }
            intentCounts[execution.intent]++;

            // Count tool usage
            execution.toolsUsed.forEach(toolId => {
                if (!toolUsage[toolId]) {
                    toolUsage[toolId] = 0;
                }
                toolUsage[toolId]++;
            });
        });

        return {
            totalExecutions: total,
            successfulExecutions: successful,
            successRate: total > 0 ? (successful / total * 100).toFixed(2) + '%' : '0%',
            intentDistribution: intentCounts,
            toolUsage: toolUsage,
            availableTools: this.toolRegistry.getStatistics().totalTools
        };
    }

    /**
     * Handle file uploads with enhanced processing
     * @param {object} fileData - File information and buffer
     * @param {object} context - Request context
     * @returns {Promise<object>} - Processing result
     */
    async processFile(fileData, context = {}) {
        if (this.useAI) {
            try {
                // Determine file type and appropriate tools
                let suggestedTools = [];

                if (fileData.mimetype?.startsWith('image/')) {
                    suggestedTools = ['process_invoice_image', 'generate_gst_json'];
                } else {
                    return {
                        success: false,
                        message: "Unsupported file type. Please upload an invoice image (JPG, PNG, etc.)"
                    };
                }

                // Execute tool chain for file processing
                const toolResults = await this.executeToolChain(suggestedTools, {}, { ...context, fileData });

                // Generate response
                const response = await this.generateResponse(
                    'Process uploaded file',
                    { intent: 'invoice_processing', suggestedTools },
                    toolResults,
                    context
                );

                return {
                    success: true,
                    ...response,
                    toolsUsed: suggestedTools,
                    toolResults: toolResults
                };

            } catch (error) {
                console.warn('Enhanced file processing failed, using fallback:', error.message);
                this.useAI = false;
            }
        }

        // Use fallback for file processing
        return await this.fallbackOrchestrator.processFile(fileData, context);
    }

    /**
     * Generate contextual help with tool awareness
     * @param {object} userContext - User's context and history
     * @returns {Promise<string>} - Contextual help message
     */
    async generateContextualHelp(userContext = {}) {
        if (this.useAI) {
            try {
                const toolStats = this.toolRegistry.getStatistics();
                const executionStats = this.getExecutionStats();

                const prompt = `
                Generate comprehensive help for a GST compliance bot user with advanced capabilities.
                
                User Context:
                - GSTIN: ${userContext.gstin || 'Not registered'}
                - Last action: ${userContext.lastAction || 'None'}
                - Registration status: ${userContext.isRegistered ? 'Registered' : 'Not registered'}
                
                Bot Capabilities:
                - Total tools available: ${toolStats.totalTools}
                - Tool categories: ${toolStats.availableCategories.join(', ')}
                - Success rate: ${executionStats.successRate}
                
                Provide comprehensive help that includes:
                1. What the bot can do (with examples)
                2. Available features and tools
                3. Quick start guide
                4. Common use cases
                5. Tips for best results
                
                Make it engaging, well-formatted with emojis, and under 400 words.
                Focus on practical examples they can try immediately.
                `;

                const result = await generateText({
                    model,
                    prompt
                });

                return result.text;
            } catch (error) {
                console.warn('AI help generation failed, using fallback:', error.message);
                this.useAI = false;
            }
        }

        // Fallback help
        return await this.fallbackOrchestrator.generateContextualHelp(userContext);
    }
}

module.exports = EnhancedOrchestrator;
/**
 * AI Helper Module - Legacy wrapper for backward compatibility
 * This module provides a bridge to the new AI orchestration system
 */

const EnhancedOrchestrator = require('../ai/enhancedOrchestrator');

// Initialize enhanced orchestrator instance
const orchestrator = new EnhancedOrchestrator();

/**
 * Legacy function for processing AI requests
 * @param {string} message - User message
 * @param {object} context - Request context
 * @returns {Promise<string>} - AI response
 */
async function processAIRequest(message, context = {}) {
    try {
        const response = await orchestrator.processRequest(message, context);
        return response.success ? response.message : response.message;
    } catch (error) {
        console.error('AI Helper error:', error);
        return "I'm sorry, I couldn't process your request right now. Please try again.";
    }
}

/**
 * Generate contextual help
 * @param {object} userContext - User context
 * @returns {Promise<string>} - Help message
 */
async function generateHelp(userContext = {}) {
    try {
        return await orchestrator.generateContextualHelp(userContext);
    } catch (error) {
        console.error('Help generation error:', error);
        return "I can help you with GST compliance, invoice processing, SMS filing, and tax calculations. Just ask me anything!";
    }
}

/**
 * Process file uploads
 * @param {object} fileData - File data
 * @param {object} context - Request context
 * @returns {Promise<object>} - Processing result
 */
async function processFile(fileData, context = {}) {
    try {
        return await orchestrator.processFile(fileData, context);
    } catch (error) {
        console.error('File processing error:', error);
        return {
            success: false,
            message: "Failed to process the uploaded file. Please try again.",
            error: error.message
        };
    }
}

/**
 * Classify user intent
 * @param {string} message - User message
 * @param {object} context - Request context
 * @returns {Promise<object>} - Intent classification
 */
async function classifyIntent(message, context = {}) {
    try {
        return await orchestrator.classifyIntent(message, context);
    } catch (error) {
        console.error('Intent classification error:', error);
        return {
            intent: 'general_help',
            confidence: 0.5,
            entities: {},
            reasoning: 'Failed to classify intent'
        };
    }
}

module.exports = {
    processAIRequest,
    generateHelp,
    processFile,
    classifyIntent,
    orchestrator
};
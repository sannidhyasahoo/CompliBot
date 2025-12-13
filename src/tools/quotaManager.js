/**
 * Quota Manager Tool
 * Manages API quotas and provides fallback mechanisms
 */

const fs = require('fs');
const path = require('path');

class QuotaManager {
    constructor() {
        this.quotaFile = path.join(__dirname, '../data/quota-usage.json');
        this.quotaData = this.loadQuotaData();
        this.models = {
            'gemini-1.5-flash': { dailyLimit: 1500, currentUsage: 0 },
            'gemini-2.5-flash': { dailyLimit: 20, currentUsage: 0 },
            'gemini-1.5-pro': { dailyLimit: 50, currentUsage: 0 }
        };
        this.fallbackResponses = this.initializeFallbackResponses();
    }

    /**
     * Load quota usage data from file
     */
    loadQuotaData() {
        try {
            if (fs.existsSync(this.quotaFile)) {
                const data = JSON.parse(fs.readFileSync(this.quotaFile, 'utf8'));
                // Reset if it's a new day
                const today = new Date().toDateString();
                if (data.date !== today) {
                    return { date: today, usage: {} };
                }
                return data;
            }
        } catch (error) {
            console.warn('Could not load quota data:', error.message);
        }
        return { date: new Date().toDateString(), usage: {} };
    }

    /**
     * Save quota usage data to file
     */
    saveQuotaData() {
        try {
            const dataDir = path.dirname(this.quotaFile);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            fs.writeFileSync(this.quotaFile, JSON.stringify(this.quotaData, null, 2));
        } catch (error) {
            console.error('Could not save quota data:', error.message);
        }
    }

    /**
     * Check if model has available quota
     */
    hasQuota(modelName) {
        const model = this.models[modelName];
        if (!model) return false;

        const currentUsage = this.quotaData.usage[modelName] || 0;
        return currentUsage < model.dailyLimit;
    }

    /**
     * Record API usage
     */
    recordUsage(modelName) {
        if (!this.quotaData.usage[modelName]) {
            this.quotaData.usage[modelName] = 0;
        }
        this.quotaData.usage[modelName]++;
        this.saveQuotaData();
    }

    /**
     * Get available models with quota
     */
    getAvailableModels() {
        return Object.keys(this.models).filter(model => this.hasQuota(model));
    }

    /**
     * Get best available model
     */
    getBestAvailableModel() {
        const available = this.getAvailableModels();

        // Priority order: gemini-1.5-flash > gemini-1.5-pro > gemini-2.5-flash
        const priority = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.5-flash'];

        for (const model of priority) {
            if (available.includes(model)) {
                return model;
            }
        }

        return null; // No models available
    }

    /**
     * Get quota status
     */
    getQuotaStatus() {
        const status = {};
        for (const [modelName, model] of Object.entries(this.models)) {
            const currentUsage = this.quotaData.usage[modelName] || 0;
            status[modelName] = {
                used: currentUsage,
                limit: model.dailyLimit,
                remaining: model.dailyLimit - currentUsage,
                percentage: ((currentUsage / model.dailyLimit) * 100).toFixed(1) + '%'
            };
        }
        return status;
    }

    /**
     * Initialize fallback responses for when AI is unavailable
     */
    initializeFallbackResponses() {
        return {
            gst_calculation: {
                'calculate gst': 'To calculate GST: GST Amount = (Taxable Value × GST Rate) ÷ 100\n\nFor 18% GST on ₹10,000:\nGST = (10,000 × 18) ÷ 100 = ₹1,800\n\nFor intra-state: CGST = ₹900, SGST = ₹900\nFor inter-state: IGST = ₹1,800',
                'gst rate': 'Common GST Rates:\n• 0% - Essential items (rice, wheat, milk)\n• 5% - Medicines, processed foods\n• 12% - Textiles, chemicals\n• 18% - Most goods and services\n• 28% - Luxury items, automobiles'
            },
            sms_filing: {
                'nil return': 'To file NIL return via SMS:\n\n1. Send SMS to 14409:\n   "NIL 3B [YOUR_GSTIN] [MMYYYY]"\n   Example: NIL 3B 29ABCDE1234F1Z5 032024\n\n2. Wait for 6-digit verification code\n\n3. Send confirmation:\n   "CNF 3B [6-digit-code]"\n   Example: CNF 3B 123456',
                'sms filing': 'SMS Filing is available for NIL returns only.\n\nEligibility:\n• No outward supplies\n• No input tax credit\n• All previous returns filed\n• Registered mobile number\n\nSend to: 14409'
            },
            validation: {
                'validate gstin': 'GSTIN Format: 15 characters\n• First 2 digits: State code\n• Next 10: PAN number\n• 11th: Entity number\n• 12th: Z (default)\n• 15th: Check digit\n\nExample: 29ABCDE1234F1Z5',
                'gstin check': 'To validate GSTIN:\n1. Check 15-character length\n2. Verify state code (01-38)\n3. Confirm PAN format\n4. Ensure 12th character is Z'
            },
            compliance: {
                'compliance': 'GST Compliance Checklist:\n• Register if turnover > ₹40 lakhs\n• File GSTR-1 by 11th\n• File GSTR-3B by 20th\n• Pay taxes on time\n• Maintain proper records\n• File annual return by Dec 31',
                'due dates': 'GST Due Dates:\n• GSTR-1: 11th of next month\n• GSTR-3B: 20th of next month\n• GSTR-9: 31st December\n• Late fee: ₹50 per day (max ₹5,000)'
            },
            general: {
                'help': '🤖 CompliBot - GST Compliance Assistant\n\nI can help with:\n• GST calculations\n• NIL return SMS filing\n• GSTIN validation\n• Compliance guidance\n• Invoice processing\n\nJust ask me anything about GST!',
                'default': 'I\'m currently experiencing high demand. Here are some quick GST facts:\n\n• GST rates: 0%, 5%, 12%, 18%, 28%\n• GSTR-1 due: 11th of next month\n• GSTR-3B due: 20th of next month\n• NIL returns can be filed via SMS to 14409\n\nPlease try again in a few minutes for detailed assistance.'
            }
        };
    }

    /**
     * Get fallback response based on user input
     */
    getFallbackResponse(userInput, intent = 'general') {
        const input = userInput.toLowerCase();
        const responses = this.fallbackResponses[intent] || this.fallbackResponses.general;

        // Find best matching response
        for (const [key, response] of Object.entries(responses)) {
            if (input.includes(key)) {
                return response;
            }
        }

        // Return default response
        return responses.default || this.fallbackResponses.general.default;
    }

    /**
     * Check if quota exceeded error
     */
    isQuotaError(error) {
        if (!error) return false;
        const errorMessage = error.message || error.toString();
        return errorMessage.includes('quota') ||
            errorMessage.includes('429') ||
            errorMessage.includes('Too Many Requests') ||
            errorMessage.includes('rate limit');
    }

    /**
     * Handle quota exceeded scenario
     */
    handleQuotaExceeded(userInput, intent) {
        console.warn('API quota exceeded, using fallback response');

        const fallbackResponse = this.getFallbackResponse(userInput, intent);

        return {
            success: true,
            message: `⚠️ High demand detected. Here's a quick response:\n\n${fallbackResponse}\n\n💡 For detailed AI assistance, please try again in a few minutes.`,
            fallback: true,
            quotaStatus: this.getQuotaStatus()
        };
    }

    /**
     * Get quota management report
     */
    getQuotaReport() {
        const status = this.getQuotaStatus();
        const availableModels = this.getAvailableModels();
        const bestModel = this.getBestAvailableModel();

        return {
            date: this.quotaData.date,
            modelStatus: status,
            availableModels: availableModels,
            recommendedModel: bestModel,
            totalUsage: Object.values(this.quotaData.usage).reduce((sum, usage) => sum + usage, 0),
            hasAvailableQuota: availableModels.length > 0
        };
    }
}

// Export singleton instance
const quotaManager = new QuotaManager();

module.exports = quotaManager;
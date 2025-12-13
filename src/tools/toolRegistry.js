/**
 * Tool Registry
 * Central registry for all available tools that AI agents can use
 */

// Import all tools
const gstCalculator = require('./gstCalculator');
const smsFilingTool = require('./smsFilingTool');
const jsonProcessingTool = require('./jsonProcessingTool');
const jsonGenerator = require('./jsonGenerator');
const otpTool = require('./otpTool');
const nilReportTool = require('./nilReportTool');
const complianceTool = require('./complianceTool');
const reportingTool = require('./reportingTool');

/**
 * Tool Registry Class
 * Manages all available tools and provides a unified interface for AI agents
 */
class ToolRegistry {
    constructor() {
        this.tools = new Map();
        this.registerAllTools();
    }

    /**
     * Register all available tools
     */
    registerAllTools() {
        // GST Calculator Tools
        this.registerTool('calculate_gst', {
            name: 'GST Calculator',
            description: 'Calculate GST amounts for given taxable value and rate',
            category: 'calculation',
            handler: gstCalculator.calculateGSTAmounts,
            parameters: {
                required: ['taxableValue', 'gstRate'],
                optional: ['supplierState', 'recipientState', 'isInterState']
            }
        });

        this.registerTool('validate_gstin', {
            name: 'GSTIN Validator',
            description: 'Validate GSTIN format and extract state information',
            category: 'validation',
            handler: gstCalculator.validateGSTINFormat,
            parameters: {
                required: ['gstin'],
                optional: []
            }
        });

        this.registerTool('get_gst_rate', {
            name: 'GST Rate Lookup',
            description: 'Get GST rate information for HSN/SAC codes or product descriptions',
            category: 'information',
            handler: gstCalculator.getGSTRateInfo,
            parameters: {
                required: [],
                optional: ['hsnCode', 'description']
            }
        });

        // SMS Filing Tools
        this.registerTool('generate_nil_sms', {
            name: 'NIL Return SMS Generator',
            description: 'Generate SMS for NIL return filing (GSTR-3B/GSTR-1)',
            category: 'sms_filing',
            handler: smsFilingTool.generateNILReturnSMS,
            parameters: {
                required: ['gstin', 'period'],
                optional: ['returnType', 'isQuarterly']
            }
        });

        this.registerTool('generate_confirmation_sms', {
            name: 'Confirmation SMS Generator',
            description: 'Generate confirmation SMS with verification code',
            category: 'sms_filing',
            handler: smsFilingTool.generateConfirmationSMS,
            parameters: {
                required: ['verificationCode'],
                optional: ['returnType']
            }
        });

        this.registerTool('check_sms_eligibility', {
            name: 'SMS Filing Eligibility Checker',
            description: 'Check eligibility requirements for SMS filing',
            category: 'sms_filing',
            handler: smsFilingTool.checkSMSEligibility,
            parameters: {
                required: [],
                optional: ['gstin', 'returnType']
            }
        });

        this.registerTool('format_filing_period', {
            name: 'Filing Period Formatter',
            description: 'Format period for different return types',
            category: 'sms_filing',
            handler: smsFilingTool.formatFilingPeriod,
            parameters: {
                required: ['period'],
                optional: ['returnType', 'isQuarterly']
            }
        });

        this.registerTool('generate_help_sms', {
            name: 'Help SMS Generator',
            description: 'Generate help SMS for GST portal assistance',
            category: 'sms_filing',
            handler: smsFilingTool.generateHelpSMS,
            parameters: {
                required: [],
                optional: ['returnType']
            }
        });

        // JSON Processing Tools
        this.registerTool('generate_gst_json', {
            name: 'GST Return JSON Generator',
            description: 'Generate GST return JSON from invoice data',
            category: 'json_processing',
            handler: jsonProcessingTool.generateGSTReturnJSON,
            parameters: {
                required: ['invoiceData'],
                optional: ['gstin', 'filingPeriod']
            }
        });

        this.registerTool('clean_parse_json', {
            name: 'JSON Cleaner and Parser',
            description: 'Clean and parse AI-generated JSON responses',
            category: 'json_processing',
            handler: jsonProcessingTool.cleanAndParseJSON,
            parameters: {
                required: ['rawResponse'],
                optional: ['expectedSchema']
            }
        });

        this.registerTool('validate_invoice_data', {
            name: 'Invoice Data Validator',
            description: 'Validate invoice data structure and completeness',
            category: 'json_processing',
            handler: jsonProcessingTool.validateInvoiceData,
            parameters: {
                required: ['invoiceData'],
                optional: []
            }
        });

        this.registerTool('generate_gstr1_json', {
            name: 'GSTR-1 JSON Generator',
            description: 'Generate GSTR-1 JSON from multiple invoices',
            category: 'json_processing',
            handler: jsonProcessingTool.generateGSTR1JSON,
            parameters: {
                required: ['gstin', 'invoices'],
                optional: ['filingPeriod']
            }
        });

        this.registerTool('format_json_display', {
            name: 'JSON Formatter',
            description: 'Format JSON for display or download',
            category: 'json_processing',
            handler: jsonProcessingTool.formatJSONForDisplay,
            parameters: {
                required: ['data'],
                optional: ['indent', 'format']
            }
        });

        // Invoice Processing Tools (from existing jsonGenerator)
        this.registerTool('process_invoice_image', {
            name: 'Invoice Image Processor',
            description: 'Process invoice images and extract GST data',
            category: 'invoice_processing',
            handler: jsonGenerator.generateGSTReturnJSON,
            parameters: {
                required: ['file'],
                optional: []
            }
        });

        // OTP Tools
        this.registerTool('generate_otp', {
            name: 'OTP Generator',
            description: 'Generate OTP for GSTIN verification',
            category: 'otp',
            handler: otpTool.generateOTP,
            parameters: {
                required: ['gstin'],
                optional: []
            }
        });

        this.registerTool('verify_otp', {
            name: 'OTP Verifier',
            description: 'Verify OTP for GSTIN',
            category: 'otp',
            handler: otpTool.verifyOTP,
            parameters: {
                required: ['gstin', 'otp'],
                optional: []
            }
        });

        this.registerTool('check_otp_status', {
            name: 'OTP Status Checker',
            description: 'Check OTP status for GSTIN',
            category: 'otp',
            handler: otpTool.checkOTPStatus,
            parameters: {
                required: ['gstin'],
                optional: []
            }
        });

        this.registerTool('resend_otp', {
            name: 'OTP Resender',
            description: 'Resend OTP for GSTIN',
            category: 'otp',
            handler: otpTool.resendOTP,
            parameters: {
                required: ['gstin'],
                optional: []
            }
        });

        // NIL Report Tools
        this.registerTool('generate_nil_report', {
            name: 'NIL Report Generator',
            description: 'Generate comprehensive NIL return report',
            category: 'nil_reporting',
            handler: nilReportTool.generateNILReport,
            parameters: {
                required: ['gstin', 'period'],
                optional: ['returnType', 'isQuarterly', 'includeSMS', 'includeJSON', 'businessName']
            }
        });

        this.registerTool('generate_sms_nil_report', {
            name: 'SMS NIL Report Generator',
            description: 'Generate NIL report with SMS filing integration',
            category: 'nil_reporting',
            handler: nilReportTool.generateSMSNILReport,
            parameters: {
                required: ['gstin', 'period'],
                optional: ['returnType', 'isQuarterly']
            }
        });

        this.registerTool('check_nil_eligibility', {
            name: 'NIL Filing Eligibility Checker',
            description: 'Check eligibility for NIL filing and generate report',
            category: 'nil_reporting',
            handler: nilReportTool.checkNILEligibilityReport,
            parameters: {
                required: ['gstin'],
                optional: ['returnType', 'period']
            }
        });

        this.registerTool('generate_bulk_nil_reports', {
            name: 'Bulk NIL Reports Generator',
            description: 'Generate NIL reports for multiple periods',
            category: 'nil_reporting',
            handler: nilReportTool.generateBulkNILReports,
            parameters: {
                required: ['gstin', 'periods'],
                optional: ['returnType', 'isQuarterly']
            }
        });

        // Compliance Tools
        this.registerTool('check_gst_compliance', {
            name: 'GST Compliance Checker',
            description: 'Check overall GST compliance status',
            category: 'compliance',
            handler: complianceTool.checkGSTCompliance,
            parameters: {
                required: ['gstin'],
                optional: ['turnover', 'businessType', 'filingHistory', 'currentPeriod']
            }
        });

        this.registerTool('get_rate_recommendations', {
            name: 'GST Rate Recommendations',
            description: 'Get GST rate recommendations for products/services',
            category: 'compliance',
            handler: complianceTool.getGSTRateRecommendations,
            parameters: {
                required: [],
                optional: ['products', 'services', 'hsnCodes']
            }
        });

        this.registerTool('check_itc_eligibility', {
            name: 'ITC Eligibility Checker',
            description: 'Check input tax credit eligibility',
            category: 'compliance',
            handler: complianceTool.checkITCEligibility,
            parameters: {
                required: ['gstin', 'supplierGSTIN', 'invoiceAmount', 'gstAmount'],
                optional: ['invoiceDate', 'goodsOrServices', 'businessUse']
            }
        });

        this.registerTool('generate_compliance_calendar', {
            name: 'Compliance Calendar Generator',
            description: 'Generate GST compliance calendar',
            category: 'compliance',
            handler: complianceTool.generateComplianceCalendar,
            parameters: {
                required: [],
                optional: ['year', 'businessType']
            }
        });

        // Reporting Tools
        this.registerTool('generate_summary_report', {
            name: 'GST Summary Report Generator',
            description: 'Generate comprehensive GST summary report',
            category: 'reporting',
            handler: reportingTool.generateGSTSummaryReport,
            parameters: {
                required: ['gstin', 'period'],
                optional: ['transactions', 'includeAnalytics', 'includeCharts']
            }
        });

        this.registerTool('generate_tax_liability_report', {
            name: 'Tax Liability Report Generator',
            description: 'Generate detailed tax liability report',
            category: 'reporting',
            handler: reportingTool.generateTaxLiabilityReport,
            parameters: {
                required: ['gstin', 'period'],
                optional: ['outwardSupplies', 'inwardSupplies', 'previousBalance']
            }
        });

        this.registerTool('generate_reconciliation_report', {
            name: 'Reconciliation Report Generator',
            description: 'Generate GST reconciliation report',
            category: 'reporting',
            handler: reportingTool.generateReconciliationReport,
            parameters: {
                required: ['gstin', 'period'],
                optional: ['booksData', 'gstr1Data', 'gstr2aData']
            }
        });

        this.registerTool('generate_analytics_dashboard', {
            name: 'Analytics Dashboard Generator',
            description: 'Generate comprehensive analytics dashboard',
            category: 'reporting',
            handler: reportingTool.generateAnalyticsDashboard,
            parameters: {
                required: ['gstin'],
                optional: ['periods', 'transactions', 'includeForecasting']
            }
        });

        // System Tools
        this.registerTool('check_quota_status', {
            name: 'Quota Status Checker',
            description: 'Check API quota usage and availability',
            category: 'system',
            handler: async () => {
                const quotaManager = require('./quotaManager');
                const report = quotaManager.getQuotaReport();
                return {
                    success: true,
                    data: report,
                    message: `Quota status: ${report.hasAvailableQuota ? 'Available' : 'Exhausted'}`,
                    actions: [{
                        type: 'quota_status',
                        payload: report
                    }]
                };
            },
            parameters: {
                required: [],
                optional: []
            }
        });
    }

    /**
     * Register a tool
     * @param {string} toolId - Unique tool identifier
     * @param {object} toolConfig - Tool configuration
     */
    registerTool(toolId, toolConfig) {
        this.tools.set(toolId, {
            id: toolId,
            ...toolConfig,
            registeredAt: new Date().toISOString()
        });
    }

    /**
     * Get a tool by ID
     * @param {string} toolId - Tool identifier
     * @returns {object|null} - Tool configuration
     */
    getTool(toolId) {
        return this.tools.get(toolId) || null;
    }

    /**
     * Get all tools
     * @returns {Map} - All registered tools
     */
    getAllTools() {
        return this.tools;
    }

    /**
     * Get tools by category
     * @param {string} category - Tool category
     * @returns {Array} - Tools in the category
     */
    getToolsByCategory(category) {
        const tools = [];
        for (const [toolId, toolConfig] of this.tools) {
            if (toolConfig.category === category) {
                tools.push(toolConfig);
            }
        }
        return tools;
    }

    /**
     * Execute a tool
     * @param {string} toolId - Tool identifier
     * @param {object} parameters - Tool parameters
     * @returns {Promise<object>} - Tool execution result
     */
    async executeTool(toolId, parameters = {}) {
        const tool = this.getTool(toolId);

        if (!tool) {
            return {
                success: false,
                error: `Tool '${toolId}' not found`,
                message: `Unknown tool: ${toolId}`
            };
        }

        try {
            // Validate required parameters
            const missingParams = tool.parameters.required.filter(param =>
                !(param in parameters) || parameters[param] === undefined || parameters[param] === null
            );

            if (missingParams.length > 0) {
                return {
                    success: false,
                    error: `Missing required parameters: ${missingParams.join(', ')}`,
                    message: `Tool '${tool.name}' requires: ${missingParams.join(', ')}`
                };
            }

            // Execute the tool
            const result = await tool.handler(parameters);

            return {
                ...result,
                toolId: toolId,
                toolName: tool.name,
                executedAt: new Date().toISOString()
            };

        } catch (error) {
            console.error(`Tool execution error [${toolId}]:`, error);
            return {
                success: false,
                error: error.message,
                message: `Tool '${tool.name}' execution failed: ${error.message}`,
                toolId: toolId,
                toolName: tool.name
            };
        }
    }

    /**
     * Get tool suggestions based on user intent
     * @param {string} intent - User intent
     * @param {object} entities - Extracted entities
     * @returns {Array} - Suggested tools
     */
    suggestTools(intent, entities = {}) {
        const suggestions = [];

        switch (intent) {
            case 'gst_calculation':
                suggestions.push('calculate_gst', 'get_gst_rate');
                break;
            case 'sms_filing':
                suggestions.push('generate_nil_sms', 'check_sms_eligibility', 'format_filing_period');
                break;
            case 'json_generation':
                suggestions.push('generate_gst_json', 'validate_invoice_data');
                break;
            case 'invoice_processing':
                suggestions.push('process_invoice_image', 'generate_gst_json');
                break;
            case 'otp_operations':
                suggestions.push('generate_otp', 'verify_otp', 'check_otp_status');
                break;
            case 'validation':
                suggestions.push('validate_gstin', 'validate_invoice_data');
                break;
            case 'nil_reporting':
                suggestions.push('generate_nil_report', 'generate_sms_nil_report', 'check_nil_eligibility');
                break;
            case 'compliance_check':
                suggestions.push('check_gst_compliance', 'get_rate_recommendations', 'generate_compliance_calendar');
                break;
            case 'reporting':
                suggestions.push('generate_summary_report', 'generate_tax_liability_report', 'generate_analytics_dashboard');
                break;
            default:
                // Return most commonly used tools
                suggestions.push('calculate_gst', 'validate_gstin', 'generate_nil_report');
                break;
        }

        return suggestions.map(toolId => this.getTool(toolId)).filter(Boolean);
    }

    /**
     * Get tool usage statistics
     * @returns {object} - Usage statistics
     */
    getStatistics() {
        const categories = {};
        let totalTools = 0;

        for (const [toolId, toolConfig] of this.tools) {
            totalTools++;
            const category = toolConfig.category;
            if (!categories[category]) {
                categories[category] = 0;
            }
            categories[category]++;
        }

        return {
            totalTools: totalTools,
            categories: categories,
            availableCategories: Object.keys(categories)
        };
    }
}

// Create and export singleton instance
const toolRegistry = new ToolRegistry();

module.exports = toolRegistry;
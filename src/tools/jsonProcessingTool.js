/**
 * JSON Processing Tool
 * Provides JSON generation and processing capabilities as a tool for AI agents
 */

const {
    safeJsonParse,
    validateJsonSchema,
    cleanAIResponse,
    formatJson,
    generateGstr1Json,
    GstJsonBuilder
} = require('../modules/jsonHelper');
const {
    validateGSTIN,
    calculateGST,
    isInterStateTransaction,
    generateFilingPeriod,
    formatGSTDate
} = require('../modules/gstHelper');

/**
 * Generate GST return JSON from invoice data
 * @param {object} params - JSON generation parameters
 * @returns {object} - JSON generation result
 */
async function generateGSTReturnJSON(params) {
    const { invoiceData, gstin, filingPeriod } = params;

    try {
        // Validate input data
        if (!invoiceData) {
            throw new Error('Invoice data is required');
        }

        // Validate and enhance the data
        const validatedData = validateAndEnhanceInvoiceData(invoiceData);

        // Generate GST return format
        const gstReturn = generateGSTReturnFormat(validatedData, gstin, filingPeriod);

        return {
            success: true,
            data: {
                invoiceData: validatedData,
                gstReturnJson: gstReturn,
                summary: generateInvoiceSummary(validatedData)
            },
            message: 'GST return JSON generated successfully',
            actions: [{
                type: 'json_generated',
                payload: {
                    jsonData: gstReturn,
                    downloadable: true
                }
            }]
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: `Failed to generate GST JSON: ${error.message}`
        };
    }
}

/**
 * Clean and parse AI-generated JSON response
 * @param {object} params - JSON cleaning parameters
 * @returns {object} - Cleaned JSON result
 */
async function cleanAndParseJSON(params) {
    const { rawResponse, expectedSchema } = params;

    try {
        // Clean the AI response
        const cleanedResponse = cleanAIResponse(rawResponse);

        // Parse the JSON
        const parsedData = safeJsonParse(cleanedResponse);

        if (!parsedData) {
            throw new Error('Failed to parse JSON from AI response');
        }

        // Validate against schema if provided
        let isValid = true;
        if (expectedSchema) {
            isValid = validateJsonSchema(parsedData, expectedSchema);
        }

        return {
            success: true,
            data: {
                originalResponse: rawResponse,
                cleanedResponse: cleanedResponse,
                parsedData: parsedData,
                isValid: isValid
            },
            message: 'JSON cleaned and parsed successfully'
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: `Failed to clean and parse JSON: ${error.message}`
        };
    }
}

/**
 * Validate invoice data structure
 * @param {object} params - Validation parameters
 * @returns {object} - Validation result
 */
async function validateInvoiceData(params) {
    const { invoiceData } = params;

    try {
        const requiredFields = {
            supplier: ['gstin', 'legalName', 'state', 'stateCode'],
            recipient: ['gstin', 'legalName', 'state', 'stateCode'],
            invoice: ['number', 'date', 'totalValue'],
            items: ['description', 'taxableValue', 'taxRate']
        };

        const validationErrors = [];
        const validationWarnings = [];

        // Check main sections
        for (const [section, fields] of Object.entries(requiredFields)) {
            if (!invoiceData[section]) {
                validationErrors.push(`Missing ${section} section`);
                continue;
            }

            if (section === 'items') {
                if (!Array.isArray(invoiceData[section]) || invoiceData[section].length === 0) {
                    validationErrors.push('Items section must be a non-empty array');
                    continue;
                }

                // Validate each item
                invoiceData[section].forEach((item, index) => {
                    fields.forEach(field => {
                        if (!item[field] && item[field] !== 0) {
                            validationWarnings.push(`Item ${index + 1}: Missing ${field}`);
                        }
                    });
                });
            } else {
                // Validate section fields
                fields.forEach(field => {
                    if (!invoiceData[section][field] && invoiceData[section][field] !== 0) {
                        validationErrors.push(`${section}: Missing ${field}`);
                    }
                });
            }
        }

        // Validate GSTINs
        if (invoiceData.supplier?.gstin && !validateGSTIN(invoiceData.supplier.gstin)) {
            validationErrors.push('Invalid supplier GSTIN format');
        }
        if (invoiceData.recipient?.gstin && !validateGSTIN(invoiceData.recipient.gstin)) {
            validationErrors.push('Invalid recipient GSTIN format');
        }

        const isValid = validationErrors.length === 0;

        return {
            success: true,
            data: {
                isValid: isValid,
                errors: validationErrors,
                warnings: validationWarnings,
                summary: {
                    totalErrors: validationErrors.length,
                    totalWarnings: validationWarnings.length,
                    itemCount: invoiceData.items?.length || 0
                }
            },
            message: isValid ? 'Invoice data is valid' : `Found ${validationErrors.length} validation errors`
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: `Validation failed: ${error.message}`
        };
    }
}

/**
 * Generate GSTR-1 JSON from multiple invoices
 * @param {object} params - GSTR-1 generation parameters
 * @returns {object} - GSTR-1 JSON result
 */
async function generateGSTR1JSON(params) {
    const { gstin, filingPeriod, invoices } = params;

    try {
        if (!gstin || !validateGSTIN(gstin)) {
            throw new Error('Valid GSTIN is required');
        }

        if (!invoices || !Array.isArray(invoices) || invoices.length === 0) {
            throw new Error('At least one invoice is required');
        }

        // Generate GSTR-1 JSON
        const gstr1Json = generateGstr1Json({
            gstin: gstin,
            fp: filingPeriod || generateFilingPeriod(),
            invoices: invoices
        });

        return {
            success: true,
            data: {
                gstr1Json: gstr1Json,
                summary: {
                    gstin: gstin,
                    filingPeriod: filingPeriod,
                    invoiceCount: invoices.length,
                    totalValue: invoices.reduce((sum, inv) => sum + (inv.totalValue || 0), 0)
                }
            },
            message: `GSTR-1 JSON generated for ${invoices.length} invoices`,
            actions: [{
                type: 'gstr1_generated',
                payload: {
                    jsonData: gstr1Json,
                    downloadable: true
                }
            }]
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: `Failed to generate GSTR-1 JSON: ${error.message}`
        };
    }
}

/**
 * Format JSON for display or download
 * @param {object} params - Formatting parameters
 * @returns {object} - Formatted JSON result
 */
async function formatJSONForDisplay(params) {
    const { data, indent = 2, format = 'pretty' } = params;

    try {
        let formattedJson;

        switch (format) {
            case 'compact':
                formattedJson = JSON.stringify(data);
                break;
            case 'pretty':
            default:
                formattedJson = formatJson(data, indent);
                break;
        }

        return {
            success: true,
            data: {
                originalData: data,
                formattedJson: formattedJson,
                format: format,
                size: formattedJson.length
            },
            message: `JSON formatted in ${format} format`
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: `Failed to format JSON: ${error.message}`
        };
    }
}

/**
 * Helper function to validate and enhance invoice data
 * @param {object} invoiceData - Raw invoice data
 * @returns {object} - Enhanced invoice data
 */
function validateAndEnhanceInvoiceData(invoiceData) {
    const enhanced = { ...invoiceData };

    // Format date
    if (enhanced.invoice?.date) {
        try {
            const dateObj = new Date(enhanced.invoice.date);
            enhanced.invoice.date = formatGSTDate(dateObj);
        } catch (e) {
            console.warn('Could not format date:', enhanced.invoice.date);
        }
    }

    // Calculate missing tax amounts
    if (enhanced.items) {
        enhanced.items = enhanced.items.map(item => {
            const isIGST = isInterStateTransaction(
                enhanced.supplier?.stateCode,
                enhanced.recipient?.stateCode
            );

            const gstAmounts = calculateGST(item.taxableValue, item.taxRate, isIGST);

            return {
                ...item,
                cgst: item.cgst || gstAmounts.cgst,
                sgst: item.sgst || gstAmounts.sgst,
                igst: item.igst || gstAmounts.igst,
                totalTax: item.totalTax || gstAmounts.totalTax
            };
        });
    }

    return enhanced;
}

/**
 * Helper function to generate GST return format
 * @param {object} invoiceData - Validated invoice data
 * @param {string} gstin - Override GSTIN
 * @param {string} filingPeriod - Override filing period
 * @returns {object} - GST return JSON
 */
function generateGSTReturnFormat(invoiceData, gstin, filingPeriod) {
    const { supplier, recipient, invoice, items } = invoiceData;

    const builder = new GstJsonBuilder(
        gstin || supplier.gstin,
        filingPeriod || generateFilingPeriod()
    );

    builder.addInvoice(recipient.gstin, invoice, items);

    return builder.build();
}

/**
 * Helper function to generate invoice summary
 * @param {object} invoiceData - Invoice data
 * @returns {object} - Summary information
 */
function generateInvoiceSummary(invoiceData) {
    const { supplier, recipient, invoice, items } = invoiceData;

    const totalTaxableValue = items.reduce((sum, item) => sum + item.taxableValue, 0);
    const totalTax = items.reduce((sum, item) => sum + item.totalTax, 0);

    return {
        invoiceNumber: invoice.number,
        invoiceDate: invoice.date,
        supplierGSTIN: supplier.gstin,
        recipientGSTIN: recipient.gstin,
        itemCount: items.length,
        totalTaxableValue: totalTaxableValue,
        totalTaxAmount: totalTax,
        totalInvoiceValue: totalTaxableValue + totalTax,
        isInterState: isInterStateTransaction(supplier.stateCode, recipient.stateCode)
    };
}

module.exports = {
    generateGSTReturnJSON,
    cleanAndParseJSON,
    validateInvoiceData,
    generateGSTR1JSON,
    formatJSONForDisplay
};
/**
 * GST Calculator Tool
 * Provides GST calculation capabilities as a tool for AI agents
 */

const { calculateGST, isInterStateTransaction, validateGSTIN, getStateCode } = require('../modules/gstHelper');

/**
 * Calculate GST amounts for given parameters
 * @param {object} params - Calculation parameters
 * @returns {object} - Calculation result
 */
async function calculateGSTAmounts(params) {
    const { taxableValue, gstRate, supplierState, recipientState, isInterState } = params;

    try {
        // Validate inputs
        if (!taxableValue || !gstRate) {
            throw new Error('Taxable value and GST rate are required');
        }

        if (taxableValue <= 0) {
            throw new Error('Taxable value must be greater than 0');
        }

        if (![0, 5, 12, 18, 28].includes(gstRate)) {
            throw new Error('GST rate must be 0%, 5%, 12%, 18%, or 28%');
        }

        // Determine if inter-state transaction
        let isInterStateTransaction = isInterState;
        if (supplierState && recipientState) {
            isInterStateTransaction = supplierState !== recipientState;
        }

        // Calculate GST
        const gstAmounts = calculateGST(taxableValue, gstRate, isInterStateTransaction);
        const totalAmount = taxableValue + gstAmounts.totalTax;

        return {
            success: true,
            data: {
                taxableValue: taxableValue,
                gstRate: gstRate,
                isInterState: isInterStateTransaction,
                cgst: gstAmounts.cgst,
                sgst: gstAmounts.sgst,
                igst: gstAmounts.igst,
                totalGst: gstAmounts.totalTax,
                totalAmount: totalAmount
            },
            message: `GST calculated successfully: ₹${gstAmounts.totalTax.toLocaleString('en-IN')} tax on ₹${taxableValue.toLocaleString('en-IN')}`
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: `Failed to calculate GST: ${error.message}`
        };
    }
}

/**
 * Validate GSTIN format
 * @param {object} params - Validation parameters
 * @returns {object} - Validation result
 */
async function validateGSTINFormat(params) {
    const { gstin } = params;

    try {
        if (!gstin) {
            throw new Error('GSTIN is required');
        }

        const isValid = validateGSTIN(gstin);
        const stateCode = isValid ? gstin.substring(0, 2) : null;
        const stateName = stateCode ? getStateCode(stateCode) : null;

        return {
            success: true,
            data: {
                gstin: gstin,
                isValid: isValid,
                stateCode: stateCode,
                stateName: stateName
            },
            message: isValid ? `Valid GSTIN from ${stateName || 'Unknown State'}` : 'Invalid GSTIN format'
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: `GSTIN validation failed: ${error.message}`
        };
    }
}

/**
 * Get GST rate information for HSN/SAC codes
 * @param {object} params - Rate lookup parameters
 * @returns {object} - Rate information
 */
async function getGSTRateInfo(params) {
    const { hsnCode, description } = params;

    // This is a simplified implementation - in production, you'd have a comprehensive HSN database
    const commonRates = {
        // Food items
        '1001': { rate: 0, description: 'Wheat', category: 'Food grains' },
        '1006': { rate: 0, description: 'Rice', category: 'Food grains' },
        '0401': { rate: 0, description: 'Milk', category: 'Dairy' },

        // Medicines
        '3004': { rate: 5, description: 'Medicines', category: 'Healthcare' },

        // Textiles
        '5208': { rate: 12, description: 'Cotton fabrics', category: 'Textiles' },

        // Electronics
        '8517': { rate: 18, description: 'Mobile phones', category: 'Electronics' },

        // Automobiles
        '8703': { rate: 28, description: 'Motor cars', category: 'Automobiles' }
    };

    try {
        let rateInfo = null;

        if (hsnCode && commonRates[hsnCode]) {
            rateInfo = commonRates[hsnCode];
        } else if (description) {
            // Simple keyword matching
            const desc = description.toLowerCase();
            for (const [code, info] of Object.entries(commonRates)) {
                if (info.description.toLowerCase().includes(desc) || desc.includes(info.description.toLowerCase())) {
                    rateInfo = { ...info, hsnCode: code };
                    break;
                }
            }
        }

        if (rateInfo) {
            return {
                success: true,
                data: rateInfo,
                message: `GST rate for ${rateInfo.description}: ${rateInfo.rate}%`
            };
        } else {
            return {
                success: false,
                message: 'GST rate information not found. Please check HSN/SAC code or provide more details.',
                data: {
                    commonRates: [
                        '0% - Essential items (food grains, milk)',
                        '5% - Medicines, processed foods',
                        '12% - Textiles, chemicals',
                        '18% - Most goods and services',
                        '28% - Luxury items, automobiles'
                    ]
                }
            };
        }

    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: `Failed to get GST rate info: ${error.message}`
        };
    }
}

module.exports = {
    calculateGSTAmounts,
    validateGSTINFormat,
    getGSTRateInfo
};
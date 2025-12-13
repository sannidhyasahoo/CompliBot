/**
 * SMS Filing Tool
 * Provides SMS filing capabilities as a tool for AI agents
 */

const smsHelper = require('../modules/smsHelper');
const smsHelperAPI = require('../modules/smsHelperAPI');

/**
 * Generate NIL return SMS for GSTR-3B
 * @param {object} params - SMS generation parameters
 * @returns {object} - SMS generation result
 */
async function generateNILReturnSMS(params) {
    const { gstin, period, returnType = 'GSTR-3B', isQuarterly = false } = params;

    try {
        // Validate GSTIN
        if (!smsHelper.validateGSTIN(gstin)) {
            throw new Error('Invalid GSTIN format. Please provide a valid 15-digit GSTIN.');
        }

        // Create complete SMS filing
        const filing = await smsHelperAPI.createCompleteSMSFiling(gstin, period, returnType, isQuarterly);

        return {
            success: true,
            data: filing,
            message: `SMS filing prepared for ${returnType} - ${period}`,
            actions: [{
                type: 'sms_ready',
                payload: {
                    smsBody: filing.step1.smsBody,
                    shortUrl: filing.shortUrl,
                    deepLinks: filing.step1.deepLinks
                }
            }]
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: `Failed to generate SMS filing: ${error.message}`
        };
    }
}

/**
 * Generate confirmation SMS for verification code
 * @param {object} params - Confirmation parameters
 * @returns {object} - Confirmation SMS result
 */
async function generateConfirmationSMS(params) {
    const { verificationCode, returnType = 'GSTR-3B' } = params;

    try {
        // Validate verification code
        if (!verificationCode || !/^\d{6}$/.test(verificationCode.toString())) {
            throw new Error('Verification code must be exactly 6 digits');
        }

        // Create confirmation SMS
        const confirmation = await smsHelperAPI.createConfirmationSMS(verificationCode, returnType);

        return {
            success: true,
            data: confirmation,
            message: `Confirmation SMS ready for code: ${verificationCode}`,
            actions: [{
                type: 'confirmation_ready',
                payload: {
                    smsBody: confirmation.smsBody,
                    shortUrl: confirmation.shortUrl,
                    deepLinks: confirmation.deepLinks
                }
            }]
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: `Failed to generate confirmation SMS: ${error.message}`
        };
    }
}

/**
 * Check SMS filing eligibility
 * @param {object} params - Eligibility check parameters
 * @returns {object} - Eligibility result
 */
async function checkSMSEligibility(params) {
    const { gstin, returnType = 'GSTR-3B' } = params;

    try {
        // Validate GSTIN
        if (gstin && !smsHelper.validateGSTIN(gstin)) {
            throw new Error('Invalid GSTIN format');
        }

        // Get eligibility requirements
        const eligibility = smsHelper.getEligibilityRequirements(returnType);

        return {
            success: true,
            data: eligibility,
            message: `SMS filing eligibility requirements for ${returnType}`,
            actions: [{
                type: 'eligibility_info',
                payload: {
                    returnType: returnType,
                    requirements: eligibility.required,
                    warnings: eligibility.warnings
                }
            }]
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: `Failed to check eligibility: ${error.message}`
        };
    }
}

/**
 * Format period for different return types
 * @param {object} params - Period formatting parameters
 * @returns {object} - Formatted period result
 */
async function formatFilingPeriod(params) {
    const { period, returnType = 'GSTR-3B', isQuarterly = false } = params;

    try {
        let formattedPeriod;

        if (returnType === 'GSTR-1') {
            formattedPeriod = smsHelper.formatGSTR1Period(period, isQuarterly);
        } else {
            formattedPeriod = smsHelper.formatMonth(period);
        }

        return {
            success: true,
            data: {
                originalPeriod: period,
                formattedPeriod: formattedPeriod,
                returnType: returnType,
                isQuarterly: isQuarterly
            },
            message: `Period formatted: ${period} → ${formattedPeriod}`
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: `Failed to format period: ${error.message}`
        };
    }
}

/**
 * Generate help SMS for GST portal
 * @param {object} params - Help SMS parameters
 * @returns {object} - Help SMS result
 */
async function generateHelpSMS(params) {
    const { returnType = 'GSTR-3B' } = params;

    try {
        const helpSMS = smsHelper.generateHelpSMS(returnType);

        return {
            success: true,
            data: {
                smsBody: helpSMS,
                recipient: '14409',
                returnType: returnType
            },
            message: `Help SMS generated for ${returnType}`,
            actions: [{
                type: 'help_sms',
                payload: {
                    smsBody: helpSMS,
                    deepLink: `sms:14409?body=${encodeURIComponent(helpSMS)}`
                }
            }]
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: `Failed to generate help SMS: ${error.message}`
        };
    }
}

module.exports = {
    generateNILReturnSMS,
    generateConfirmationSMS,
    checkSMSEligibility,
    formatFilingPeriod,
    generateHelpSMS
};
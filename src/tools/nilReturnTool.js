/**
 * NIL Return Tool
 * Generates clickable SMS links for easy GST NIL return filing
 */

const smsHelperAPI = require('../modules/smsHelperAPI');
const { getUser } = require('../db/index');
const { validateGSTIN, getStateName } = require('../modules/gstHelper');

/**
 * Generate NIL return SMS link for user
 * @param {object} params - NIL return parameters
 * @returns {object} - NIL return result with clickable links
 */
async function generateNILReturnLink(params) {
    const {
        gstin,
        period,
        returnType = 'GSTR-3B',
        isQuarterly = false,
        chatId = null
    } = params;

    try {
        // Validate GSTIN
        if (!validateGSTIN(gstin)) {
            throw new Error('Invalid GSTIN format. Please provide a valid 15-digit GSTIN.');
        }

        // Get user info if chatId provided
        let userInfo = null;
        if (chatId) {
            userInfo = await getUser(chatId);
        }

        // Create complete SMS filing
        const filing = await smsHelperAPI.createCompleteSMSFiling(gstin, period, returnType, isQuarterly);

        // Extract state info from GSTIN
        const stateCode = gstin.substring(0, 2);
        const stateName = getStateName(stateCode);

        // Format period for display
        const displayPeriod = formatPeriodForDisplay(period, returnType, isQuarterly);

        // Generate user-friendly response
        const response = {
            success: true,
            data: {
                filing: filing,
                taxpayer: {
                    gstin: gstin.toUpperCase(),
                    stateCode: stateCode,
                    stateName: stateName,
                    tradeName: userInfo?.trade_name || 'Your Business'
                },
                period: {
                    original: period,
                    formatted: filing.period || filing.month,
                    display: displayPeriod,
                    returnType: returnType,
                    isQuarterly: isQuarterly
                },
                links: {
                    primary: filing.shortUrl, // Main clickable link
                    fallback: filing.deepLinks.primary,
                    telegram: filing.deepLinks.telegram
                },
                steps: {
                    step1: filing.step1,
                    step2: filing.step2
                },
                eligibility: filing.eligibility
            },
            message: `NIL return SMS link generated for ${returnType} - ${displayPeriod}`,
            actions: [{
                type: 'nil_return_ready',
                payload: {
                    gstin: gstin,
                    period: period,
                    returnType: returnType,
                    smsLink: filing.shortUrl || filing.deepLinks.primary,
                    smsBody: filing.smsBody
                }
            }]
        };

        return response;

    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: `Failed to generate NIL return link: ${error.message}`
        };
    }
}

/**
 * Generate confirmation SMS link
 * @param {object} params - Confirmation parameters
 * @returns {object} - Confirmation SMS result
 */
async function generateConfirmationLink(params) {
    const {
        verificationCode,
        returnType = 'GSTR-3B',
        chatId = null
    } = params;

    try {
        // Validate verification code
        if (!verificationCode || !/^\d{6}$/.test(verificationCode.toString())) {
            throw new Error('Verification code must be exactly 6 digits');
        }

        // Create confirmation SMS
        const confirmation = await smsHelperAPI.createConfirmationSMS(verificationCode, returnType);

        // Get user info if available
        let userInfo = null;
        if (chatId) {
            userInfo = await getUser(chatId);
        }

        return {
            success: true,
            data: {
                confirmation: confirmation,
                taxpayer: {
                    gstin: userInfo?.gstin || 'Your GSTIN',
                    tradeName: userInfo?.trade_name || 'Your Business'
                },
                links: {
                    primary: confirmation.shortUrl,
                    fallback: confirmation.deepLinks.primary
                }
            },
            message: `Confirmation SMS ready for code: ${verificationCode}`,
            actions: [{
                type: 'confirmation_ready',
                payload: {
                    verificationCode: verificationCode,
                    returnType: returnType,
                    smsLink: confirmation.shortUrl || confirmation.deepLinks.primary,
                    smsBody: confirmation.smsBody
                }
            }]
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: `Failed to generate confirmation link: ${error.message}`
        };
    }
}

/**
 * Generate quick NIL return for current month
 * @param {object} params - Quick NIL parameters
 * @returns {object} - Quick NIL return result
 */
async function generateQuickNIL(params) {
    const {
        chatId,
        returnType = 'GSTR-3B',
        monthOffset = 0 // 0 = current month, -1 = last month, etc.
    } = params;

    try {
        // Get user info
        const userInfo = await getUser(chatId);
        if (!userInfo) {
            throw new Error('User not registered. Please use /start to register first.');
        }

        // Calculate period
        const currentDate = new Date();
        currentDate.setMonth(currentDate.getMonth() + monthOffset);
        const period = String(currentDate.getMonth() + 1).padStart(2, '0') + currentDate.getFullYear();

        // Generate NIL return
        const result = await generateNILReturnLink({
            gstin: userInfo.gstin,
            period: period,
            returnType: returnType,
            chatId: chatId
        });

        if (result.success) {
            result.message = `Quick NIL return generated for ${getMonthName(currentDate)} ${currentDate.getFullYear()}`;
            result.data.isQuickNIL = true;
        }

        return result;

    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: `Failed to generate quick NIL return: ${error.message}`
        };
    }
}

/**
 * Get NIL return status and help
 * @param {object} params - Status parameters
 * @returns {object} - Status and help information
 */
async function getNILReturnHelp(params) {
    const {
        returnType = 'GSTR-3B',
        chatId = null
    } = params;

    try {
        // Get user info if available
        let userInfo = null;
        if (chatId) {
            userInfo = await getUser(chatId);
        }

        // Get eligibility requirements
        const eligibility = smsHelperAPI.getEligibilityRequirements(returnType);

        // Generate help SMS
        const helpSMS = smsHelperAPI.generateHelpSMS(returnType);

        return {
            success: true,
            data: {
                returnType: returnType,
                eligibility: eligibility,
                helpSMS: helpSMS,
                taxpayer: userInfo ? {
                    gstin: userInfo.gstin,
                    tradeName: userInfo.trade_name,
                    stateCode: userInfo.state_code
                } : null,
                instructions: [
                    '📱 NIL Return Filing via SMS',
                    '',
                    '1️⃣ Click the SMS link provided',
                    '2️⃣ Your SMS app opens with pre-filled message',
                    '3️⃣ Review and send the SMS to 14409',
                    '4️⃣ Wait for 6-digit verification code',
                    '5️⃣ Send confirmation SMS with the code',
                    '',
                    '⚠️ Important:',
                    '• Use registered mobile number only',
                    '• Send exactly as shown',
                    '• Code valid for 30 minutes only'
                ],
                commonIssues: [
                    {
                        issue: 'SMS app not opening',
                        solution: 'Try the fallback link or copy the message manually'
                    },
                    {
                        issue: 'No verification code received',
                        solution: 'Wait 2-3 minutes, check spam, or try again'
                    },
                    {
                        issue: 'Code expired',
                        solution: 'Generate new NIL return SMS and start over'
                    }
                ]
            },
            message: `NIL return help for ${returnType}`,
            actions: [{
                type: 'help_provided',
                payload: {
                    returnType: returnType,
                    helpSMS: helpSMS
                }
            }]
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: `Failed to get NIL return help: ${error.message}`
        };
    }
}

/**
 * Validate NIL return eligibility
 * @param {object} params - Validation parameters
 * @returns {object} - Validation result
 */
async function validateNILEligibility(params) {
    const {
        gstin,
        returnType = 'GSTR-3B',
        chatId = null
    } = params;

    try {
        // Validate GSTIN
        if (!validateGSTIN(gstin)) {
            throw new Error('Invalid GSTIN format');
        }

        // Get eligibility requirements
        const eligibility = smsHelperAPI.getEligibilityRequirements(returnType);

        // Get user info if available
        let userInfo = null;
        if (chatId) {
            userInfo = await getUser(chatId);
        }

        // Check basic eligibility
        const checks = {
            gstinValid: validateGSTIN(gstin),
            returnTypeSupported: ['GSTR-3B', 'GSTR-1'].includes(returnType),
            userRegistered: !!userInfo
        };

        const isEligible = Object.values(checks).every(check => check);

        return {
            success: true,
            data: {
                gstin: gstin,
                returnType: returnType,
                isEligible: isEligible,
                checks: checks,
                eligibility: eligibility,
                warnings: eligibility.warnings || [],
                requirements: eligibility.required || []
            },
            message: isEligible
                ? `✅ Eligible for ${returnType} NIL return filing via SMS`
                : `❌ Not eligible for ${returnType} NIL return filing`,
            actions: [{
                type: 'eligibility_checked',
                payload: {
                    gstin: gstin,
                    returnType: returnType,
                    isEligible: isEligible,
                    checks: checks
                }
            }]
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: `Failed to validate eligibility: ${error.message}`
        };
    }
}

// Helper functions

/**
 * Format period for user-friendly display
 */
function formatPeriodForDisplay(period, returnType, isQuarterly) {
    try {
        let month, year;

        if (period.length === 6) { // MMYYYY format
            month = parseInt(period.substring(0, 2));
            year = parseInt(period.substring(2));
        } else if (period.length === 7 && period.includes('-')) { // YYYY-MM format
            const parts = period.split('-');
            year = parseInt(parts[0]);
            month = parseInt(parts[1]);
        } else {
            return period; // Return as-is if format not recognized
        }

        const monthName = getMonthName(new Date(year, month - 1));

        if (returnType === 'GSTR-1' && isQuarterly) {
            const quarter = Math.ceil(month / 3);
            return `Q${quarter} ${year} (${monthName})`;
        }

        return `${monthName} ${year}`;
    } catch (error) {
        return period;
    }
}

/**
 * Get month name from date
 */
function getMonthName(date) {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[date.getMonth()];
}

module.exports = {
    generateNILReturnLink,
    generateConfirmationLink,
    generateQuickNIL,
    getNILReturnHelp,
    validateNILEligibility
};
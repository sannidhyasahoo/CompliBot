/**
 * OTP Tool
 * Provides OTP generation and verification capabilities as a tool for AI agents
 */

// Import OTP helper functions (handle both ES modules and CommonJS)
let otpHelper;
try {
    // Try ES module import
    otpHelper = require('../modules/otpHelper');
} catch (error) {
    // Fallback to dynamic import for ES modules
    console.warn('OTP helper not available in CommonJS format');
}

/**
 * Generate OTP for GSTIN
 * @param {object} params - OTP generation parameters
 * @returns {object} - OTP generation result
 */
async function generateOTP(params) {
    const { gstin } = params;

    try {
        if (!otpHelper) {
            throw new Error('OTP service not available');
        }

        if (!gstin) {
            throw new Error('GSTIN is required for OTP generation');
        }

        // Generate OTP using the helper
        const otp = otpHelper.generateOTP(gstin);

        return {
            success: true,
            data: {
                gstin: gstin,
                otp: otp,
                expiresIn: '5 minutes',
                generatedAt: new Date().toISOString()
            },
            message: `OTP generated successfully for GSTIN: ${gstin}`,
            actions: [{
                type: 'otp_generated',
                payload: {
                    gstin: gstin,
                    otp: otp,
                    masked: `${otp.substring(0, 2)}****`
                }
            }]
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: `Failed to generate OTP: ${error.message}`
        };
    }
}

/**
 * Verify OTP for GSTIN
 * @param {object} params - OTP verification parameters
 * @returns {object} - OTP verification result
 */
async function verifyOTP(params) {
    const { gstin, otp } = params;

    try {
        if (!otpHelper) {
            throw new Error('OTP service not available');
        }

        if (!gstin || !otp) {
            throw new Error('GSTIN and OTP are required for verification');
        }

        // Verify OTP using the helper
        const isValid = otpHelper.verifyOTP(gstin, otp);

        return {
            success: true,
            data: {
                gstin: gstin,
                otp: otp,
                isValid: isValid,
                verifiedAt: isValid ? new Date().toISOString() : null
            },
            message: isValid ? 'OTP verified successfully' : 'Invalid or expired OTP',
            actions: [{
                type: 'otp_verified',
                payload: {
                    gstin: gstin,
                    isValid: isValid,
                    nextStep: isValid ? 'proceed_with_action' : 'regenerate_otp'
                }
            }]
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: `Failed to verify OTP: ${error.message}`
        };
    }
}

/**
 * Check OTP status for GSTIN
 * @param {object} params - OTP status parameters
 * @returns {object} - OTP status result
 */
async function checkOTPStatus(params) {
    const { gstin } = params;

    try {
        if (!otpHelper) {
            throw new Error('OTP service not available');
        }

        if (!gstin) {
            throw new Error('GSTIN is required to check OTP status');
        }

        // This is a simplified implementation - in a real system, you'd check the OTP store
        // For now, we'll return a generic status
        return {
            success: true,
            data: {
                gstin: gstin,
                hasActiveOTP: false, // Would check actual OTP store
                lastGenerated: null,
                attemptsRemaining: 3
            },
            message: 'OTP status checked',
            actions: [{
                type: 'otp_status',
                payload: {
                    gstin: gstin,
                    canGenerate: true,
                    canVerify: false
                }
            }]
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: `Failed to check OTP status: ${error.message}`
        };
    }
}

/**
 * Resend OTP for GSTIN
 * @param {object} params - OTP resend parameters
 * @returns {object} - OTP resend result
 */
async function resendOTP(params) {
    const { gstin } = params;

    try {
        if (!otpHelper) {
            throw new Error('OTP service not available');
        }

        if (!gstin) {
            throw new Error('GSTIN is required to resend OTP');
        }

        // Generate new OTP (this will overwrite any existing OTP)
        const otp = otpHelper.generateOTP(gstin);

        return {
            success: true,
            data: {
                gstin: gstin,
                otp: otp,
                expiresIn: '5 minutes',
                resentAt: new Date().toISOString()
            },
            message: `OTP resent successfully for GSTIN: ${gstin}`,
            actions: [{
                type: 'otp_resent',
                payload: {
                    gstin: gstin,
                    otp: otp,
                    masked: `${otp.substring(0, 2)}****`
                }
            }]
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: `Failed to resend OTP: ${error.message}`
        };
    }
}

/**
 * Validate GSTIN format for OTP operations
 * @param {object} params - GSTIN validation parameters
 * @returns {object} - Validation result
 */
async function validateGSTINForOTP(params) {
    const { gstin } = params;

    try {
        if (!otpHelper) {
            throw new Error('OTP service not available');
        }

        if (!gstin) {
            throw new Error('GSTIN is required for validation');
        }

        // Validate GSTIN format
        const isValid = otpHelper.validateGSTIN(gstin);

        return {
            success: true,
            data: {
                gstin: gstin,
                isValid: isValid,
                canGenerateOTP: isValid
            },
            message: isValid ? 'GSTIN is valid for OTP operations' : 'Invalid GSTIN format',
            actions: [{
                type: 'gstin_validated',
                payload: {
                    gstin: gstin,
                    isValid: isValid,
                    nextStep: isValid ? 'can_generate_otp' : 'fix_gstin_format'
                }
            }]
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: `Failed to validate GSTIN: ${error.message}`
        };
    }
}

module.exports = {
    generateOTP,
    verifyOTP,
    checkOTPStatus,
    resendOTP,
    validateGSTINForOTP
};
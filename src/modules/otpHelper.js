import crypto from 'crypto';

// In-Memory Storage: { "29ABCDE1234F1Z5": { code: "123456", expires: 1731456000000 } }
const otpStore = new Map();

/**
 * Generate and Store OTP
 * @param {string} gstin - The user's unique GSTIN
 * @returns {string} The 6-digit OTP
 */
export const generateOTP = (gstin) => {
    // 1. Generate 6-digit code
    const otp = crypto.randomInt(100000, 999999).toString();

    // 2. Set Expiry (5 Minutes from now)
    const expires = Date.now() + 5 * 60 * 1000;

    // 3. Store in Memory
    otpStore.set(gstin, { code: otp, expires });

    return otp;
};

/**
 * Verify OTP
 * @param {string} gstin 
 * @param {string} inputOtp 
 * @returns {boolean} True if valid
 */
export const verifyOTP = (gstin, inputOtp) => {
    const record = otpStore.get(gstin);

    // Check 1: Does record exist?
    if (!record) return false;

    // Check 2: Is it expired?
    if (Date.now() > record.expires) {
        otpStore.delete(gstin); // Clean up
        return false;
    }

    // Check 3: Does code match?
    if (record.code === inputOtp) {
        otpStore.delete(gstin); // Clean up (One-time use)
        return true;
    }

    return false;
};
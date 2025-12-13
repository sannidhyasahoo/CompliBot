import crypto from 'crypto';

// In-Memory Storage: { "29ABCDE1234F1Z5": { code: "123456", expires: 1731456000000 } }
const otpStore = new Map();

/**
 * Validate GSTIN format
 * @param {string} gstin - The GSTIN to validate
 * @returns {boolean} True if valid GSTIN format
 */
export const validateGSTIN = (gstin) => {
    if (!gstin || typeof gstin !== 'string') {
        return false;
    }
    
    // GSTIN format: 15 characters - 2 digits (state code) + 10 alphanumeric (PAN) + 1 digit (entity number) + 1 letter (Z) + 1 alphanumeric (checksum)
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/;
    return gstinRegex.test(gstin);
};

/**
 * Generate and Store OTP
 * @param {string} gstin - The user's unique GSTIN
 * @returns {string} The 6-digit OTP
 * @throws {Error} If GSTIN format is invalid
 */
export const generateOTP = (gstin) => {
    // Validate GSTIN format first
    if (!validateGSTIN(gstin)) {
        throw new Error('Invalid GSTIN format');
    }

    // 1. Generate 6-digit code - ensure it's always exactly 6 digits
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 2. Set Expiry (5 Minutes from now)
    const expires = Date.now() + 5 * 60 * 1000;

    // 3. Store in Memory
    otpStore.set(gstin, { code: otp, expires });

    console.log(`🔐 OTP generated for ${gstin}: ${otp} (expires in 5 minutes)`);
    return otp;
};

/**
 * Verify OTP
 * @param {string} gstin 
 * @param {string} inputOtp 
 * @returns {boolean} True if valid
 */
export const verifyOTP = (gstin, inputOtp) => {
    console.log(`🔍 Verifying OTP for ${gstin}: ${inputOtp}`);
    
    const record = otpStore.get(gstin);

    // Check 1: Does record exist?
    if (!record) {
        console.log(`❌ No OTP record found for ${gstin}`);
        return false;
    }

    // Check 2: Is it expired?
    if (Date.now() > record.expires) {
        console.log(`❌ OTP expired for ${gstin}`);
        otpStore.delete(gstin); // Clean up
        return false;
    }

    // Check 3: Does code match?
    if (record.code === inputOtp.toString()) {
        console.log(`✅ OTP verified successfully for ${gstin}`);
        otpStore.delete(gstin); // Clean up (One-time use)
        return true;
    }

    console.log(`❌ OTP mismatch for ${gstin}. Expected: ${record.code}, Got: ${inputOtp}`);
    return false;
};
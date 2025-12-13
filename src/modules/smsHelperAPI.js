/**
 * SMS API Integration Module
 * Integrates with SMS Deep Link API at https://sms-link-generator.vercel.app
 * Solves the problem of SMS deep links not working in Telegram/WhatsApp
 */

import * as smsHelper from './smsHelper.js';

// SMS Deep Link API Configuration
const SMS_API_BASE_URL = 'https://sms-link-generator.vercel.app';
const SMS_API_GENERATE_ENDPOINT = '/api/sms/generate';
const SMS_API_ANALYTICS_ENDPOINT = '/api/sms/analytics';

/**
 * Generate SMS short link using the API
 * Note: For short codes like 14409, the API might reject the request
 * In that case, we fall back to direct SMS links
 * @param {string} phone - Phone number (e.g., '14409')
 * @param {string} message - SMS message text
 * @returns {Promise<Object>} API response with shortUrl and deepLink
 */
export async function generateSMSShortLink(phone, message) {
    try {
        // For the GST short code 14409, we'll use it directly
        // The API validates phone numbers, but we'll handle the error gracefully
        const response = await fetch(`${SMS_API_BASE_URL}${SMS_API_GENERATE_ENDPOINT}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                phone: phone,  // Use phone as-is (14409)
                message: message
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to generate SMS link');
        }

        // API should return the correct deepLink now since we're passing 14409 directly
        return result.data;
    } catch (error) {
        console.error('Error generating SMS short link:', error.message);
        // Return fallback direct link if API fails (e.g., for short codes)
        // This is expected for 14409 since it's not a standard 10-digit number
        return {
            shortUrl: null,
            deepLink: `sms:${phone}?body=${encodeURIComponent(message)}`,
            error: error.message,
            fallback: true
        };
    }
}

/**
 * Get analytics for a short link
 * @param {string} shortId - Short link identifier
 * @returns {Promise<Object>} Analytics data
 */
export async function getAnalytics(shortId) {
    try {
        const response = await fetch(`${SMS_API_BASE_URL}${SMS_API_ANALYTICS_ENDPOINT}/${shortId}`);
        
        if (!response.ok) {
            throw new Error(`Analytics request failed: ${response.status}`);
        }

        const result = await response.json();
        return result.data;
    } catch (error) {
        console.error('Error fetching analytics:', error.message);
        return null;
    }
}

/**
 * Create GSTR-3B SMS filing with API short URL
 * @param {string} gstin - GSTIN number
 * @param {string} month - Month in YYYY-MM or MMYYYY format
 * @returns {Promise<Object>} Complete SMS filing object with short URL
 */
export async function createSMSFiling(gstin, month) {
    // Validate inputs using original helper
    if (!smsHelper.validateGSTIN(gstin)) {
        throw new Error('Invalid GSTIN format');
    }
    
    const formattedMonth = smsHelper.formatMonth(month);
    const smsBody = smsHelper.generateSMSString(gstin, formattedMonth);
    
    // Generate short link via API
    const apiResult = await generateSMSShortLink('14409', smsBody);
    
    // Get original deep links as fallback
    const originalLinks = smsHelper.generateSMSDeepLink(gstin, formattedMonth);
    
    return {
        type: 'NIL',
        returnType: 'GSTR-3B',
        gstin: gstin.toUpperCase(),
        month: formattedMonth,
        smsBody: smsBody,
        
        // ✅ PRIMARY LINK - Use this in Telegram!
        shortUrl: apiResult.shortUrl,
        shortId: apiResult.shortId,
        
        // Fallback deep links (if API fails)
        deepLinks: {
            primary: apiResult.deepLink || originalLinks.standard,
            fallback: originalLinks.ios,
            ios: originalLinks.ios,
            telegram: apiResult.deepLink || originalLinks.telegram,
            rawText: smsBody,
            displayText: `📱 Tap to send SMS to 14409`,
            recipient: '14409'
        },
        
        description: smsHelper.getSMSDescription(gstin, month),
        
        instructions: [
            '1. Tap the "Send SMS" button below',
            '2. Your SMS app will open with pre-filled message',
            '3. Review the message and tap Send',
            '4. You will receive a 6-digit verification code from 14409',
            '5. Return here and use /confirm command with the code'
        ],
        
        // API status
        apiStatus: {
            available: !apiResult.fallback,
            error: apiResult.error || null
        }
    };
}

/**
 * Create GSTR-1 SMS filing with API short URL
 * @param {string} gstin - GSTIN number
 * @param {string} period - Period in YYYY-MM or MMYYYY format
 * @param {boolean} isQuarterly - Whether this is quarterly filing
 * @returns {Promise<Object>} Complete GSTR-1 filing object with short URL
 */
export async function createGSTR1Filing(gstin, period, isQuarterly = false) {
    // Validate inputs
    if (!smsHelper.validateGSTIN(gstin)) {
        throw new Error('Invalid GSTIN format');
    }
    
    const formattedPeriod = smsHelper.formatGSTR1Period(period, isQuarterly);
    const smsBody = smsHelper.generateGSTR1SMS(gstin, period, isQuarterly);
    
    // Generate short link via API
    const apiResult = await generateSMSShortLink('14409', smsBody);
    
    const encodedBody = encodeURIComponent(smsBody);
    
    return {
        type: 'NIL',
        returnType: 'GSTR-1',
        gstin: gstin.toUpperCase(),
        period: formattedPeriod,
        isQuarterly: isQuarterly,
        smsBody: smsBody,
        
        // ✅ PRIMARY LINK - Use this in Telegram!
        shortUrl: apiResult.shortUrl,
        shortId: apiResult.shortId,
        
        // Fallback deep links
        deepLinks: {
            primary: apiResult.deepLink || `sms:14409?body=${encodedBody}`,
            fallback: `sms:14409&body=${encodedBody}`,
            ios: `sms:14409&body=${encodedBody}`,
            telegram: apiResult.deepLink || `sms:14409?body=${encodedBody}`,
            rawText: smsBody,
            displayText: `📱 Tap to send SMS to 14409`,
            recipient: '14409'
        },
        
        description: `File NIL return for GSTR-1 for period ${formattedPeriod.slice(0,2)}/${formattedPeriod.slice(2)} (${isQuarterly ? 'Quarterly' : 'Monthly'})`,
        
        instructions: [
            '1. Tap the "Send SMS" button below',
            '2. Your SMS app will open with pre-filled message',
            '3. Review the message and tap Send',
            '4. You will receive a 6-digit verification code from 14409',
            '5. Return here and use /confirm command with the code'
        ],
        
        // API status
        apiStatus: {
            available: !apiResult.fallback,
            error: apiResult.error || null
        }
    };
}

/**
 * Create complete two-step SMS filing with API short URLs
 * @param {string} gstin - GSTIN number
 * @param {string} period - Period in YYYY-MM or MMYYYY format
 * @param {string} returnType - 'GSTR-3B' or 'GSTR-1'
 * @param {boolean} isQuarterly - Whether this is quarterly filing (for GSTR-1 only)
 * @returns {Promise<Object>} Complete filing process with both steps
 */
export async function createCompleteSMSFiling(gstin, period, returnType = 'GSTR-3B', isQuarterly = false) {
    // Validate inputs
    if (!smsHelper.validateGSTIN(gstin)) {
        throw new Error('Invalid GSTIN format');
    }
    
    // Determine which function to use
    const filing = returnType === 'GSTR-1' 
        ? await createGSTR1Filing(gstin, period, isQuarterly)
        : await createSMSFiling(gstin, period);
    
    // Get confirmation SMS format
    const confirmFormat = smsHelper.generateConfirmationSMS('123456', returnType);
    const typeCode = returnType === 'GSTR-1' ? 'R1' : '3B';
    
    // Get eligibility requirements
    const eligibility = smsHelper.getEligibilityRequirements(returnType);
    
    return {
        ...filing,
        
        // Step 1: Initial Filing
        step1: {
            smsBody: filing.smsBody,
            shortUrl: filing.shortUrl, // ✅ USE THIS
            deepLinks: filing.deepLinks,
            instructions: filing.instructions,
            important: [
                '⚠️ Use the registered mobile number only',
                '⚠️ Send exactly as shown',
                '⚠️ Wait for verification code SMS'
            ]
        },
        
        // Step 2: Confirmation
        step2: {
            format: `CNF ${typeCode} <6-digit-code>`,
            example: confirmFormat,
            instructions: [
                '1. Wait for 6-digit verification code SMS from 14409',
                '2. Note down the code',
                `3. Send: CNF ${typeCode} <your-code>`,
                '4. Example: ' + confirmFormat,
                '5. Filing will be completed'
            ],
            important: [
                '⏰ Code is valid for 30 minutes only',
                '📱 Send from same number used in Step 1',
                '✅ You will receive final confirmation SMS'
            ]
        },
        
        // Eligibility
        eligibility: eligibility
    };
}

/**
 * Generate confirmation SMS with API short URL
 * @param {string} verificationCode - 6-digit code
 * @param {string} returnType - 'GSTR-3B' or 'GSTR-1'
 * @returns {Promise<Object>} Confirmation SMS with short URL
 */
export async function createConfirmationSMS(verificationCode, returnType = 'GSTR-3B') {
    const smsBody = smsHelper.generateConfirmationSMS(verificationCode, returnType);
    
    // Generate short link via API
    const apiResult = await generateSMSShortLink('14409', smsBody);
    
    return {
        smsBody: smsBody,
        shortUrl: apiResult.shortUrl, // ✅ USE THIS
        shortId: apiResult.shortId,
        deepLinks: {
            primary: apiResult.deepLink || `sms:14409?body=${encodeURIComponent(smsBody)}`,
            rawText: smsBody,
            recipient: '14409'
        },
        apiStatus: {
            available: !apiResult.fallback,
            error: apiResult.error || null
        }
    };
}

// Re-export helper functions for convenience
export {
    validateGSTIN,
    formatMonth,
    generateSMSString,
    generateConfirmationSMS,
    generateHelpSMS,
    formatGSTR1Period,
    generateGSTR1SMS,
    getEligibilityRequirements
} from './smsHelper.js';

export default {
    createSMSFiling,
    createGSTR1Filing,
    createCompleteSMSFiling,
    createConfirmationSMS,
    generateSMSShortLink,
    getAnalytics,
    // Helper functions
    validateGSTIN: smsHelper.validateGSTIN,
    formatMonth: smsHelper.formatMonth,
    formatGSTR1Period: smsHelper.formatGSTR1Period
};

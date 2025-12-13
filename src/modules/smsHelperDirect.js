/**
 * SMS Helper with API Integration
 * Uses sms-link-generator API to create SMS deep links with analytics
 * API now supports short codes like 14409 (updated to accept any phone number length)
 */

import * as smsHelper from './smsHelper.js';

const API_BASE_URL = 'https://sms-link-generator.vercel.app';

/**
 * Generate SMS deep link using API
 * @param {string} phone - Phone number (e.g., '14409')
 * @param {string} message - SMS message text
 * @returns {Promise<Object>} API response with shortUrl, deepLink, and shortId
 */
async function generateSMSLinkViaAPI(phone, message) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/sms/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                phone: phone,
                message: message
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(`API Error: ${errorData.error || response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.success || !data.data) {
            throw new Error('API returned unsuccessful response');
        }
        
        return data.data;
    } catch (error) {
        // Fallback to direct SMS link if API fails
        console.error('API request failed, using fallback:', error.message);
        return {
            deepLink: `sms:${phone}?body=${encodeURIComponent(message)}`,
            shortUrl: null,
            shortId: null,
            fallback: true
        };
    }
}

/**
 * Generate direct SMS link (fallback)
 * @param {string} phone - Phone number (e.g., '14409')
 * @param {string} message - SMS message text
 * @returns {string} SMS deep link
 */
function generateDirectSMSLink(phone, message) {
    return `sms:${phone}?body=${encodeURIComponent(message)}`;
}

/**
 * Create GSTR-3B SMS filing
 * @param {string} gstin - GSTIN number
 * @param {string} month - Month in YYYY-MM or MMYYYY format
 * @returns {Promise<Object>} Complete SMS filing object with API-generated links
 */
export async function createSMSFiling(gstin, month) {
    // Validate inputs using original helper
    if (!smsHelper.validateGSTIN(gstin)) {
        throw new Error('Invalid GSTIN format');
    }
    
    const formattedMonth = smsHelper.formatMonth(month);
    const smsBody = smsHelper.generateSMSString(gstin, formattedMonth);
    
    // Generate SMS link via API (with fallback)
    const apiResponse = await generateSMSLinkViaAPI('14409', smsBody);
    
    // Primary link is from API (shortUrl if available, otherwise deepLink)
    const smsLink = apiResponse.shortUrl || apiResponse.deepLink;
    
    // Get original deep links as reference
    const originalLinks = smsHelper.generateSMSDeepLink(gstin, formattedMonth);
    
    return {
        type: 'NIL',
        returnType: 'GSTR-3B',
        gstin: gstin.toUpperCase(),
        month: formattedMonth,
        smsBody: smsBody,
        
        // API-generated SMS link (with analytics)
        smsLink: smsLink,
        shortUrl: apiResponse.shortUrl,
        deepLink: apiResponse.deepLink,
        shortId: apiResponse.shortId,
        usingFallback: apiResponse.fallback || false,
        
        // Deep links for different platforms
        deepLinks: {
            primary: smsLink,
            direct: apiResponse.deepLink,
            short: apiResponse.shortUrl,
            fallback: originalLinks.ios,
            ios: originalLinks.ios,
            telegram: smsLink,
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
        ]
    };
}

/**
 * Create GSTR-1 SMS filing
 * @param {string} gstin - GSTIN number
 * @param {string} period - Period in YYYY-MM or MMYYYY format
 * @param {boolean} isQuarterly - Whether this is quarterly filing
 * @returns {Promise<Object>} Complete GSTR-1 filing object with API-generated links
 */
export async function createGSTR1Filing(gstin, period, isQuarterly = false) {
    // Validate inputs
    if (!smsHelper.validateGSTIN(gstin)) {
        throw new Error('Invalid GSTIN format');
    }
    
    const formattedPeriod = smsHelper.formatGSTR1Period(period, isQuarterly);
    const smsBody = smsHelper.generateGSTR1SMS(gstin, period, isQuarterly);
    
    // Generate SMS link via API (with fallback)
    const apiResponse = await generateSMSLinkViaAPI('14409', smsBody);
    
    // Primary link is from API (shortUrl if available, otherwise deepLink)
    const smsLink = apiResponse.shortUrl || apiResponse.deepLink;
    
    return {
        type: 'NIL',
        returnType: 'GSTR-1',
        gstin: gstin.toUpperCase(),
        period: formattedPeriod,
        isQuarterly: isQuarterly,
        smsBody: smsBody,
        
        // API-generated SMS link (with analytics)
        smsLink: smsLink,
        shortUrl: apiResponse.shortUrl,
        deepLink: apiResponse.deepLink,
        shortId: apiResponse.shortId,
        usingFallback: apiResponse.fallback || false,
        
        // Deep links
        deepLinks: {
            primary: smsLink,
            direct: apiResponse.deepLink,
            short: apiResponse.shortUrl,
            fallback: `sms:14409&body=${encodeURIComponent(smsBody)}`,
            ios: `sms:14409&body=${encodeURIComponent(smsBody)}`,
            telegram: smsLink,
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
        ]
    };
}

/**
 * Create complete two-step SMS filing
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
    
    // Determine which function to use (await since they're now async)
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
            smsLink: filing.smsLink, // ✅ USE THIS
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
 * Generate confirmation SMS
 * @param {string} verificationCode - 6-digit code
 * @param {string} returnType - 'GSTR-3B' or 'GSTR-1'
 * @returns {Promise<Object>} Confirmation SMS with API-generated links
 */
export async function createConfirmationSMS(verificationCode, returnType = 'GSTR-3B') {
    const smsBody = smsHelper.generateConfirmationSMS(verificationCode, returnType);
    
    // Generate SMS link via API (with fallback)
    const apiResponse = await generateSMSLinkViaAPI('14409', smsBody);
    
    // Primary link is from API (shortUrl if available, otherwise deepLink)
    const smsLink = apiResponse.shortUrl || apiResponse.deepLink;
    
    return {
        smsBody: smsBody,
        smsLink: smsLink, // ✅ USE THIS
        shortUrl: apiResponse.shortUrl,
        deepLink: apiResponse.deepLink,
        shortId: apiResponse.shortId,
        usingFallback: apiResponse.fallback || false,
        deepLinks: {
            primary: smsLink,
            direct: apiResponse.deepLink,
            short: apiResponse.shortUrl,
            rawText: smsBody,
            recipient: '14409'
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
    // Helper functions
    validateGSTIN: smsHelper.validateGSTIN,
    formatMonth: smsHelper.formatMonth,
    formatGSTR1Period: smsHelper.formatGSTR1Period
};

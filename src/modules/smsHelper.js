/**
 * SMS Helper Module for CompliBot
 * Member 2 (SMS Engine)
 * Purpose: Generate GST NIL return SMS strings and deep links for 14409
 * 
 * VERIFIED AGAINST OFFICIAL GST DOCUMENTATION:
 * - https://tutorial.gst.gov.in/userguide/returns/faq_nilreturngstr3b.htm
 * - SMS Format: NIL 3B <GSTIN> <MMYYYY>
 * - Recipient: 14409
 * - Format is case-insensitive
 * - Two-step process: Initial SMS → Verification Code → Confirmation SMS
 */

/**
 * Validates GSTIN format
 * Format: 2 digits (state) + 10 alphanumeric (PAN) + 1 digit (entity) + 1 alphabet (Z) + 1 checksum
 * Example: 29ABCDE1234F1Z5
 */
export function validateGSTIN(gstin) {
    if (!gstin) return false;
    
    // Remove spaces and convert to uppercase
    gstin = gstin.replace(/\s+/g, '').trim().toUpperCase();
    
    // GSTIN must be 15 characters
    if (gstin.length !== 15) return false;
    
    // Pattern: 2 digits + 10 alphanumeric + 1 digit + 1 letter + 1 alphanumeric
    const gstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/;
    
    return gstinPattern.test(gstin);
}

/**
 * Format month to MMYYYY format required by GST
 * @param {string|Date} month - Can be "2024-03", Date object, or "March 2024"
 * @returns {string} - Returns "032024" format
 */
export function formatMonth(month) {
    let date;
    
    if (month instanceof Date) {
        date = month;
    } else if (typeof month === 'string') {
        // Handle "2024-03" format
        if (month.match(/^\d{4}-\d{2}$/)) {
            const [year, monthNum] = month.split('-');
            return `${monthNum}${year}`;
        }
        // Handle "March 2024" format
        date = new Date(month);
    }
    
    if (!date || isNaN(date.getTime())) {
        throw new Error('Invalid month format. Use YYYY-MM, Date object, or "Month YYYY"');
    }
    
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    
    return `${mm}${yyyy}`;
}

/**
 * Generate SMS string for GST NIL Return (Form 3B)
 * Official Format: NIL 3B <GSTIN> <MMYYYY>
 * Example: NIL 3B 29ABCDE1234F1Z5 032024
 * 
 * @param {string} gstin - 15 digit GSTIN
 * @param {string} month - Month in YYYY-MM or MMYYYY format
 * @returns {string} - Formatted SMS string
 */
export function generateSMSString(gstin, month) {
    // Validate GSTIN
    if (!validateGSTIN(gstin)) {
        throw new Error('Invalid GSTIN format');
    }
    
    // Format month
    let formattedMonth;
    try {
        // If already in MMYYYY format
        if (month.match(/^\d{6}$/)) {
            formattedMonth = month;
        } else {
            formattedMonth = formatMonth(month);
        }
    } catch (error) {
        throw new Error(`Invalid month format: ${error.message}`);
    }
    
    // Clean GSTIN (remove spaces)
    const cleanGSTIN = gstin.trim().toUpperCase();
    
    // Format: NIL 3B <GSTIN> <MMYYYY>
    return `NIL 3B ${cleanGSTIN} ${formattedMonth}`;
}

/**
 * Generate SMS deep link for mobile devices
 * This creates a link that opens the SMS app with pre-filled content
 * 
 * @param {string} gstin - 15 digit GSTIN
 * @param {string} month - Month in YYYY-MM format
 * @param {string} phoneNumber - Recipient number (default: 14409 for GST India)
 * @returns {object} - Object with different link formats for testing
 */
export function generateSMSDeepLink(gstin, month, phoneNumber = '14409') {
    const smsBody = generateSMSString(gstin, month);
    
    // URL encode the message body
    const encodedBody = encodeURIComponent(smsBody);
    
    // Different formats for different platforms
    return {
        // Standard format (works on most Android devices)
        standard: `sms:${phoneNumber}?body=${encodedBody}`,
        
        // iOS format (some iOS versions prefer this)
        ios: `sms:${phoneNumber}&body=${encodedBody}`,
        
        // Alternative format (Telegram-friendly)
        telegram: `sms:${phoneNumber}?body=${encodedBody}`,
        
        // Raw text for copying
        rawText: smsBody,
        
        // Display text for user
        displayText: `📱 Tap to send SMS to ${phoneNumber}`,
        
        // Phone number
        recipient: phoneNumber
    };
}

/**
 * Generate user-friendly description of what the SMS will do
 * @param {string} gstin - GSTIN
 * @param {string} month - Month
 * @returns {string} - Human readable description
 */
export function getSMSDescription(gstin, month) {
    const formattedMonth = formatMonth(month);
    const monthName = new Date(`${formattedMonth.substr(2)}-${formattedMonth.substr(0, 2)}-01`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    
    return `This will file a NIL return for GSTR-3B for ${monthName} using GSTIN: ${gstin}`;
}

/**
 * Create a complete SMS filing object for the bot
 * This is what you'll pass to Member 1's bot integration
 * 
 * @param {string} gstin - User's GSTIN
 * @param {string} month - Month to file for
 * @returns {object} - Complete SMS filing data
 */
export function createSMSFiling(gstin, month) {
    const deepLink = generateSMSDeepLink(gstin, month);
    const description = getSMSDescription(gstin, month);
    
    return {
        type: 'NIL',
        returnType: 'GSTR-3B',
        gstin: gstin.toUpperCase(),
        month: formatMonth(month),
        smsBody: deepLink.rawText,
        deepLinks: {
            primary: deepLink.standard,
            fallback: deepLink.ios
        },
        description: description,
        instructions: [
            '1. Tap the "Send SMS" button below',
            '2. Your SMS app will open with pre-filled message',
            '3. Review the message and tap Send',
            '4. You will receive a confirmation from GST'
        ]
    };
}

/**
 * Generate confirmation SMS string (Step 2 of filing process)
 * After receiving verification code, user must send confirmation
 * Official Format: CNF 3B <6-digit-code>
 * 
 * @param {string} verificationCode - 6-digit code received from GST
 * @param {string} returnType - 'GSTR-3B' or 'GSTR-1' (default: GSTR-3B)
 * @returns {string} - Confirmation SMS string
 */
export function generateConfirmationSMS(verificationCode, returnType = 'GSTR-3B') {
    // Validate verification code
    if (!verificationCode || !/^\d{6}$/.test(verificationCode.toString())) {
        throw new Error('Verification code must be exactly 6 digits');
    }
    
    // Determine return type code
    const typeCode = returnType === 'GSTR-1' ? 'R1' : '3B';
    
    // Format: CNF <TYPE> <CODE>
    return `CNF ${typeCode} ${verificationCode}`;
}

/**
 * Generate help SMS string to get assistance
 * Official Format: HELP 3B
 * 
 * @param {string} returnType - 'GSTR-3B' or 'GSTR-1' (default: GSTR-3B)
 * @returns {string} - Help SMS string
 */
export function generateHelpSMS(returnType = 'GSTR-3B') {
    const typeCode = returnType === 'GSTR-1' ? 'R1' : '3B';
    return `HELP ${typeCode}`;
}

/**
 * Format period for GSTR-1 (handles both monthly and quarterly)
 * Official Rules:
 * - Monthly Filers: Use specific month (e.g., April 2020 = 042020)
 * - Quarterly Filers: Use last month of quarter (e.g., Apr-Jun 2020 = 062020)
 * 
 * @param {string|Date} period - Period in YYYY-MM format or Date object
 * @param {boolean} isQuarterly - Whether this is quarterly filing
 * @returns {string} - MMYYYY format
 */
export function formatGSTR1Period(period, isQuarterly = false) {
    let formattedPeriod;
    
    // If already in MMYYYY format
    if (typeof period === 'string' && period.match(/^\d{6}$/)) {
        formattedPeriod = period;
    } else {
        formattedPeriod = formatMonth(period);
    }
    
    if (!isQuarterly) {
        return formattedPeriod;
    }
    
    // For quarterly, adjust to last month of quarter
    const month = parseInt(formattedPeriod.substring(0, 2));
    const year = formattedPeriod.substring(2);
    
    // Map month to last month of its quarter
    // Q1 (Jan-Mar): 03, Q2 (Apr-Jun): 06, Q3 (Jul-Sep): 09, Q4 (Oct-Dec): 12
    let quarterEndMonth;
    if (month >= 1 && month <= 3) {
        quarterEndMonth = '03';
    } else if (month >= 4 && month <= 6) {
        quarterEndMonth = '06';
    } else if (month >= 7 && month <= 9) {
        quarterEndMonth = '09';
    } else {
        quarterEndMonth = '12';
    }
    
    return `${quarterEndMonth}${year}`;
}

/**
 * Generate SMS string for GSTR-1 NIL return
 * Official Format: NIL R1 <GSTIN> <MMYYYY>
 * 
 * Key Differences from GSTR-3B:
 * - Uses 'R1' instead of '3B'
 * - Period for quarterly filers must be last month of quarter
 * - Different eligibility criteria (no outward supplies, amendments, etc.)
 * 
 * @param {string} gstin - 15 digit GSTIN
 * @param {string} period - Period in YYYY-MM or MMYYYY format
 * @param {boolean} isQuarterly - Whether this is quarterly filing (default: false)
 * @returns {string} - Formatted SMS string
 */
export function generateGSTR1SMS(gstin, period, isQuarterly = false) {
    if (!validateGSTIN(gstin)) {
        throw new Error('Invalid GSTIN format');
    }
    
    let formattedPeriod;
    try {
        formattedPeriod = formatGSTR1Period(period, isQuarterly);
    } catch (error) {
        throw new Error(`Invalid period format: ${error.message}`);
    }
    
    const cleanGSTIN = gstin.trim().toUpperCase();
    
    // Format: NIL R1 <GSTIN> <MMYYYY>
    return `NIL R1 ${cleanGSTIN} ${formattedPeriod}`;
}

/**
 * Generate GSTR-1 SMS deep link for mobile devices
 * Official Requirements:
 * - Destination: 14409
 * - Format: NIL R1 <GSTIN> <Period>
 * - Case insensitive
 * 
 * @param {string} gstin - 15 digit GSTIN
 * @param {string} period - Period in YYYY-MM or MMYYYY format
 * @param {boolean} isQuarterly - Whether quarterly filing (default: false)
 * @returns {string} - SMS deep link (sms:14409?body=...)
 */
export function generateGSTR1Link(gstin, period, isQuarterly = false) {
    const smsBody = generateGSTR1SMS(gstin, period, isQuarterly);
    const encodedBody = encodeURIComponent(smsBody);
    
    // Return standard format deep link
    return `sms:14409?body=${encodedBody}`;
}

/**
 * Generate complete GSTR-1 deep link object with multiple formats
 * 
 * @param {string} gstin - 15 digit GSTIN
 * @param {string} period - Period in YYYY-MM or MMYYYY format
 * @param {boolean} isQuarterly - Whether quarterly filing
 * @returns {object} - Deep link object with multiple formats
 */
export function generateGSTR1DeepLink(gstin, period, isQuarterly = false) {
    const smsBody = generateGSTR1SMS(gstin, period, isQuarterly);
    const encodedBody = encodeURIComponent(smsBody);
    
    return {
        standard: `sms:14409?body=${encodedBody}`,
        ios: `sms:14409&body=${encodedBody}`,
        telegram: `sms:14409?body=${encodedBody}`,
        rawText: smsBody,
        displayText: '📱 Tap to send SMS to 14409',
        recipient: '14409'
    };
}

/**
 * Get eligibility requirements for SMS filing
 * Based on official GST documentation
 * 
 * @param {string} returnType - 'GSTR-3B' or 'GSTR-1' (default: GSTR-3B)
 * @returns {object} - Eligibility criteria and warnings
 */
export function getEligibilityRequirements(returnType = 'GSTR-3B') {
    const isGSTR1 = returnType === 'GSTR-1';
    
    // Common requirements
    const commonRequired = [
        'Valid GSTIN (Normal/Casual taxpayer/SEZ Unit/SEZ Developer)',
        'Authorized signatory with unique registered mobile number on GST Portal',
        'No saved data on GST Portal for this period'
    ];
    
    // GSTR-3B specific requirements
    const gstr3bRequired = [
        ...commonRequired,
        'No pending liability of previous period tax, interest or late fee',
        'All previous GSTR-3B returns must be filed'
    ];
    
    // GSTR-1 specific requirements (from official documentation)
    const gstr1Required = [
        ...commonRequired,
        'No outward supplies during the period',
        'No amendments to any supplies declared in earlier returns',
        'No credit or debit notes to be declared/amended',
        'No details of advances received for services to be declared or adjusted'
    ];
    
    // Validation pre-checks (common to both)
    const validationChecks = [
        '❌ Cannot file if mobile number is registered to multiple authorized signatories for same GSTIN',
        '❌ Cannot file if any saved data exists on GST Portal for that period',
        '✅ Verification code is 6 digits and valid for 30 minutes only'
    ];
    
    return {
        required: isGSTR1 ? gstr1Required : gstr3bRequired,
        validationChecks: validationChecks,
        warnings: [
            'Verification code valid for 30 minutes only',
            'Verification code is 6 digits and usable only once',
            '3 incorrect verification attempts will block your number for 24 hours',
            'SMS text is NOT case sensitive',
            'Cannot revise NIL return after filing via SMS'
        ],
        process: [
            'Step 1: Send NIL SMS → Wait for verification code (SMS)',
            'Step 2: Send CNF SMS with code → Receive ARN confirmation',
            'Step 3: Check email and SMS for ARN (Application Reference Number)'
        ],
        returnType: returnType
    };
}

/**
 * Create complete filing object with all SMS steps included
 * Enhanced version with confirmation instructions
 * 
 * @param {string} gstin - User's GSTIN
 * @param {string} month - Month to file for
 * @param {string} returnType - 'GSTR-3B' or 'GSTR-1'
 * @returns {object} - Complete filing data with all SMS steps
 */
export function createCompleteSMSFiling(gstin, month, returnType = 'GSTR-3B', isQuarterly = false) {
    const isGSTR1 = returnType === 'GSTR-1';
    const smsString = isGSTR1 ? generateGSTR1SMS(gstin, month, isQuarterly) : generateSMSString(gstin, month);
    const deepLink = isGSTR1 ? generateGSTR1DeepLink(gstin, month, isQuarterly) : generateSMSDeepLink(gstin, month);
    const description = getSMSDescription(gstin, month);
    const eligibility = getEligibilityRequirements(returnType);
    
    return {
        type: 'NIL',
        returnType: returnType,
        gstin: gstin.toUpperCase(),
        month: formatMonth(month),
        
        // Step 1: Initial filing SMS
        step1: {
            smsBody: smsString,
            deepLinks: {
                primary: deepLink.standard,
                fallback: deepLink.ios
            },
            instructions: [
                '1. Tap "Send SMS" button below',
                '2. SMS app opens with pre-filled message',
                '3. Review and tap Send',
                '4. Wait for verification code (arrives within 1-2 minutes)'
            ]
        },
        
        // Step 2: Confirmation SMS (to be sent after receiving code)
        step2: {
            format: `CNF ${isGSTR1 ? 'R1' : '3B'} <6-digit-code>`,
            example: `CNF ${isGSTR1 ? 'R1' : '3B'} 123456`,
            instructions: [
                '1. You will receive a 6-digit verification code via SMS',
                '2. Compose NEW SMS to 14409',
                '3. Type: CNF ' + (isGSTR1 ? 'R1' : '3B') + ' <your-6-digit-code>',
                '4. Send SMS',
                '5. Wait for ARN confirmation'
            ],
            important: [
                '⏰ Code expires in 30 minutes',
                '🔒 Code is single-use only',
                '⚠️ 3 wrong attempts = 24 hour block'
            ]
        },
        
        description: description,
        eligibility: eligibility,
        helpSMS: generateHelpSMS(returnType)
    };
}

// For testing purposes (can be removed in production)
export const TEST_DATA = {
    validGSTIN: '29ABCDE1234F1Z5',
    validMonth: '2024-03',
    expectedSMS: 'NIL 3B 29ABCDE1234F1Z5 032024',
    expectedConfirmation: 'CNF 3B 123456',
    expectedHelp: 'HELP 3B',
    gstr1SMS: 'NIL R1 29ABCDE1234F1Z5 032024',
    gstr1MonthlyLink: 'sms:14409?body=NIL%20R1%2029ABCDE1234F1Z5%20042020',
    gstr1QuarterlyPeriod: '062020', // Apr-Jun quarter ends in June
    gstr1QuarterlyLink: 'sms:14409?body=NIL%20R1%2029ABCDE1234F1Z5%20062020'
};

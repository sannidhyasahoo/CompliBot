/**
 * SMS Module Test Suite
 * Run this independently to verify your SMS functions work
 * Usage: node testSMS.js
 */

import {
    validateGSTIN,
    formatMonth,
    generateSMSString,
    generateSMSDeepLink,
    getSMSDescription,
    createSMSFiling,
    generateConfirmationSMS,
    generateHelpSMS,
    generateGSTR1SMS,
    generateGSTR1Link,
    generateGSTR1DeepLink,
    formatGSTR1Period,
    getEligibilityRequirements,
    createCompleteSMSFiling,
    TEST_DATA
} from './smsHelper.js';

// Color codes for terminal output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[36m',
    reset: '\x1b[0m'
};

function log(status, message) {
    const icon = status === 'pass' ? '✓' : status === 'fail' ? '✗' : 'ℹ';
    const color = status === 'pass' ? colors.green : status === 'fail' ? colors.red : colors.blue;
    console.log(`${color}${icon}${colors.reset} ${message}`);
}

function section(title) {
    console.log(`\n${colors.yellow}═══ ${title} ═══${colors.reset}`);
}

// Test Suite
let passCount = 0;
let failCount = 0;

function test(name, testFn) {
    try {
        const result = testFn();
        if (result) {
            log('pass', name);
            passCount++;
        } else {
            log('fail', name);
            failCount++;
        }
    } catch (error) {
        log('fail', `${name} - Error: ${error.message}`);
        failCount++;
    }
}

// Run Tests
console.log(`${colors.blue}🧪 CompliBot SMS Engine Test Suite${colors.reset}`);

section('1. GSTIN Validation Tests');
test('Valid GSTIN (29ABCDE1234F1Z5)', () => validateGSTIN('29ABCDE1234F1Z5'));
test('Valid GSTIN with spaces', () => validateGSTIN('29 ABCDE 1234 F1Z5'));
test('Invalid GSTIN (too short)', () => !validateGSTIN('29ABCDE1234'));
test('Invalid GSTIN (wrong format)', () => !validateGSTIN('INVALID123456789'));
test('Empty GSTIN', () => !validateGSTIN(''));

section('2. Month Formatting Tests');
test('Format YYYY-MM (2024-03)', () => formatMonth('2024-03') === '032024');
test('Format YYYY-MM (2024-12)', () => formatMonth('2024-12') === '122024');
test('Format Date object', () => {
    const date = new Date('2024-03-01');
    return formatMonth(date) === '032024';
});

section('3. SMS String Generation Tests');
test('Generate basic SMS string', () => {
    const sms = generateSMSString('29ABCDE1234F1Z5', '2024-03');
    log('info', `   Generated: "${sms}"`);
    return sms === 'NIL 3B 29ABCDE1234F1Z5 032024';
});

test('Generate SMS with MMYYYY format', () => {
    const sms = generateSMSString('29ABCDE1234F1Z5', '032024');
    return sms === 'NIL 3B 29ABCDE1234F1Z5 032024';
});

test('Reject invalid GSTIN in SMS', () => {
    try {
        generateSMSString('INVALID', '2024-03');
        return false;
    } catch (error) {
        return error.message.includes('Invalid GSTIN');
    }
});

section('4. Deep Link Generation Tests');
const deepLink = generateSMSDeepLink('29ABCDE1234F1Z5', '2024-03');

test('Deep link has standard format', () => {
    log('info', `   Standard: ${deepLink.standard}`);
    return deepLink.standard.includes('sms:14409?body=');
});

test('Deep link has iOS format', () => {
    log('info', `   iOS: ${deepLink.ios}`);
    return deepLink.ios.includes('sms:14409&body=');
});

test('Deep link has raw text', () => {
    log('info', `   Raw: ${deepLink.rawText}`);
    return deepLink.rawText === 'NIL 3B 29ABCDE1234F1Z5 032024';
});

test('Deep link body is URL encoded', () => {
    return deepLink.standard.includes('NIL%203B');
});

section('5. Complete Filing Object Tests');
const filing = createSMSFiling('29ABCDE1234F1Z5', '2024-03');

test('Filing object has correct type', () => filing.type === 'NIL');
test('Filing object has return type', () => filing.returnType === 'GSTR-3B');
test('Filing object has instructions', () => filing.instructions.length > 0);
test('Filing object has deepLinks', () => {
    return filing.deepLinks.primary && filing.deepLinks.fallback;
});

section('6. Description Tests');
const description = getSMSDescription('29ABCDE1234F1Z5', '2024-03');
test('Description is human readable', () => {
    log('info', `   "${description}"`);
    return description.includes('March 2024');
});

section('7. NEW: Confirmation SMS Tests (Official GST Step 2)');
test('Generate confirmation SMS with valid code', () => {
    const confirmSMS = generateConfirmationSMS('123456');
    log('info', `   Generated: "${confirmSMS}"`);
    return confirmSMS === 'CNF 3B 123456';
});

test('Confirmation SMS for GSTR-1', () => {
    const confirmSMS = generateConfirmationSMS('123456', 'GSTR-1');
    return confirmSMS === 'CNF R1 123456';
});

test('Reject invalid verification code (not 6 digits)', () => {
    try {
        generateConfirmationSMS('12345'); // Only 5 digits
        return false;
    } catch (error) {
        return error.message.includes('6 digits');
    }
});

test('Reject non-numeric verification code', () => {
    try {
        generateConfirmationSMS('ABC123');
        return false;
    } catch (error) {
        return error.message.includes('6 digits');
    }
});

section('8. NEW: Help SMS Tests');
test('Generate help SMS for GSTR-3B', () => {
    const helpSMS = generateHelpSMS();
    log('info', `   Generated: "${helpSMS}"`);
    return helpSMS === 'HELP 3B';
});

test('Generate help SMS for GSTR-1', () => {
    const helpSMS = generateHelpSMS('GSTR-1');
    return helpSMS === 'HELP R1';
});

section('9. NEW: GSTR-1 SMS Generation Tests');
test('Generate GSTR-1 monthly SMS', () => {
    const sms = generateGSTR1SMS('29ABCDE1234F1Z5', '2024-03');
    log('info', `   Generated: "${sms}"`);
    return sms === 'NIL R1 29ABCDE1234F1Z5 032024';
});

test('GSTR-1 SMS matches test data', () => {
    const sms = generateGSTR1SMS(TEST_DATA.validGSTIN, TEST_DATA.validMonth);
    return sms === TEST_DATA.gstr1SMS;
});

test('Generate GSTR-1 quarterly SMS (Q2: Apr-Jun)', () => {
    const sms = generateGSTR1SMS('29ABCDE1234F1Z5', '2020-04', true);
    log('info', `   Quarterly Generated: "${sms}"`);
    return sms === 'NIL R1 29ABCDE1234F1Z5 062020'; // Should use June (last month of Q2)
});

test('Format GSTR-1 period for quarterly (Q1)', () => {
    const period = formatGSTR1Period('2024-01', true);
    return period === '032024'; // Jan -> Mar (Q1 end)
});

test('Format GSTR-1 period for quarterly (Q3)', () => {
    const period = formatGSTR1Period('2024-07', true);
    return period === '092024'; // Jul -> Sep (Q3 end)
});

test('Generate GSTR-1 link (monthly)', () => {
    const link = generateGSTR1Link('29ABCDE1234F1Z5', '2020-04');
    log('info', `   Link: ${link}`);
    return link.includes('sms:14409?body=') && link.includes('NIL%20R1');
});

test('Generate GSTR-1 link (quarterly)', () => {
    const link = generateGSTR1Link('29ABCDE1234F1Z5', '2020-04', true);
    return link.includes('062020'); // Should use June for Apr-Jun quarter
});

test('Generate GSTR-1 deep link object', () => {
    const deepLink = generateGSTR1DeepLink('29ABCDE1234F1Z5', '2024-03');
    return deepLink.standard && deepLink.ios && deepLink.rawText && deepLink.recipient === '14409';
});

section('10. NEW: Eligibility Requirements Tests');
test('Eligibility requirements object exists (GSTR-3B)', () => {
    const eligibility = getEligibilityRequirements();
    return eligibility && eligibility.required && eligibility.warnings && eligibility.process;
});

test('Eligibility has all required fields (GSTR-3B)', () => {
    const eligibility = getEligibilityRequirements();
    return eligibility.required.length >= 5 && 
           eligibility.warnings.length >= 4 && 
           eligibility.process.length >= 3;
});

test('GSTR-1 eligibility has specific requirements', () => {
    const eligibility = getEligibilityRequirements('GSTR-1');
    const reqText = eligibility.required.join(' ');
    return reqText.includes('outward supplies') && 
           reqText.includes('amendments') &&
           eligibility.returnType === 'GSTR-1';
});

test('GSTR-3B eligibility has specific requirements', () => {
    const eligibility = getEligibilityRequirements('GSTR-3B');
    const reqText = eligibility.required.join(' ');
    return reqText.includes('pending liability') && 
           eligibility.returnType === 'GSTR-3B';
});

test('Eligibility has validation checks', () => {
    const eligibility = getEligibilityRequirements();
    return eligibility.validationChecks && eligibility.validationChecks.length >= 3;
});

section('11. NEW: Complete Two-Step Filing Object Tests');
const completeFiling = createCompleteSMSFiling('29ABCDE1234F1Z5', '2024-03');

test('Complete filing has step 1', () => {
    return completeFiling.step1 && completeFiling.step1.smsBody && completeFiling.step1.deepLinks;
});

test('Complete filing has step 2', () => {
    return completeFiling.step2 && completeFiling.step2.format && completeFiling.step2.instructions;
});

test('Complete filing has eligibility', () => {
    return completeFiling.eligibility && completeFiling.eligibility.required;
});

test('Complete filing has help SMS', () => {
    log('info', `   Help SMS: "${completeFiling.helpSMS}"`);
    return completeFiling.helpSMS === 'HELP 3B';
});

test('Step 2 format is correct', () => {
    return completeFiling.step2.format === 'CNF 3B <6-digit-code>';
});

test('Step 2 has important warnings', () => {
    return completeFiling.step2.important && completeFiling.step2.important.length >= 3;
});

// Summary
section('Test Summary');
const total = passCount + failCount;
console.log(`\nTotal: ${total} tests`);
console.log(`${colors.green}Passed: ${passCount}${colors.reset}`);
console.log(`${colors.red}Failed: ${failCount}${colors.reset}`);

if (failCount === 0) {
    console.log(`\n${colors.green}🎉 All tests passed! Your SMS Engine is ready!${colors.reset}`);
} else {
    console.log(`\n${colors.red}⚠️  Some tests failed. Please review the errors above.${colors.reset}`);
    process.exit(1);
}

// Example Usage Demo
section('Example Usage for Bot Integration');
console.log(`
${colors.blue}// In your bot code (Member 1 will use this):${colors.reset}

import { createSMSFiling } from './smsHelper.js';

// When user clicks "File NIL Return"
const userGSTIN = '29ABCDE1234F1Z5';
const currentMonth = '2024-03';

const filing = createSMSFiling(userGSTIN, currentMonth);

// Send message with inline keyboard
bot.sendMessage(chatId, filing.description, {
    reply_markup: {
        inline_keyboard: [[
            { text: '📱 Send SMS', url: filing.deepLinks.primary }
        ]]
    }
});

${colors.green}// User taps button → SMS app opens → Pre-filled message → Done!${colors.reset}
`);

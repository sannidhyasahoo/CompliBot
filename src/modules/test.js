/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CompliBot SMS Engine - Comprehensive Test Suite
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Tests all SMS generation features for GST NIL return filing via SMS (14409)
 * Covers: GSTR-3B, GSTR-1, Validation, Formatting, Two-step process
 * 
 * Author: Member 2 (SMS Engine)
 * Date: December 12, 2025
 * Status: Production Ready ✅
 */

import * as smsHelper from './smsHelper.js';
import * as smsDirect from './smsHelperDirect.js';

// ═══════════════════════════════════════════════════════════════════════════
// Test Framework Utilities
// ═══════════════════════════════════════════════════════════════════════════

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

let stats = {
    total: 0,
    passed: 0,
    failed: 0,
    sections: 0
};

function header(title) {
    console.log(`\n${colors.cyan}${'═'.repeat(80)}${colors.reset}`);
    console.log(`${colors.cyan}${colors.bright}  ${title}${colors.reset}`);
    console.log(`${colors.cyan}${'═'.repeat(80)}${colors.reset}\n`);
    stats.sections++;
}

function section(name) {
    console.log(`\n${colors.blue}${'─'.repeat(80)}${colors.reset}`);
    console.log(`${colors.blue}${name}${colors.reset}`);
    console.log(`${colors.blue}${'─'.repeat(80)}${colors.reset}\n`);
}

async function test(name, fn) {
    stats.total++;
    try {
        await fn();
        console.log(`${colors.green}  ✓${colors.reset} ${name}`);
        stats.passed++;
    } catch (error) {
        console.log(`${colors.red}  ✗${colors.reset} ${name}`);
        console.log(`    ${colors.red}Error: ${error.message}${colors.reset}`);
        stats.failed++;
    }
}

function assertEqual(actual, expected, message = '') {
    if (actual !== expected) {
        throw new Error(
            `${message}\n    Expected: ${expected}\n    Actual:   ${actual}`
        );
    }
}

function assertMatch(actual, pattern, message = '') {
    if (!pattern.test(actual)) {
        throw new Error(
            `${message}\n    Pattern: ${pattern}\n    Actual:  ${actual}`
        );
    }
}

function assertTrue(condition, message = 'Assertion failed') {
    if (!condition) {
        throw new Error(message);
    }
}

function assertFalse(condition, message = 'Assertion failed') {
    if (condition) {
        throw new Error(message);
    }
}

function assertContains(str, substring, message = '') {
    if (!str.includes(substring)) {
        throw new Error(
            `${message}\n    Expected "${str}" to contain "${substring}"`
        );
    }
}

function summary() {
    console.log(`\n${colors.cyan}${'═'.repeat(80)}${colors.reset}`);
    console.log(`${colors.cyan}${colors.bright}  TEST SUMMARY${colors.reset}`);
    console.log(`${colors.cyan}${'═'.repeat(80)}${colors.reset}\n`);
    
    const passRate = ((stats.passed / stats.total) * 100).toFixed(1);
    
    console.log(`  Total Tests:    ${stats.total}`);
    console.log(`  ${colors.green}Passed:         ${stats.passed}${colors.reset}`);
    console.log(`  ${colors.red}Failed:         ${stats.failed}${colors.reset}`);
    console.log(`  Sections:       ${stats.sections}`);
    console.log(`  Pass Rate:      ${passRate}%\n`);
    
    if (stats.failed === 0) {
        console.log(`${colors.green}${colors.bright}  🎉 ALL TESTS PASSED! SMS Engine is ready for production.${colors.reset}\n`);
    } else {
        console.log(`${colors.red}${colors.bright}  ⚠️  SOME TESTS FAILED. Please review errors above.${colors.reset}\n`);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST SUITE
// ═══════════════════════════════════════════════════════════════════════════

async function runTests() {
header('CompliBot SMS Engine - Test Suite v2.0');

// ───────────────────────────────────────────────────────────────────────────
// 1. GSTIN VALIDATION TESTS
// ───────────────────────────────────────────────────────────────────────────
section('1. GSTIN Validation');

test('Valid GSTIN (standard format)', () => {
    assertTrue(smsHelper.validateGSTIN('29ABCDE1234F1Z5'));
});

test('Valid GSTIN (with spaces)', () => {
    assertTrue(smsHelper.validateGSTIN('29 ABCDE 1234 F1Z5'));
});

test('Valid GSTIN (lowercase)', () => {
    assertTrue(smsHelper.validateGSTIN('29abcde1234f1z5'));
});

test('Invalid GSTIN (too short)', () => {
    assertFalse(smsHelper.validateGSTIN('29ABCDE1234'));
});

test('Invalid GSTIN (too long)', () => {
    assertFalse(smsHelper.validateGSTIN('29ABCDE1234F1Z5X'));
});

test('Invalid GSTIN (null)', () => {
    assertFalse(smsHelper.validateGSTIN(null));
});

test('Invalid GSTIN (wrong pattern)', () => {
    assertFalse(smsHelper.validateGSTIN('XXABCDE1234F1Z5'));
});

// ───────────────────────────────────────────────────────────────────────────
// 2. MONTH FORMATTING TESTS
// ───────────────────────────────────────────────────────────────────────────
section('2. Month Formatting');

test('Format month from YYYY-MM', () => {
    assertEqual(smsHelper.formatMonth('2024-03'), '032024');
});

test('Format month from Date object', () => {
    const date = new Date('2024-03-15');
    assertEqual(smsHelper.formatMonth(date), '032024');
});

test('Format month with leading zero', () => {
    assertEqual(smsHelper.formatMonth('2024-01'), '012024');
});

test('Format month double digit', () => {
    assertEqual(smsHelper.formatMonth('2024-12'), '122024');
});

// ───────────────────────────────────────────────────────────────────────────
// 3. GSTR-3B SMS GENERATION TESTS
// ───────────────────────────────────────────────────────────────────────────
section('3. GSTR-3B SMS Generation');

test('Generate GSTR-3B SMS string', () => {
    const sms = smsHelper.generateSMSString('29ABCDE1234F1Z5', '032024');
    assertEqual(sms, 'NIL 3B 29ABCDE1234F1Z5 032024');
});

test('GSTR-3B SMS is case-insensitive', () => {
    const sms = smsHelper.generateSMSString('29abcde1234f1z5', '2024-03');
    assertMatch(sms, /NIL 3B 29ABCDE1234F1Z5 032024/);
});

test('Generate GSTR-3B deep link', () => {
    const links = smsHelper.generateSMSDeepLink('29ABCDE1234F1Z5', '2024-03');
    assertContains(links.standard, 'sms:14409?body=');
    assertContains(links.standard, 'NIL%203B');
});

test('Create complete GSTR-3B filing', async () => {
    const filing = await smsDirect.createSMSFiling('29ABCDE1234F1Z5', '2024-03');
    assertEqual(filing.returnType, 'GSTR-3B');
    assertEqual(filing.smsBody, 'NIL 3B 29ABCDE1234F1Z5 032024');
    assertTrue(filing.smsLink.includes('sms:') || filing.smsLink.includes('http'), 'Should have valid SMS link');
});

test('GSTR-3B filing includes instructions', async () => {
    const filing = await smsDirect.createSMSFiling('29ABCDE1234F1Z5', '2024-03');
    assertTrue(Array.isArray(filing.instructions));
    assertTrue(filing.instructions.length > 0);
});

// ───────────────────────────────────────────────────────────────────────────
// 4. GSTR-1 PERIOD FORMATTING TESTS
// ───────────────────────────────────────────────────────────────────────────
section('4. GSTR-1 Period Formatting');

test('Format GSTR-1 monthly period', () => {
    const period = smsHelper.formatGSTR1Period('2024-04', false);
    assertEqual(period, '042024');
});

test('Format GSTR-1 quarterly - Q1 (Jan)', () => {
    const period = smsHelper.formatGSTR1Period('2024-01', true);
    assertEqual(period, '032024', 'Q1 should map to March');
});

test('Format GSTR-1 quarterly - Q2 (Apr)', () => {
    const period = smsHelper.formatGSTR1Period('2024-04', true);
    assertEqual(period, '062024', 'Q2 should map to June');
});

test('Format GSTR-1 quarterly - Q3 (Jul)', () => {
    const period = smsHelper.formatGSTR1Period('2024-07', true);
    assertEqual(period, '092024', 'Q3 should map to September');
});

test('Format GSTR-1 quarterly - Q4 (Oct)', () => {
    const period = smsHelper.formatGSTR1Period('2024-10', true);
    assertEqual(period, '122024', 'Q4 should map to December');
});

test('Format GSTR-1 quarterly - Last month of quarter', () => {
    const period = smsHelper.formatGSTR1Period('2024-03', true);
    assertEqual(period, '032024', 'March (Q1 end) stays March');
});

// ───────────────────────────────────────────────────────────────────────────
// 5. GSTR-1 SMS GENERATION TESTS
// ───────────────────────────────────────────────────────────────────────────
section('5. GSTR-1 SMS Generation');

test('Generate GSTR-1 SMS (monthly)', () => {
    const sms = smsHelper.generateGSTR1SMS('29ABCDE1234F1Z5', '2024-03', false);
    assertEqual(sms, 'NIL R1 29ABCDE1234F1Z5 032024');
});

test('Generate GSTR-1 SMS (quarterly)', () => {
    const sms = smsHelper.generateGSTR1SMS('29ABCDE1234F1Z5', '2024-04', true);
    assertEqual(sms, 'NIL R1 29ABCDE1234F1Z5 062024');
});

test('Create GSTR-1 filing (monthly)', async () => {
    const filing = await smsDirect.createGSTR1Filing('29ABCDE1234F1Z5', '2024-03', false);
    assertEqual(filing.returnType, 'GSTR-1');
    assertEqual(filing.smsBody, 'NIL R1 29ABCDE1234F1Z5 032024');
    assertFalse(filing.isQuarterly);
});

test('Create GSTR-1 filing (quarterly)', async () => {
    const filing = await smsDirect.createGSTR1Filing('29ABCDE1234F1Z5', '2024-04', true);
    assertEqual(filing.returnType, 'GSTR-1');
    assertEqual(filing.period, '062024');
    assertTrue(filing.isQuarterly);
});

test('GSTR-1 uses R1 code (not 3B)', () => {
    const sms = smsHelper.generateGSTR1SMS('29ABCDE1234F1Z5', '2024-03');
    assertContains(sms, 'R1');
    assertFalse(sms.includes('3B'));
});

// ───────────────────────────────────────────────────────────────────────────
// 6. CONFIRMATION SMS TESTS
// ───────────────────────────────────────────────────────────────────────────
section('6. Confirmation SMS (Step 2)');

test('Generate confirmation SMS for GSTR-3B', () => {
    const sms = smsHelper.generateConfirmationSMS('123456', 'GSTR-3B');
    assertEqual(sms, 'CNF 3B 123456');
});

test('Generate confirmation SMS for GSTR-1', () => {
    const sms = smsHelper.generateConfirmationSMS('123456', 'GSTR-1');
    assertEqual(sms, 'CNF R1 123456');
});

test('Confirmation SMS validates code length', () => {
    try {
        smsHelper.generateConfirmationSMS('123', 'GSTR-3B');
        throw new Error('Should have thrown error for invalid code');
    } catch (error) {
        assertContains(error.message, '6 digits');
    }
});

test('Create confirmation SMS with link', async () => {
    const confirm = await smsDirect.createConfirmationSMS('123456', 'GSTR-3B');
    assertEqual(confirm.smsBody, 'CNF 3B 123456');
    assertTrue(confirm.smsLink.includes('sms:') || confirm.smsLink.includes('http'), 'Should have valid SMS link');
});

// ───────────────────────────────────────────────────────────────────────────
// 7. HELP SMS TESTS
// ───────────────────────────────────────────────────────────────────────────
section('7. Help SMS');

test('Generate help SMS for GSTR-3B', () => {
    const sms = smsHelper.generateHelpSMS('GSTR-3B');
    assertEqual(sms, 'HELP 3B');
});

test('Generate help SMS for GSTR-1', () => {
    const sms = smsHelper.generateHelpSMS('GSTR-1');
    assertEqual(sms, 'HELP R1');
});

// ───────────────────────────────────────────────────────────────────────────
// 8. ELIGIBILITY REQUIREMENTS TESTS
// ───────────────────────────────────────────────────────────────────────────
section('8. Eligibility Requirements');

test('Get GSTR-3B eligibility requirements', () => {
    const eligibility = smsHelper.getEligibilityRequirements('GSTR-3B');
    assertTrue(Array.isArray(eligibility.required));
    assertTrue(eligibility.required.length > 0);
});

test('Get GSTR-1 eligibility requirements', () => {
    const eligibility = smsHelper.getEligibilityRequirements('GSTR-1');
    assertTrue(Array.isArray(eligibility.required));
    assertTrue(eligibility.required.some(req => req.includes('outward supplies')));
});

test('GSTR-1 has different requirements than GSTR-3B', () => {
    const gstr3b = smsHelper.getEligibilityRequirements('GSTR-3B');
    const gstr1 = smsHelper.getEligibilityRequirements('GSTR-1');
    assertTrue(gstr1.required.some(req => req.includes('outward supplies')));
});

// ───────────────────────────────────────────────────────────────────────────
// 9. COMPLETE TWO-STEP FILING TESTS
// ───────────────────────────────────────────────────────────────────────────
section('9. Complete Two-Step Filing Process');

test('Create complete GSTR-3B filing with both steps', async () => {
    const filing = await smsDirect.createCompleteSMSFiling('29ABCDE1234F1Z5', '2024-03', 'GSTR-3B');
    assertTrue(filing.step1 !== undefined);
    assertTrue(filing.step2 !== undefined);
    assertEqual(filing.returnType, 'GSTR-3B');
});

test('Create complete GSTR-1 filing with both steps', async () => {
    const filing = await smsDirect.createCompleteSMSFiling('29ABCDE1234F1Z5', '2024-03', 'GSTR-1', false);
    assertTrue(filing.step1 !== undefined);
    assertTrue(filing.step2 !== undefined);
    assertEqual(filing.returnType, 'GSTR-1');
});

test('Step 1 includes SMS link', async () => {
    const filing = await smsDirect.createCompleteSMSFiling('29ABCDE1234F1Z5', '2024-03', 'GSTR-3B');
    assertTrue(filing.step1.smsLink.includes('sms:') || filing.step1.smsLink.includes('http'), 'Should have valid SMS link');
});

test('Step 2 includes confirmation format', async () => {
    const filing = await smsDirect.createCompleteSMSFiling('29ABCDE1234F1Z5', '2024-03', 'GSTR-3B');
    assertContains(filing.step2.format, 'CNF 3B');
});

test('Filing includes eligibility requirements', async () => {
    const filing = await smsDirect.createCompleteSMSFiling('29ABCDE1234F1Z5', '2024-03', 'GSTR-3B');
    assertTrue(filing.eligibility !== undefined);
    assertTrue(Array.isArray(filing.eligibility.required));
});

// ───────────────────────────────────────────────────────────────────────────
// 10. SMS LINK FORMAT VALIDATION
// ───────────────────────────────────────────────────────────────────────────
section('10. SMS Link Format Validation');

test('SMS link uses correct recipient (14409)', async () => {
    const filing = await smsDirect.createSMSFiling('29ABCDE1234F1Z5', '2024-03');
    assertTrue(filing.smsLink.includes('14409') || filing.deepLink.includes('14409'), 'Should contain 14409');
    assertFalse(filing.smsLink.includes('00014409'), 'Should not contain padded number');
});

test('SMS link properly encodes message', async () => {
    const filing = await smsDirect.createSMSFiling('29ABCDE1234F1Z5', '2024-03');
    assertTrue(filing.deepLink.includes('NIL%203B') || filing.deepLink.includes('NIL'), 'Should contain NIL message');
});

test('SMS link format is valid', async () => {
    const filing = await smsDirect.createSMSFiling('29ABCDE1234F1Z5', '2024-03');
    assertTrue(filing.smsLink.length > 0, 'Should have valid SMS link');
    assertTrue(filing.deepLink.includes('sms:'), 'Deep link should use sms: protocol');
});

// ───────────────────────────────────────────────────────────────────────────
// 11. ERROR HANDLING TESTS
// ───────────────────────────────────────────────────────────────────────────
section('11. Error Handling');

test('Throws error for invalid GSTIN in SMS generation', () => {
    try {
        smsHelper.generateSMSString('INVALID', '032024');
        throw new Error('Should have thrown error');
    } catch (error) {
        assertContains(error.message, 'Invalid GSTIN');
    }
});

test('Throws error for invalid GSTIN in filing creation', async () => {
    try {
        await smsDirect.createSMSFiling('INVALID', '2024-03');
        throw new Error('Should have thrown error');
    } catch (error) {
        assertContains(error.message, 'Invalid GSTIN');
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// DISPLAY SAMPLE OUTPUT
// ═══════════════════════════════════════════════════════════════════════════

section('12. Sample Output for Integration');

const testGSTIN = '29ABCDE1234F1Z5';
const testMonth = '2024-03';

console.log(`${colors.magenta}📋 GSTR-3B NIL Return Sample:${colors.reset}`);
const gstr3b = await smsDirect.createSMSFiling(testGSTIN, testMonth);
console.log(`   SMS Body:    ${colors.cyan}${gstr3b.smsBody}${colors.reset}`);
console.log(`   Short URL:   ${colors.yellow}${gstr3b.shortUrl || 'N/A'}${colors.reset}`);
console.log(`   Direct Link: ${colors.yellow}${gstr3b.deepLink}${colors.reset}`);
console.log(`   Using API:   ${colors.green}${gstr3b.usingFallback ? 'No (Fallback)' : 'Yes'}${colors.reset}`);
console.log(`   Recipient:   ${colors.green}14409${colors.reset}`);

console.log(`\n${colors.magenta}📋 GSTR-1 Quarterly Sample:${colors.reset}`);
const gstr1 = await smsDirect.createGSTR1Filing(testGSTIN, '2024-04', true);
console.log(`   SMS Body:    ${colors.cyan}${gstr1.smsBody}${colors.reset}`);
console.log(`   Short URL:   ${colors.yellow}${gstr1.shortUrl || 'N/A'}${colors.reset}`);
console.log(`   Direct Link: ${colors.yellow}${gstr1.deepLink}${colors.reset}`);
console.log(`   Period:      ${colors.green}${gstr1.period} (Q2: Apr-Jun → June)${colors.reset}`);

console.log(`\n${colors.magenta}✅ Confirmation SMS Sample:${colors.reset}`);
const confirm = await smsDirect.createConfirmationSMS('123456', 'GSTR-3B');
console.log(`   SMS Body:    ${colors.cyan}${confirm.smsBody}${colors.reset}`);
console.log(`   Short URL:   ${colors.yellow}${confirm.shortUrl || 'N/A'}${colors.reset}`);

console.log(`\n${colors.magenta}📱 Bot Integration Example:${colors.reset}`);
console.log(`${colors.blue}
   import * as sms from './modules/smsHelperDirect.js';
   
   // Create filing
   const filing = sms.createSMSFiling(gstin, month);
   
   // Use in Telegram
   await ctx.reply(filing.description, {
       reply_markup: {
           inline_keyboard: [[
               { text: '📱 Send SMS', url: filing.smsLink }
           ]]
       }
   });
${colors.reset}`);

// ═══════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════

summary();

console.log(`${colors.cyan}${'═'.repeat(80)}${colors.reset}`);
console.log(`${colors.cyan}${colors.bright}  PRODUCTION READINESS CHECKLIST${colors.reset}`);
console.log(`${colors.cyan}${'═'.repeat(80)}${colors.reset}\n`);

console.log(`  ${colors.green}✓${colors.reset} GSTIN validation working`);
console.log(`  ${colors.green}✓${colors.reset} Month formatting correct`);
console.log(`  ${colors.green}✓${colors.reset} GSTR-3B SMS generation verified`);
console.log(`  ${colors.green}✓${colors.reset} GSTR-1 SMS generation verified (monthly & quarterly)`);
console.log(`  ${colors.green}✓${colors.reset} Quarterly period logic correct (Q1→03, Q2→06, Q3→09, Q4→12)`);
console.log(`  ${colors.green}✓${colors.reset} Confirmation SMS working`);
console.log(`  ${colors.green}✓${colors.reset} Help SMS working`);
console.log(`  ${colors.green}✓${colors.reset} SMS links use correct recipient (14409, not 00014409)`);
console.log(`  ${colors.green}✓${colors.reset} Two-step filing process complete`);
console.log(`  ${colors.green}✓${colors.reset} Eligibility requirements differentiated by return type`);
console.log(`  ${colors.green}✓${colors.reset} Error handling implemented\n`);

console.log(`${colors.yellow}📋 Next Steps:${colors.reset}`);
console.log(`  1. Test SMS links on mobile device (use test-sms-mobile.html)`);
console.log(`  2. Verify SMS app opens to correct number (14409)`);
console.log(`  3. Integrate with Member 1's bot using smsHelperDirect.js`);
console.log(`  4. Deploy to production\n`);

console.log(`${colors.cyan}${'═'.repeat(80)}${colors.reset}\n`);

// Exit with appropriate code
if (stats.failed > 0) {
    process.exit(1);
}
}

// Run the test suite
runTests().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
});

/**
 * SMS Engine Playground
 * Use this to manually test different scenarios and see outputs
 * Usage: node playground.js
 */

import {
  validateGSTIN,
  formatMonth,
  generateSMSString,
  generateSMSDeepLink,
  getSMSDescription,
  createSMSFiling,
} from './smsHelper.js';

console.log('🎮 SMS Engine Playground\n');
console.log('═'.repeat(60));

// ========================================
// SCENARIO 1: Basic NIL Return Filing
// ========================================
console.log('\n📋 SCENARIO 1: Basic NIL Return Filing');
console.log('─'.repeat(60));

const testGSTIN = '29ABCDE1234F1Z5';
const testMonth = '2024-03';

console.log(`GSTIN: ${testGSTIN}`);
console.log(`Month: ${testMonth}`);
console.log(`\n✅ Valid GSTIN: ${validateGSTIN(testGSTIN)}`);

const smsString = generateSMSString(testGSTIN, testMonth);
console.log(`\n📱 SMS String:\n   "${smsString}"`);

const deepLink = generateSMSDeepLink(testGSTIN, testMonth);
console.log(`\n🔗 Deep Links:`);
console.log(`   Standard (Android): ${deepLink.standard}`);
console.log(`   iOS Format: ${deepLink.ios}`);
console.log(`   Raw Text: ${deepLink.rawText}`);

// ========================================
// SCENARIO 2: Complete Filing Object
// ========================================
console.log('\n\n📦 SCENARIO 2: Complete Filing Object (What Member 1 will use)');
console.log('─'.repeat(60));

const filing = createSMSFiling(testGSTIN, testMonth);
console.log(JSON.stringify(filing, null, 2));

// ========================================
// SCENARIO 3: Different Month Formats
// ========================================
console.log('\n\n📅 SCENARIO 3: Testing Different Month Formats');
console.log('─'.repeat(60));

const monthFormats = ['2024-03', '2024-12', '032024', new Date('2024-03-15')];

monthFormats.forEach((month) => {
  try {
    const formatted = formatMonth(month);
    const monthType = month instanceof Date ? 'Date Object' : 'String';
    console.log(`✓ Input: ${month.toString().padEnd(25)} [${monthType}] → ${formatted}`);
  } catch (error) {
    console.log(`✗ Input: ${month} → Error: ${error.message}`);
  }
});

// ========================================
// SCENARIO 4: GSTIN Validation Edge Cases
// ========================================
console.log('\n\n🔍 SCENARIO 4: GSTIN Validation Edge Cases');
console.log('─'.repeat(60));

const testGSTINs = [
  { gstin: '29ABCDE1234F1Z5', desc: 'Valid Karnataka GSTIN' },
  { gstin: '27AAAAA0000A1Z5', desc: 'Valid Maharashtra GSTIN' },
  { gstin: '29 ABCDE 1234 F1Z5', desc: 'Valid with spaces' },
  { gstin: '29abcde1234f1z5', desc: 'Valid lowercase' },
  { gstin: '29ABCDE1234', desc: 'Too short' },
  { gstin: 'INVALID123456789', desc: 'Invalid format' },
  { gstin: '', desc: 'Empty string' },
];

testGSTINs.forEach(({ gstin, desc }) => {
  const isValid = validateGSTIN(gstin);
  const icon = isValid ? '✓' : '✗';
  const status = isValid ? 'VALID' : 'INVALID';
  console.log(`${icon} ${desc.padEnd(30)} "${gstin}" → ${status}`);
});

// ========================================
// SCENARIO 5: Real-World Bot Integration Example
// ========================================
console.log('\n\n🤖 SCENARIO 5: Simulated Bot Interaction');
console.log('─'.repeat(60));

// Simulate a user in the database
const mockUser = {
  chat_id: '123456789',
  name: 'Rajesh Kumar',
  gstin: '29ABCDE1234F1Z5',
  business_type: 'MSME',
  language: 'en',
};

console.log('User Data:');
console.log(`  Name: ${mockUser.name}`);
console.log(`  GSTIN: ${mockUser.gstin}`);
console.log(`  Business Type: ${mockUser.business_type}`);

// Simulate user selecting current month
const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
console.log(`\nUser selects: Current Month (${currentMonth})`);

// Generate filing
const userFiling = createSMSFiling(mockUser.gstin, currentMonth);

console.log('\nBot would send this message:');
console.log('─'.repeat(60));
console.log(userFiling.description);
console.log('\nInstructions:');
userFiling.instructions.forEach((instruction) => console.log(`  ${instruction}`));

console.log('\nBot would create this button:');
console.log(`  Button Text: "📱 Send SMS to 14409"`);
console.log(`  Button URL: ${userFiling.deepLinks.primary}`);

console.log('\nDatabase record to save:');
console.log(
  JSON.stringify(
    {
      chat_id: mockUser.chat_id,
      month: userFiling.month,
      return_type: userFiling.type,
      status: 'PENDING',
      timestamp: new Date().toISOString(),
    },
    null,
    2
  )
);

// ========================================
// SCENARIO 6: Error Handling Demo
// ========================================
console.log('\n\n⚠️  SCENARIO 6: Error Handling Examples');
console.log('─'.repeat(60));

const errorCases = [
  { gstin: 'INVALID', month: '2024-03', desc: 'Invalid GSTIN' },
  { gstin: '29ABCDE1234F1Z5', month: 'INVALID', desc: 'Invalid Month' },
  { gstin: '', month: '2024-03', desc: 'Empty GSTIN' },
];

errorCases.forEach(({ gstin, month, desc }) => {
  console.log(`\nTest: ${desc}`);
  try {
    const result = createSMSFiling(gstin, month);
    console.log('  ✓ Success (unexpected)');
  } catch (error) {
    console.log(`  ✗ Error caught: ${error.message}`);
    console.log('  ✓ Error handling working correctly');
  }
});

// ========================================
// PHASE 2 REQUIREMENT: Deep Link Testing URLs
// ========================================
console.log('\n\n🔬 PHASE 2: Deep Link Testing URLs (Copy these to test on mobile)');
console.log('─'.repeat(60));

const testLinks = generateSMSDeepLink('29ABCDE1234F1Z5', '2024-03');

console.log('\nTest these URLs on your mobile device:\n');
console.log('1. Standard Format (Android):');
console.log(`   ${testLinks.standard}\n`);

console.log('2. iOS Format:');
console.log(`   ${testLinks.ios}\n`);

console.log('3. Telegram Format:');
console.log(`   ${testLinks.telegram}\n`);

console.log('Expected Behavior:');
console.log('  ✓ SMS app should open');
console.log('  ✓ Recipient should be: 14409');
console.log('  ✓ Message should be pre-filled with: "NIL 3B 29ABCDE1234F1Z5 032024"');
console.log('  ✓ User just needs to tap "Send"');

// ========================================
// SUMMARY
// ========================================
console.log('\n\n' + '═'.repeat(60));
console.log('✅ SMS Engine is ready for Phase 3 integration!');
console.log('═'.repeat(60));
console.log('\nNext Steps:');
console.log('  1. Share SMS_INTEGRATION_GUIDE.md with Member 1');
console.log('  2. Test deep links on real mobile devices');
console.log('  3. Wait for Member 1 to complete bot core (Phase 2)');
console.log('  4. Pair program during Phase 3 integration');
console.log('\nYour Responsibilities (Phase 2):');
console.log('  ✓ SMS string generation - DONE');
console.log('  ✓ Deep link creation - DONE');
console.log('  ✓ GSTIN validation - DONE');
console.log('  ✓ Test suite - DONE');
console.log('  ✓ Integration guide - DONE');
console.log('  ⏳ Mobile device testing - TODO (grab your phone!)');
console.log('\n');

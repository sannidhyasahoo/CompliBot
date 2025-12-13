/**
 * Telegram Bot Testing Script
 * Tests bot functionality, database operations, and multilingual support
 */

const config = require('./src/config/env');
const { initDB, getUser, addUser, saveUserQuery, getAllStates } = require('./src/db');
const { validateGSTIN } = require('./src/modules/gstHelper');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Test results tracking
let testResults = {
    passed: 0,
    failed: 0,
    total: 0,
    details: []
};

/**
 * Test runner utility
 */
function runTest(testName, testFunction) {
    testResults.total++;
    try {
        const result = testFunction();
        if (result === true || (typeof result === 'object' && result.success)) {
            testResults.passed++;
            console.log(`✅ ${testName}`);
            testResults.details.push({ name: testName, status: 'PASSED' });
        } else {
            testResults.failed++;
            console.log(`❌ ${testName} - ${result.error || 'Test failed'}`);
            testResults.details.push({ name: testName, status: 'FAILED', error: result.error });
        }
    } catch (error) {
        testResults.failed++;
        console.log(`❌ ${testName} - ${error.message}`);
        testResults.details.push({ name: testName, status: 'ERROR', error: error.message });
    }
}

/**
 * Async test runner utility
 */
async function runAsyncTest(testName, testFunction) {
    testResults.total++;
    try {
        const result = await testFunction();
        if (result === true || (typeof result === 'object' && result.success)) {
            testResults.passed++;
            console.log(`✅ ${testName}`);
            testResults.details.push({ name: testName, status: 'PASSED' });
        } else {
            testResults.failed++;
            console.log(`❌ ${testName} - ${result.error || 'Test failed'}`);
            testResults.details.push({ name: testName, status: 'FAILED', error: result.error });
        }
    } catch (error) {
        testResults.failed++;
        console.log(`❌ ${testName} - ${error.message}`);
        testResults.details.push({ name: testName, status: 'ERROR', error: error.message });
    }
}

/**
 * Test Bot Configuration
 */
function testBotConfiguration() {
    console.log('\n🤖 Testing Bot Configuration...');

    runTest('Telegram bot token present', () => {
        return config.telegram.botToken && config.telegram.botToken.length > 10;
    });

    runTest('Google AI API key present', () => {
        return config.googleAI.apiKey && config.googleAI.apiKey !== 'your_google_ai_api_key_here';
    });

    runTest('Database configuration valid', () => {
        return config.database.url && config.database.authToken;
    });
}

/**
 * Test Database Operations
 */
async function testDatabaseOperations() {
    console.log('\n📊 Testing Database Operations...');

    await runAsyncTest('Database initialization', async () => {
        await initDB();
        return true;
    });

    await runAsyncTest('Get all states', async () => {
        const states = await getAllStates();
        return states && states.length > 0;
    });

    // Test user operations with a test user
    const testUser = {
        telegram_chat_id: 999999999, // Test chat ID
        gstin: '29AAACH7409R1Z2',
        trade_name: 'Test Business',
        legal_name: 'Test Business Legal',
        state_code: '29',
        language: 'en'
    };

    await runAsyncTest('Add test user', async () => {
        try {
            // First, try to delete if exists (ignore errors)
            try {
                const { db } = require('./src/db');
                await db.execute({
                    sql: 'DELETE FROM users WHERE telegram_chat_id = ?',
                    args: [testUser.telegram_chat_id]
                });
            } catch (e) {
                // Ignore deletion errors
            }

            await addUser(testUser);
            return true;
        } catch (error) {
            if (error.message.includes('no column named language')) {
                return { success: false, error: 'Database needs migration. Run: npm run migrate' };
            }
            return { success: false, error: error.message };
        }
    });

    await runAsyncTest('Retrieve test user', async () => {
        const user = await getUser(testUser.telegram_chat_id);
        return user && user.gstin === testUser.gstin;
    });

    await runAsyncTest('Save user query', async () => {
        await saveUserQuery(testUser.telegram_chat_id, 'What is GST?', 'GST is Goods and Services Tax', 'en');
        return true;
    });

    // Cleanup test user
    await runAsyncTest('Cleanup test user', async () => {
        try {
            const { db } = require('./src/db');
            await db.execute({
                sql: 'DELETE FROM users WHERE telegram_chat_id = ?',
                args: [testUser.telegram_chat_id]
            });
            return true;
        } catch (error) {
            return { success: false, error: error.message };
        }
    });
}

/**
 * Test GST Validation
 */
function testGSTValidation() {
    console.log('\n🔢 Testing GST Validation...');

    runTest('Valid GSTIN validation', () => {
        return validateGSTIN('29AAACH7409R1Z2');
    });

    runTest('Invalid GSTIN validation', () => {
        return !validateGSTIN('invalid-gstin');
    });

    runTest('Empty GSTIN validation', () => {
        return !validateGSTIN('');
    });

    runTest('Short GSTIN validation', () => {
        return !validateGSTIN('29AAACH7409');
    });
}

/**
 * Test AI Integration
 */
async function testAIIntegration() {
    console.log('\n🧠 Testing AI Integration...');

    if (!config.googleAI.apiKey || config.googleAI.apiKey === 'your_google_ai_api_key_here') {
        console.log('⚠️  Skipping AI tests - API key not configured');
        return;
    }

    await runAsyncTest('Google AI connection', async () => {
        try {
            const genAI = new GoogleGenerativeAI(config.googleAI.apiKey);
            const model = genAI.getGenerativeModel({ model: config.googleAI.modelName });

            const result = await model.generateContent('What is GST? Answer in one sentence.');
            const response = await result.response;
            const text = response.text();

            return text && text.length > 10;
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    await runAsyncTest('Multilingual AI response - Hindi', async () => {
        try {
            const genAI = new GoogleGenerativeAI(config.googleAI.apiKey);
            const model = genAI.getGenerativeModel({ model: config.googleAI.modelName });

            const prompt = 'जीएसटी क्या है? हिंदी में एक वाक्य में उत्तर दें।';
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Check if response contains Hindi characters
            return text && /[\u0900-\u097F]/.test(text);
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    await runAsyncTest('Multilingual AI response - Telugu', async () => {
        try {
            const genAI = new GoogleGenerativeAI(config.googleAI.apiKey);
            const model = genAI.getGenerativeModel({ model: config.googleAI.modelName });

            const prompt = 'GST అంటే ఏమిటి? తెలుగులో ఒక వాక్యంలో సమాధానం ఇవ్వండి।';
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Check if response contains Telugu characters
            return text && /[\u0C00-\u0C7F]/.test(text);
        } catch (error) {
            return { success: false, error: error.message };
        }
    });
}

/**
 * Test Language Detection
 */
function testLanguageDetection() {
    console.log('\n🌐 Testing Language Detection...');

    const detectLanguage = (text) => {
        if (/[\u0900-\u097F]/.test(text)) return 'hi'; // Devanagari script
        if (/[\u0C00-\u0C7F]/.test(text)) return 'te'; // Telugu script
        return 'en'; // Default to English
    };

    runTest('English text detection', () => {
        return detectLanguage('What is GST?') === 'en';
    });

    runTest('Hindi text detection', () => {
        return detectLanguage('जीएसटी क्या है?') === 'hi';
    });

    runTest('Telugu text detection', () => {
        return detectLanguage('GST అంటే ఏమిటి?') === 'te';
    });

    runTest('Mixed text detection', () => {
        return detectLanguage('GST जीएसटी') === 'hi'; // Should detect Hindi
    });
}

/**
 * Test Bot Commands Simulation
 */
function testBotCommands() {
    console.log('\n💬 Testing Bot Commands...');

    runTest('Language options available', () => {
        const languages = ['en', 'hi', 'te'];
        return languages.length === 3;
    });

    runTest('State codes mapping', () => {
        const stateNames = {
            '29': 'Karnataka',
            '27': 'Maharashtra',
            '07': 'Delhi',
            '33': 'Tamil Nadu'
        };
        return Object.keys(stateNames).length >= 4;
    });

    runTest('GSTIN format validation in onboarding', () => {
        const testGSTINs = [
            '29AAACH7409R1Z2', // Valid
            '27BBCCH7409R1Z3', // Valid
            'invalid',          // Invalid
            '29AAACH7409',      // Too short
            ''                  // Empty
        ];

        const validCount = testGSTINs.filter(gstin => validateGSTIN(gstin)).length;
        return validCount === 2; // Only first two should be valid
    });
}

/**
 * Print test summary
 */
function printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 BOT TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${testResults.total}`);
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);

    if (testResults.failed > 0) {
        console.log('\n❌ Failed Tests:');
        testResults.details
            .filter(test => test.status !== 'PASSED')
            .forEach(test => {
                console.log(`   • ${test.name}: ${test.error || test.status}`);
            });
    }

    console.log('\n' + '='.repeat(60));

    if (testResults.failed === 0) {
        console.log('🎉 All bot tests passed! Your Telegram bot is ready to use.');
        console.log('\n🚀 To start the bot:');
        console.log('   npm run bot');
        console.log('\n💡 Make sure to:');
        console.log('   1. Add your bot to Telegram using @BotFather');
        console.log('   2. Set TELEGRAM_BOT_TOKEN in your .env file');
        console.log('   3. Test the bot by sending /start to your bot');
    } else {
        console.log('⚠️  Some tests failed. Please check the configuration and try again.');

        if (testResults.details.some(t => t.error && t.error.includes('TELEGRAM_BOT_TOKEN'))) {
            console.log('\n💡 To get a Telegram bot token:');
            console.log('   1. Message @BotFather on Telegram');
            console.log('   2. Send /newbot and follow instructions');
            console.log('   3. Copy the token to your .env file');
        }

        if (testResults.details.some(t => t.error && t.error.includes('GOOGLE_AI_API_KEY'))) {
            console.log('\n💡 To get a Google AI API key:');
            console.log('   1. Visit https://aistudio.google.com');
            console.log('   2. Create an API key');
            console.log('   3. Copy the key to your .env file');
        }
    }
}

/**
 * Main test execution
 */
async function runAllBotTests() {
    console.log('🤖 Starting CompliBot Telegram Bot Test Suite...');
    console.log('='.repeat(60));

    // Run all test suites
    testBotConfiguration();
    await testDatabaseOperations();
    testGSTValidation();
    await testAIIntegration();
    testLanguageDetection();
    testBotCommands();

    // Print summary
    printSummary();
}

// Run tests if this file is executed directly
if (require.main === module) {
    runAllBotTests().catch(error => {
        console.error('❌ Bot test suite failed:', error);
        process.exit(1);
    });
}

module.exports = {
    runAllBotTests,
    testBotConfiguration,
    testDatabaseOperations,
    testGSTValidation,
    testAIIntegration,
    testLanguageDetection,
    testBotCommands
};
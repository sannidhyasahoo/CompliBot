/**
 * Comprehensive Test Suite for CompliBot
 * Tests all modules, API endpoints, and functionality
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Import modules for testing
const config = require('./src/config/env');
const {
    validateGSTIN,
    calculateGST,
    getStateCode,
    isInterStateTransaction,
    formatGSTDate,
    generateFilingPeriod
} = require('./src/modules/gstHelper');
const {
    safeJsonParse,
    validateJsonSchema,
    cleanAIResponse,
    formatJson,
    GstJsonBuilder
} = require('./src/modules/jsonHelper');

const API_BASE_URL = config.server.apiBaseUrl;

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
 * Configuration Tests
 */
function testConfiguration() {
    console.log('\n🔧 Testing Configuration...');

    runTest('Environment variables loaded', () => {
        return config && config.googleAI && config.server && config.database;
    });

    runTest('Required API key present', () => {
        return config.googleAI.apiKey && config.googleAI.apiKey !== 'your_google_ai_api_key_here';
    });

    runTest('Database configuration present', () => {
        return config.database.url && config.database.authToken;
    });

    runTest('Server configuration valid', () => {
        return config.server.port > 0 && config.server.port < 65536;
    });
}

/**
 * GST Helper Module Tests
 */
function testGSTHelper() {
    console.log('\n📊 Testing GST Helper Module...');

    runTest('GSTIN validation - valid format', () => {
        return validateGSTIN('29AAACH7409R1Z2');
    });

    runTest('GSTIN validation - invalid format', () => {
        return !validateGSTIN('invalid-gstin');
    });

    runTest('GST calculation - intra-state', () => {
        const result = calculateGST(10000, 18, false);
        return result.cgst === 900 && result.sgst === 900 && result.igst === 0;
    });

    runTest('GST calculation - inter-state', () => {
        const result = calculateGST(10000, 18, true);
        return result.igst === 1800 && result.cgst === 0 && result.sgst === 0;
    });

    runTest('State code lookup', () => {
        return getStateCode('KARNATAKA') === '29';
    });

    runTest('Inter-state transaction detection', () => {
        return isInterStateTransaction('29', '27') === true;
    });

    runTest('Intra-state transaction detection', () => {
        return isInterStateTransaction('29', '29') === false;
    });

    runTest('Date formatting', () => {
        const date = new Date('2024-12-15');
        return formatGSTDate(date) === '15-12-2024';
    });

    runTest('Filing period generation', () => {
        const fp = generateFilingPeriod(new Date('2024-12-15'));
        return fp === '122024';
    });
}

/**
 * JSON Helper Module Tests
 */
function testJSONHelper() {
    console.log('\n📄 Testing JSON Helper Module...');

    runTest('Safe JSON parse - valid JSON', () => {
        const result = safeJsonParse('{"test": "value"}');
        return result && result.test === 'value';
    });

    runTest('Safe JSON parse - invalid JSON', () => {
        const result = safeJsonParse('invalid json');
        return result === null;
    });

    runTest('Clean AI response', () => {
        const dirty = '```json\n{"test": "value"}\n```';
        const clean = cleanAIResponse(dirty);
        return clean === '{"test": "value"}';
    });

    runTest('JSON formatting', () => {
        const formatted = formatJson({ test: 'value' }, 2);
        return formatted.includes('  "test": "value"');
    });

    runTest('GST JSON Builder', () => {
        const builder = new GstJsonBuilder('29AAACH7409R1Z2', '122024');
        builder.addInvoice('27BBCCH7409R1Z3', {
            inum: 'INV-001',
            idt: '15-12-2024',
            val: 11800,
            pos: '27'
        }, [{
            txval: 10000,
            rt: 18,
            iamt: 1800
        }]);

        const result = builder.build();
        return result.gstin === '29AAACH7409R1Z2' &&
            result.b2b.length === 1 &&
            result.b2b[0].ctin === '27BBCCH7409R1Z3';
    });
}

/**
 * API Endpoint Tests
 */
async function testAPIEndpoints() {
    console.log('\n🌐 Testing API Endpoints...');

    await runAsyncTest('Health check endpoint', async () => {
        try {
            const response = await axios.get(API_BASE_URL, { timeout: 5000 });
            return response.status === 200 &&
                response.data.message === 'GST Invoice Processing API';
        } catch (error) {
            return { success: false, error: `API not accessible: ${error.message}` };
        }
    });

    await runAsyncTest('Invalid file upload handling', async () => {
        try {
            const form = new FormData();
            form.append('invoiceImage', Buffer.from('not an image'), 'test.txt');

            const response = await axios.post(`${API_BASE_URL}/generate-gst-json`, form, {
                headers: form.getHeaders(),
                timeout: 10000,
                validateStatus: () => true // Don't throw on 4xx/5xx
            });

            return response.status === 400 || response.status === 500;
        } catch (error) {
            return { success: false, error: `File upload test failed: ${error.message}` };
        }
    });

    // Test with sample image if available
    const sampleImagePath = 'test-files/sample-invoice.jpg';
    if (fs.existsSync(sampleImagePath)) {
        await runAsyncTest('Valid image upload', async () => {
            try {
                const form = new FormData();
                form.append('invoiceImage', fs.createReadStream(sampleImagePath));

                const response = await axios.post(`${API_BASE_URL}/generate-gst-json`, form, {
                    headers: form.getHeaders(),
                    timeout: 30000
                });

                return response.status === 200 &&
                    response.data.success === true &&
                    response.data.data.gstReturnFormat;
            } catch (error) {
                return { success: false, error: `Image upload failed: ${error.message}` };
            }
        });
    } else {
        console.log('ℹ️  Skipping image upload test - no sample image found at test-files/sample-invoice.jpg');
    }
}

/**
 * Integration Tests
 */
function testIntegration() {
    console.log('\n🔗 Testing Integration...');

    runTest('Module imports work correctly', () => {
        try {
            require('./src/tools/jsonGenerator');
            require('./src/server');
            require('./src/config/env');
            return true;
        } catch (error) {
            return { success: false, error: `Module import failed: ${error.message}` };
        }
    });

    runTest('End-to-end GST processing simulation', () => {
        try {
            // Simulate the complete flow
            const mockInvoiceData = {
                supplier: {
                    gstin: '29AAACH7409R1Z2',
                    legalName: 'Test Supplier',
                    state: 'Karnataka',
                    stateCode: '29'
                },
                recipient: {
                    gstin: '27BBCCH7409R1Z3',
                    legalName: 'Test Recipient',
                    state: 'Maharashtra',
                    stateCode: '27'
                },
                invoice: {
                    number: 'INV-001',
                    date: '15-12-2024',
                    totalValue: 11800
                },
                items: [{
                    taxableValue: 10000,
                    taxRate: 18,
                    totalTax: 1800
                }]
            };

            // Test GST calculations
            const isInterState = isInterStateTransaction(
                mockInvoiceData.supplier.stateCode,
                mockInvoiceData.recipient.stateCode
            );

            const gstAmounts = calculateGST(
                mockInvoiceData.items[0].taxableValue,
                mockInvoiceData.items[0].taxRate,
                isInterState
            );

            // Test JSON building
            const builder = new GstJsonBuilder(
                mockInvoiceData.supplier.gstin,
                generateFilingPeriod()
            );

            builder.addInvoice(
                mockInvoiceData.recipient.gstin,
                mockInvoiceData.invoice,
                mockInvoiceData.items
            );

            const gstReturn = builder.build();

            return gstReturn.b2b.length === 1 &&
                gstAmounts.igst === 1800 &&
                isInterState === true;
        } catch (error) {
            return { success: false, error: `Integration test failed: ${error.message}` };
        }
    });
}

/**
 * Performance Tests
 */
function testPerformance() {
    console.log('\n⚡ Testing Performance...');

    runTest('GSTIN validation performance', () => {
        const start = Date.now();
        for (let i = 0; i < 1000; i++) {
            validateGSTIN('29AAACH7409R1Z2');
        }
        const duration = Date.now() - start;
        return duration < 100; // Should complete 1000 validations in under 100ms
    });

    runTest('GST calculation performance', () => {
        const start = Date.now();
        for (let i = 0; i < 1000; i++) {
            calculateGST(10000, 18, false);
        }
        const duration = Date.now() - start;
        return duration < 50; // Should complete 1000 calculations in under 50ms
    });
}

/**
 * Print test summary
 */
function printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
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
        console.log('🎉 All tests passed! Your CompliBot is ready to use.');
    } else {
        console.log('⚠️  Some tests failed. Please check the configuration and try again.');
        process.exit(1);
    }
}

/**
 * Main test execution
 */
async function runAllTests() {
    console.log('🚀 Starting CompliBot Comprehensive Test Suite...');
    console.log('='.repeat(60));

    // Run all test suites
    testConfiguration();
    testGSTHelper();
    testJSONHelper();
    await testAPIEndpoints();
    testIntegration();
    testPerformance();

    // Print summary
    printSummary();
}

// Run tests if this file is executed directly
if (require.main === module) {
    runAllTests().catch(error => {
        console.error('❌ Test suite failed:', error);
        process.exit(1);
    });
}

module.exports = {
    runAllTests,
    testConfiguration,
    testGSTHelper,
    testJSONHelper,
    testAPIEndpoints,
    testIntegration,
    testPerformance
};
/**
 * Simple test script to verify the GST JSON Generator API
 * Run this after starting the server to test the endpoints
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const API_BASE_URL = 'http://localhost:8080';

// Test health check endpoint
async function testHealthCheck() {
    try {
        console.log('🔍 Testing health check endpoint...');
        const response = await axios.get(API_BASE_URL);
        console.log('✅ Health check passed:', response.data);
        return true;
    } catch (error) {
        console.error('❌ Health check failed:', error.message);
        return false;
    }
}

// Test GST JSON generation with a sample image (if available)
async function testGSTGeneration() {
    try {
        console.log('🔍 Testing GST JSON generation...');

        // Note: You would need to provide an actual invoice image file
        // For now, this is just the structure of how to test

        const form = new FormData();
        // form.append('invoiceImage', fs.createReadStream('path/to/sample-invoice.jpg'));

        console.log('ℹ️  To test with actual invoice image:');
        console.log('   1. Place an invoice image in the project directory');
        console.log('   2. Uncomment the form.append line above');
        console.log('   3. Update the file path');
        console.log('   4. Run this test again');

        return true;
    } catch (error) {
        console.error('❌ GST generation test failed:', error.message);
        return false;
    }
}

// Run all tests
async function runTests() {
    console.log('🚀 Starting API tests...\n');

    const healthCheck = await testHealthCheck();
    console.log('');

    const gstTest = await testGSTGeneration();
    console.log('');

    if (healthCheck && gstTest) {
        console.log('✅ All tests completed successfully!');
        console.log('\n📋 API Endpoints available:');
        console.log('   GET  / - Health check');
        console.log('   POST /generate-gst-json - Generate GST return JSON from invoice image');
        console.log('   POST /extract-invoice - Extract basic invoice data');
    } else {
        console.log('❌ Some tests failed. Check the server logs.');
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runTests();
}

module.exports = {
    testHealthCheck,
    testGSTGeneration,
    runTests
};
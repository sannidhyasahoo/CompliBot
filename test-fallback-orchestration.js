/**
 * Test script for Fallback Orchestration Layer
 */

require('dotenv').config();
const FallbackOrchestrator = require('./src/ai/fallbackOrchestrator');

async function testFallbackOrchestration() {
    console.log('🧪 Testing Fallback Orchestration Layer...\n');

    const orchestrator = new FallbackOrchestrator();

    // Test cases
    const testCases = [
        {
            name: 'GST Query Intent',
            input: 'What is the GST rate for rice?',
            context: { gstin: '29ABCDE1234F1Z5' }
        },
        {
            name: 'SMS Filing Intent',
            input: 'File NIL return for March 2024',
            context: { gstin: '29ABCDE1234F1Z5' }
        },
        {
            name: 'JSON Generation Intent',
            input: 'Generate GST JSON from my invoice',
            context: { gstin: '29ABCDE1234F1Z5' }
        },
        {
            name: 'Calculation Intent',
            input: 'Calculate GST on 10000 at 18%',
            context: { gstin: '29ABCDE1234F1Z5' }
        },
        {
            name: 'General Help',
            input: 'Hello, what can you do?',
            context: { gstin: '29ABCDE1234F1Z5' }
        }
    ];

    for (const testCase of testCases) {
        console.log(`📋 Testing: ${testCase.name}`);
        console.log(`💬 Input: "${testCase.input}"`);

        try {
            const result = await orchestrator.processRequest(testCase.input, testCase.context);

            console.log(`✅ Success: ${result.success}`);
            console.log(`🎯 Intent: ${result.intent}`);
            console.log(`📝 Response: ${result.message.substring(0, 150)}...`);

            if (result.actions) {
                console.log(`🔧 Actions: ${result.actions.length} action(s)`);
            }

        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
        }

        console.log('─'.repeat(50));
    }

    console.log('🎉 Fallback Orchestration test completed!');
}

// Run tests
testFallbackOrchestration().catch(console.error);
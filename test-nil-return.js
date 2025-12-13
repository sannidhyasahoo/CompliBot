/**
 * Test script for NIL Return Tool
 */

require('dotenv').config();

const { generateNILReturnLink, generateQuickNIL, getNILReturnHelp } = require('./src/tools/nilReturnTool');

async function testNILReturnTool() {
    console.log('🧪 Testing NIL Return Tool\n');

    // Test 1: Generate NIL return link
    console.log('1. Testing NIL return link generation...');
    try {
        const result = await generateNILReturnLink({
            gstin: '29AAACH7409R1Z2',
            period: '112024',
            returnType: 'GSTR-3B'
        });

        if (result.success) {
            console.log('✅ NIL return link generated successfully');
            console.log(`   Period: ${result.data.period.display}`);
            console.log(`   GSTIN: ${result.data.taxpayer.gstin}`);
            console.log(`   SMS Link: ${result.data.links.primary || 'Fallback link available'}`);
            console.log(`   SMS Body: ${result.data.filing.smsBody.substring(0, 50)}...`);
        } else {
            console.log('❌ Failed:', result.message);
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
    }

    console.log('\n2. Testing GSTR-1 NIL return...');
    try {
        const result = await generateNILReturnLink({
            gstin: '29AAACH7409R1Z2',
            period: '112024',
            returnType: 'GSTR-1',
            isQuarterly: false
        });

        if (result.success) {
            console.log('✅ GSTR-1 NIL return generated successfully');
            console.log(`   Return Type: ${result.data.period.returnType}`);
            console.log(`   SMS Link: ${result.data.links.primary || 'Fallback link available'}`);
        } else {
            console.log('❌ Failed:', result.message);
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
    }

    console.log('\n3. Testing help information...');
    try {
        const result = await getNILReturnHelp({
            returnType: 'GSTR-3B'
        });

        if (result.success) {
            console.log('✅ Help information generated successfully');
            console.log(`   Instructions: ${result.data.instructions.length} steps`);
            console.log(`   Common Issues: ${result.data.commonIssues.length} items`);
        } else {
            console.log('❌ Failed:', result.message);
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
    }

    console.log('\n✅ NIL Return Tool testing completed!');
    console.log('\n📱 Features available:');
    console.log('• Clickable SMS links for easy filing');
    console.log('• Support for both GSTR-3B and GSTR-1');
    console.log('• Automatic period formatting');
    console.log('• Step-by-step instructions');
    console.log('• Confirmation SMS generation');
    console.log('• Fallback links for compatibility');
}

// Run test
testNILReturnTool().catch(console.error);
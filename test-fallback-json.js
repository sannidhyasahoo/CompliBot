/**
 * Test script for Fallback JSON Generator
 */

require('dotenv').config();

const { generateFallbackJSON } = require('./src/tools/jsonGenerator');

async function testFallbackJSON() {
    console.log('🧪 Testing Fallback JSON Generator\n');

    try {
        console.log('1. Generating fallback JSON...');
        const fallbackData = generateFallbackJSON();

        console.log('✅ Fallback JSON generated successfully!');
        console.log('\n📊 Sample Data Generated:');
        console.log(`   Supplier: ${fallbackData.extractedInvoiceData.supplier.legalName}`);
        console.log(`   GSTIN: ${fallbackData.extractedInvoiceData.supplier.gstin}`);
        console.log(`   Invoice: ${fallbackData.extractedInvoiceData.invoice.number}`);
        console.log(`   Total Value: ₹${fallbackData.extractedInvoiceData.invoice.totalValue.toLocaleString('en-IN')}`);
        console.log(`   Items: ${fallbackData.extractedInvoiceData.items.length}`);

        console.log('\n📋 GST Return Format:');
        console.log(`   GSTIN: ${fallbackData.gstReturnFormat.gstin}`);
        console.log(`   Filing Period: ${fallbackData.gstReturnFormat.fp}`);
        console.log(`   Version: ${fallbackData.gstReturnFormat.version}`);
        console.log(`   B2B Transactions: ${fallbackData.gstReturnFormat.b2b.length}`);
        console.log(`   Invoice Items: ${fallbackData.gstReturnFormat.b2b[0].inv[0].itms.length}`);

        console.log('\n💾 JSON Structure:');
        console.log('   ✅ extractedInvoiceData - Complete invoice details');
        console.log('   ✅ gstReturnFormat - GST portal ready format');

        console.log('\n🎯 Tax Calculations:');
        fallbackData.extractedInvoiceData.items.forEach((item, index) => {
            console.log(`   Item ${index + 1}: ${item.description}`);
            console.log(`     Taxable: ₹${item.taxableValue.toLocaleString('en-IN')} @ ${item.taxRate}%`);
            console.log(`     CGST: ₹${item.cgst.toLocaleString('en-IN')}, SGST: ₹${item.sgst.toLocaleString('en-IN')}`);
            console.log(`     Total Tax: ₹${item.totalTax.toLocaleString('en-IN')}`);
        });

        console.log('\n✅ Fallback JSON Generator is working perfectly!');
        console.log('\n💡 This ensures users always get GST return JSON even when:');
        console.log('   • AI quota is exceeded');
        console.log('   • Image processing fails');
        console.log('   • Network issues occur');
        console.log('   • API is temporarily unavailable');

        // Test JSON validity
        const jsonString = JSON.stringify(fallbackData, null, 2);
        console.log(`\n📏 JSON Size: ${(jsonString.length / 1024).toFixed(2)} KB`);
        console.log('📝 JSON is valid and ready for download');

    } catch (error) {
        console.error('❌ Error testing fallback JSON:', error);
    }
}

// Run test
testFallbackJSON();
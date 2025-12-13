/**
 * Example usage of the GST Invoice Processing API
 * This demonstrates how to use the API endpoints
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const API_BASE_URL = 'http://localhost:8080';

/**
 * Example: Generate GST return JSON from invoice image
 */
async function generateGSTFromInvoice(imagePath) {
    try {
        console.log('📄 Processing invoice:', imagePath);

        // Create form data with the invoice image
        const form = new FormData();
        form.append('invoiceImage', fs.createReadStream(imagePath));

        // Send request to API
        const response = await axios.post(`${API_BASE_URL}/generate-gst-json`, form, {
            headers: {
                ...form.getHeaders(),
                'Content-Type': 'multipart/form-data'
            }
        });

        if (response.data.success) {
            console.log('✅ GST JSON generated successfully!');
            console.log('\n📊 Extracted Invoice Data:');
            console.log(JSON.stringify(response.data.data.extractedInvoiceData, null, 2));

            console.log('\n📋 GST Return Format:');
            console.log(JSON.stringify(response.data.data.gstReturnFormat, null, 2));

            return response.data.data;
        } else {
            console.error('❌ API Error:', response.data.error);
            return null;
        }

    } catch (error) {
        console.error('❌ Request failed:', error.message);
        if (error.response) {
            console.error('Response:', error.response.data);
        }
        return null;
    }
}

/**
 * Example: Check API health
 */
async function checkAPIHealth() {
    try {
        const response = await axios.get(API_BASE_URL);
        console.log('✅ API is running:', response.data.message);
        console.log('📋 Available endpoints:', response.data.endpoints);
        return true;
    } catch (error) {
        console.error('❌ API is not accessible:', error.message);
        return false;
    }
}

/**
 * Main example function
 */
async function runExample() {
    console.log('🚀 GST Invoice Processing API Example\n');

    // Check if API is running
    const isHealthy = await checkAPIHealth();
    if (!isHealthy) {
        console.log('\n💡 Make sure to start the server first:');
        console.log('   npm start');
        return;
    }

    console.log('\n📝 To test with an actual invoice:');
    console.log('1. Place your invoice image (JPG/PNG/PDF) in the project directory');
    console.log('2. Update the imagePath variable below');
    console.log('3. Uncomment the generateGSTFromInvoice call');

    // Example usage (uncomment and update path when you have an invoice image)
    // const imagePath = './sample-invoice.jpg';
    // if (fs.existsSync(imagePath)) {
    //     await generateGSTFromInvoice(imagePath);
    // } else {
    //     console.log('❌ Invoice image not found:', imagePath);
    // }

    console.log('\n📋 Expected GST Return JSON Structure:');
    console.log(`{
  "gstin": "29AAACH7409R1Z2",
  "fp": "122024",
  "version": "GST3.2.3", 
  "hash": "hash_placeholder",
  "b2b": [
    {
      "ctin": "27BBCCH7409R1Z3",
      "inv": [
        {
          "inum": "INV-001",
          "idt": "15-12-2024",
          "val": 11800,
          "pos": "27",
          "rchrg": "N",
          "diff_percent": 0.65,
          "inv_typ": "R",
          "itms": [
            {
              "num": 1,
              "itm_det": {
                "txval": 10000,
                "rt": 18,
                "iamt": 1800,
                "camt": 0,
                "samt": 0,
                "csamt": 0
              }
            }
          ]
        }
      ]
    }
  ]
}`);
}

// Run example if this file is executed directly
if (require.main === module) {
    runExample();
}

module.exports = {
    generateGSTFromInvoice,
    checkAPIHealth,
    runExample
};
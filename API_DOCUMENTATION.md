# GST Invoice Processing API

A Node.js API that extracts data from GST invoice images and generates structured JSON in GST return format using Google's Gemini AI.

## Features

- **Invoice Data Extraction**: Extract comprehensive GST invoice details from images
- **GST Return Format**: Generate JSON in standard GST return format (B2B transactions)
- **State Code Validation**: Automatic state code validation and mapping
- **Tax Calculations**: Intelligent CGST/SGST vs IGST calculation based on inter-state transactions
- **GSTIN Validation**: Validate GSTIN format and extract state codes

## API Endpoints

### 1. Health Check
```
GET /
```
Returns API status and available endpoints.

### 2. Generate GST Return JSON
```
POST /generate-gst-json
```
Upload an invoice image and get structured GST return JSON.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: `invoiceImage` (file) - Invoice image (JPG, PNG, PDF)

**Response:**
```json
{
  "success": true,
  "data": {
    "extractedInvoiceData": {
      "supplier": {
        "gstin": "29AAACH7409R1Z2",
        "legalName": "ABC Company Ltd",
        "tradeName": "ABC Traders",
        "address": "123 Main St, Bangalore",
        "state": "Karnataka",
        "stateCode": "29"
      },
      "recipient": {
        "gstin": "27BBCCH7409R1Z3",
        "legalName": "XYZ Corp",
        "tradeName": "XYZ Enterprises",
        "address": "456 Park Ave, Mumbai",
        "state": "Maharashtra", 
        "stateCode": "27"
      },
      "invoice": {
        "number": "INV-2024-001",
        "date": "15-12-2024",
        "totalValue": 11800,
        "placeOfSupply": "27",
        "invoiceType": "R"
      },
      "items": [
        {
          "description": "Product A",
          "hsnCode": "1234",
          "quantity": 10,
          "unitPrice": 1000,
          "taxableValue": 10000,
          "taxRate": 18,
          "cgst": 0,
          "sgst": 0,
          "igst": 1800,
          "totalTax": 1800
        }
      ]
    },
    "gstReturnFormat": {
      "gstin": "29AAACH7409R1Z2",
      "fp": "122024",
      "version": "GST3.2.3",
      "hash": "hash_placeholder",
      "b2b": [
        {
          "ctin": "27BBCCH7409R1Z3",
          "inv": [
            {
              "inum": "INV-2024-001",
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
    }
  }
}
```

## Data Extraction Capabilities

The API intelligently extracts the following data from GST invoices:

### Supplier Information
- GSTIN (with validation)
- Legal Name
- Trade Name
- Complete Address
- State Name and Code

### Recipient Information
- GSTIN (with validation)
- Legal Name
- Trade Name
- Complete Address
- State Name and Code

### Invoice Details
- Invoice Number
- Invoice Date (formatted as DD-MM-YYYY)
- Total Invoice Value
- Place of Supply
- Invoice Type (Regular, Debit Note, Credit Note, etc.)

### Item Details
- Item Description
- HSN/SAC Code
- Quantity
- Unit Price
- Taxable Value
- Tax Rate (%)
- CGST/SGST/IGST amounts
- Total Tax Amount

## GST Calculations

The API automatically:
- Determines if transaction is inter-state (IGST) or intra-state (CGST+SGST)
- Calculates tax amounts based on taxable value and rates
- Validates GSTIN format and extracts state codes
- Maps state names to standard GST state codes
- Generates filing period in MMYYYY format

## Installation & Setup

1. **Install Dependencies:**
```bash
npm install
```

2. **Configure API Key:**
Update the `API_KEY` in `src/tools/jsonGenerator.js` with your Google AI Studio API key.

3. **Start Server:**
```bash
node src/server.js
```

4. **Test API:**
```bash
node test-api.js
```

## Usage Example

```javascript
const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

const form = new FormData();
form.append('invoiceImage', fs.createReadStream('invoice.jpg'));

const response = await axios.post('http://localhost:8080/generate-gst-json', form, {
  headers: form.getHeaders()
});

console.log(response.data);
```

## Error Handling

The API provides detailed error messages for:
- Missing or invalid invoice images
- AI processing errors
- Invalid GSTIN formats
- JSON parsing errors
- Network/API key issues

## File Structure

```
src/
├── server.js              # Main Express server
├── tools/
│   └── jsonGenerator.js   # GST JSON generation logic
└── modules/
    ├── gstHelper.js       # GST utility functions
    ├── jsonHelper.js      # JSON processing utilities
    └── smsHelper.js       # SMS notification utilities
```

## Dependencies

- **express**: Web framework
- **multer**: File upload handling
- **@google/generative-ai**: Google Gemini AI integration
- **cors**: Cross-origin resource sharing

## Notes

- Supports JPG, PNG, and PDF invoice images
- Requires clear, readable invoice images for best results
- API key from Google AI Studio required
- Designed for Indian GST invoice format
- Handles both B2B and B2C transaction types
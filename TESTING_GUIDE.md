# CompliBot Testing Guide

Complete guide for testing the GST Invoice Processing API and all its modules.

## 🚀 Quick Start Testing

### 1. Environment Setup

```bash
# Clone/navigate to project directory
cd complibot

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your actual API keys
```

### 2. Required Environment Variables

Edit your `.env` file with these **REQUIRED** values:

```env
# Get from https://aistudio.google.com
GOOGLE_AI_API_KEY=your_actual_google_ai_api_key_here

# Get from https://turso.tech
TURSO_DATABASE_URL=your_turso_database_url_here
TURSO_AUTH_TOKEN=your_turso_auth_token_here

# Optional - for Telegram bot features
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
```

## 🧪 Testing Methods

### Method 1: Automated Test Suite

```bash
# Run the built-in test suite
npm test
```

This will:
- ✅ Test API health endpoint
- ✅ Validate environment configuration
- ✅ Check all modules load correctly
- ✅ Test GST helper functions

### Method 2: Manual API Testing

#### Start the Server
```bash
# Development mode (auto-restart on changes)
npm run dev

# Production mode
npm start
```

#### Test Health Endpoint
```bash
# Using curl
curl http://localhost:8080

# Using browser
# Navigate to: http://localhost:8080
```

Expected response:
```json
{
  "message": "GST Invoice Processing API",
  "version": "1.0.0",
  "environment": "development",
  "endpoints": [
    "POST /extract-invoice - Extract basic invoice data",
    "POST /generate-gst-json - Generate GST return format JSON from invoice"
  ]
}
```

#### Test GST JSON Generation

**Using curl:**
```bash
curl -X POST \
  http://localhost:8080/generate-gst-json \
  -H "Content-Type: multipart/form-data" \
  -F "invoiceImage=@path/to/your/invoice.jpg"
```

**Using Postman:**
1. Create new POST request to `http://localhost:8080/generate-gst-json`
2. Go to Body → form-data
3. Add key `invoiceImage` (type: File)
4. Upload your invoice image
5. Send request

### Method 3: Interactive Testing Script

```bash
# Run the interactive example
node example-usage.js
```

This will guide you through:
- API health check
- File upload testing
- Response validation

## 📁 Test Files Structure

Create a `test-files/` directory with sample invoices:

```
test-files/
├── sample-invoice-1.jpg    # Clear GST invoice image
├── sample-invoice-2.png    # Another invoice format
├── sample-invoice-3.pdf    # PDF invoice
└── invalid-file.txt        # For error testing
```

## 🔍 Module Testing

### Test GST Helper Functions

```javascript
// Create test-gst-helper.js
const {
    validateGSTIN,
    calculateGST,
    getStateCode,
    isInterStateTransaction
} = require('./src/modules/gstHelper');

// Test GSTIN validation
console.log('Valid GSTIN:', validateGSTIN('29AAACH7409R1Z2')); // true
console.log('Invalid GSTIN:', validateGSTIN('invalid')); // false

// Test GST calculation
const gstAmounts = calculateGST(10000, 18, false);
console.log('GST Calculation:', gstAmounts);
// Expected: { igst: 0, cgst: 900, sgst: 900, totalTax: 1800 }

// Test state code lookup
console.log('Karnataka code:', getStateCode('KARNATAKA')); // "29"

// Test inter-state transaction
console.log('Inter-state:', isInterStateTransaction('29', '27')); // true
```

### Test JSON Helper Functions

```javascript
// Create test-json-helper.js
const {
    safeJsonParse,
    validateJsonSchema,
    GstJsonBuilder
} = require('./src/modules/jsonHelper');

// Test JSON parsing
const testJson = '{"test": "value"}';
console.log('Parsed:', safeJsonParse(testJson));

// Test GST JSON builder
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

console.log('GST JSON:', JSON.stringify(builder.build(), null, 2));
```

## 🐛 Common Issues & Solutions

### Issue 1: "Missing GOOGLE_AI_API_KEY"
**Solution:** 
1. Get API key from [Google AI Studio](https://aistudio.google.com)
2. Add to `.env` file: `GOOGLE_AI_API_KEY=your_key_here`

### Issue 2: "Database connection failed"
**Solution:**
1. Sign up at [Turso](https://turso.tech)
2. Create database and get URL/token
3. Add to `.env` file

### Issue 3: "File type not allowed"
**Solution:** 
- Use JPG, PNG, or PDF files only
- Check file size (max 10MB by default)

### Issue 4: "Port already in use"
**Solution:**
```bash
# Change port in .env
PORT=3000

# Or kill existing process
lsof -ti:8080 | xargs kill -9
```

## 📊 Expected Test Results

### Successful GST JSON Generation Response:
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

## 🔄 Continuous Testing

### Watch Mode Testing
```bash
# Install nodemon globally if not already
npm install -g nodemon

# Run server in watch mode
npm run dev

# In another terminal, run tests on file changes
nodemon --exec "npm test" --watch src/
```

### Load Testing
```bash
# Install artillery for load testing
npm install -g artillery

# Create artillery config (artillery.yml)
# Run load test
artillery run artillery.yml
```

## 📝 Test Checklist

- [ ] Environment variables configured
- [ ] Server starts without errors
- [ ] Health endpoint responds correctly
- [ ] File upload works with valid images
- [ ] GST JSON generation produces correct format
- [ ] Error handling works for invalid files
- [ ] Database connection successful
- [ ] All modules load without errors
- [ ] GSTIN validation works correctly
- [ ] Tax calculations are accurate
- [ ] State code mapping functions properly
- [ ] Inter-state vs intra-state detection works

## 🚨 Troubleshooting

### Enable Debug Logging
```bash
# Add to .env
LOG_LEVEL=debug
NODE_ENV=development

# Restart server to see detailed logs
```

### Check Server Logs
```bash
# View real-time logs
tail -f server.log

# Or check console output for errors
```

### Validate Configuration
```bash
# Test configuration loading
node -e "console.log(require('./src/config/env'))"
```

This comprehensive testing guide ensures your GST Invoice Processing API works correctly across all modules and use cases!
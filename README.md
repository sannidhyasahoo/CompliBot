# CompliBot

[Frontend Repo Link](https://github.com/sannidhyasahoo/new_complibot_dashbaord)

A comprehensive GST compliance automation bot with AI-powered invoice processing capabilities.

## Features

- **GST Invoice Processing**: Extract data from invoice images using Google Gemini AI
- **GST Return Generation**: Automatically generate GST return JSON in standard format
- **Telegram Bot Integration**: Interactive bot for GST compliance tasks
- **Database Management**: SQLite database for user and transaction management
- **State Code Validation**: Automatic GST state code mapping and validation

## Quick Start

1. **Install Dependencies:**
```bash
npm install
```

2. **Configure Environment:**
   - Copy `.env.example` to `.env`
   - Add your Google AI Studio API key
   - Add your Telegram bot token (optional)

3. **Start the Application:**
```bash
# Start API server only
npm start

# Start Telegram bot + API server
npm run bot

# Development mode with auto-restart
npm run dev-bot
```

4. **Test the API:**
```bash
npm test
```

## API Endpoints

### Generate GST Return JSON
```
POST /generate-gst-json
```
Upload an invoice image and get structured GST return JSON format.

### Health Check
```
GET /
```
Check API status and available endpoints.

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

## Project Structure

```
src/
├── server.js              # Main Express API server
├── bot.js                 # Telegram bot implementation
├── index.js               # Application entry point
├── db/
│   └── index.js           # Database connection and schema
├── modules/
│   ├── gstHelper.js       # GST utility functions
│   ├── jsonHelper.js      # JSON processing utilities
│   └── smsHelper.js       # SMS notification utilities
└── tools/
    └── jsonGenerator.js   # AI-powered GST JSON generation
```

## Documentation

- [API Documentation](./API_DOCUMENTATION.md) - Detailed API reference
- [Example Usage](./example-usage.js) - Code examples
- [Schema Documentation](./schemacode.md) - Database schema

## Dependencies

- **Express**: Web framework for API server
- **Google Generative AI**: AI-powered invoice processing
- **Multer**: File upload handling
- **Telegraf**: Telegram bot framework
- **SQLite**: Database management

## License

ISC

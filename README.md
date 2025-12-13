# CompliBot

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

2. **Configure Environment Variables:**
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your API keys and configuration
```

Required environment variables:
- `GOOGLE_AI_API_KEY` - Get from [Google AI Studio](https://aistudio.google.com)
- `TURSO_DATABASE_URL` - Your Turso database URL
- `TURSO_AUTH_TOKEN` - Your Turso authentication token

Optional variables:
- `TELEGRAM_BOT_TOKEN` - For Telegram bot features
- `PORT` - Server port (default: 8080)
- `NODE_ENV` - Environment (development/production)

3. **Start the API Server:**
```bash
npm start
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
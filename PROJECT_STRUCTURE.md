# CompliBot - Complete Project Structure

## 📁 Directory Structure

```
complibot/
├── 📄 .env                          # Environment variables (create from .env.example)
├── 📄 .env.example                  # Environment template
├── 📄 .gitignore                    # Git ignore rules
├── 📄 package.json                  # Node.js dependencies and scripts
├── 📄 package-lock.json             # Dependency lock file
├── 📄 README.md                     # Main project documentation
├── 📄 API_DOCUMENTATION.md          # Complete API reference
├── 📄 TESTING_GUIDE.md              # Comprehensive testing guide
├── 📄 PROJECT_STRUCTURE.md          # This file
├── 📄 CONTEXT.md                    # Project context
├── 📄 schemacode.md                 # Database schema documentation
├── 📄 test-api.js                   # Basic API tests
├── 📄 test-complete.js              # Comprehensive test suite
├── 📄 example-usage.js              # Usage examples
│
├── 📁 src/                          # Source code
│   ├── 📄 index.js                  # Main application entry point
│   ├── 📄 server.js                 # Express API server
│   ├── 📄 bot.js                    # Telegram bot implementation
│   │
│   ├── 📁 config/                   # Configuration management
│   │   └── 📄 env.js                # Environment configuration & validation
│   │
│   ├── 📁 db/                       # Database layer
│   │   └── 📄 index.js              # Database connection & operations
│   │
│   ├── 📁 modules/                  # Utility modules
│   │   ├── 📄 gstHelper.js          # GST calculations & validations
│   │   ├── 📄 jsonHelper.js         # JSON processing utilities
│   │   └── 📄 smsHelper.js          # SMS notification utilities
│   │
│   └── 📁 tools/                    # AI-powered tools
│       └── 📄 jsonGenerator.js      # GST JSON generation from images
│
└── 📁 test-files/                   # Test assets (create this directory)
    ├── 📄 sample-invoice-1.jpg      # Sample invoice images
    ├── 📄 sample-invoice-2.png      # Different formats for testing
    └── 📄 sample-invoice-3.pdf      # PDF invoice sample
```

## 🧩 Module Overview

### Core Modules

#### 1. **src/config/env.js** - Configuration Management
- Centralized environment variable handling
- Validation of required configuration
- Type conversion and defaults
- Environment-specific settings

#### 2. **src/db/index.js** - Database Layer
- Turso database connection
- Schema initialization
- User management functions
- Invoice storage operations

#### 3. **src/modules/gstHelper.js** - GST Utilities
- GSTIN validation (15-digit format)
- State code mapping (all 38 Indian states/UTs)
- Tax calculations (CGST/SGST vs IGST)
- Inter-state transaction detection
- Date formatting for GST returns

#### 4. **src/modules/jsonHelper.js** - JSON Processing
- Safe JSON parsing with error handling
- AI response cleaning (removes markdown)
- GST JSON builder class
- Schema validation utilities
- Data transformation helpers

#### 5. **src/tools/jsonGenerator.js** - AI-Powered Processing
- Google Gemini AI integration
- Invoice image processing
- Data extraction from images
- GST return format generation
- File upload handling with validation

### Application Layers

#### 6. **src/server.js** - API Server
- Express.js REST API
- CORS configuration
- File upload endpoints
- Error handling middleware
- Health check endpoints

#### 7. **src/bot.js** - Telegram Bot
- Telegraf bot framework
- User registration commands
- Invoice processing commands
- Interactive GST assistance
- Database integration

#### 8. **src/index.js** - Application Entry
- Application initialization
- Database setup
- Bot startup
- Graceful shutdown handling

## 🔧 Configuration Files

### Environment Variables (.env)
```env
# Required
GOOGLE_AI_API_KEY=your_google_ai_api_key
TURSO_DATABASE_URL=your_database_url
TURSO_AUTH_TOKEN=your_auth_token

# Optional
PORT=8080
NODE_ENV=development
TELEGRAM_BOT_TOKEN=your_bot_token
GST_VERSION=GST3.2.3
DEFAULT_TAX_RATE=12.0
MAX_FILE_SIZE=10485760
```

### Package.json Scripts
```json
{
  "start": "node src/server.js",           // Production server
  "dev": "nodemon src/server.js",          // Development server
  "test": "node test-complete.js",         // Full test suite
  "test:api": "node test-api.js",          // API-only tests
  "test:modules": "...",                   // Module-only tests
  "bot": "node src/index.js"               // Start Telegram bot
}
```

## 🚀 Usage Patterns

### 1. API-Only Usage
```bash
npm start                    # Start API server
curl http://localhost:8080   # Test health endpoint
```

### 2. Full Application (API + Bot)
```bash
npm run bot                  # Start both API and Telegram bot
```

### 3. Development Mode
```bash
npm run dev                  # Auto-restart on file changes
```

### 4. Testing
```bash
npm test                     # Run comprehensive tests
npm run test:api             # Test API endpoints only
npm run test:modules         # Test utility modules only
```

## 📊 Data Flow

### Invoice Processing Flow
```
1. Image Upload → src/server.js (POST /generate-gst-json)
2. File Validation → src/tools/jsonGenerator.js (multer)
3. AI Processing → Google Gemini API
4. Data Extraction → Raw invoice data
5. Validation → src/modules/gstHelper.js
6. Enhancement → State codes, GSTIN validation
7. GST Format → src/modules/jsonHelper.js (GstJsonBuilder)
8. Response → Structured GST return JSON
```

### Database Operations Flow
```
1. User Registration → src/bot.js
2. Data Validation → src/modules/gstHelper.js
3. Database Storage → src/db/index.js
4. Invoice Processing → src/tools/jsonGenerator.js
5. Data Persistence → Turso database
```

## 🔒 Security Features

- Environment variable configuration (no hardcoded secrets)
- File type validation (only images/PDFs)
- File size limits (configurable, default 10MB)
- GSTIN format validation
- Input sanitization
- Error handling without data exposure
- CORS configuration

## 🧪 Testing Strategy

### Unit Tests
- GST helper functions
- JSON processing utilities
- Configuration validation
- Database operations

### Integration Tests
- API endpoint functionality
- Database connectivity
- Module interactions
- End-to-end workflows

### Performance Tests
- GSTIN validation speed
- GST calculation performance
- File upload handling
- Memory usage optimization

## 📈 Scalability Considerations

### Horizontal Scaling
- Stateless API design
- External database (Turso)
- Environment-based configuration
- Containerization ready

### Performance Optimization
- Efficient GST calculations
- Optimized database queries
- File processing limits
- Response caching potential

## 🔄 Development Workflow

### 1. Setup
```bash
git clone <repository>
cd complibot
npm install
cp .env.example .env
# Edit .env with your keys
```

### 2. Development
```bash
npm run dev          # Start development server
npm test             # Run tests
```

### 3. Testing
```bash
npm run test:modules # Test individual modules
npm run test:api     # Test API endpoints
npm test             # Full test suite
```

### 4. Deployment
```bash
npm start            # Production server
```

This modular architecture ensures maintainability, testability, and scalability for the GST compliance automation system.
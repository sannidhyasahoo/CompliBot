# CompliBot Deployment Guide

Complete guide for deploying CompliBot in different environments.

## 🚀 Quick Deployment

### Prerequisites
- Node.js 18+ installed
- Google AI Studio API key
- Turso database account (optional: any SQLite-compatible database)
- Telegram Bot Token (optional, for bot features)

### 1. Environment Setup

```bash
# Clone repository
git clone <your-repository-url>
cd complibot

# Install dependencies
npm install

# Setup environment
cp .env.example .env
```

Edit `.env` with your actual values:
```env
GOOGLE_AI_API_KEY=your_actual_google_ai_api_key_here
TURSO_DATABASE_URL=your_turso_database_url_here
TURSO_AUTH_TOKEN=your_turso_auth_token_here
PORT=8080
NODE_ENV=production
```

### 2. Test Configuration

```bash
# Run comprehensive tests
npm test

# Should show all tests passing
```

### 3. Start Application

```bash
# API server only
npm start

# Full application (API + Telegram bot)
npm run bot
```

## 🌐 Production Deployment Options

### Option 1: Traditional VPS/Server

#### Setup Process
```bash
# On your server
sudo apt update
sudo apt install nodejs npm nginx

# Clone and setup project
git clone <repository>
cd complibot
npm install --production

# Setup environment
cp .env.example .env
# Edit .env with production values

# Test deployment
npm test
npm start
```

#### Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Process Management (PM2)
```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start src/server.js --name "complibot-api"

# For full app with bot
pm2 start src/index.js --name "complibot-full"

# Save PM2 configuration
pm2 save
pm2 startup
```

### Option 2: Docker Deployment

#### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/ || exit 1

# Start application
CMD ["npm", "start"]
```

#### Docker Compose
```yaml
version: '3.8'

services:
  complibot:
    build: .
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - PORT=8080
    env_file:
      - .env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/"]
      interval: 30s
      timeout: 10s
      retries: 3
```

#### Deploy with Docker
```bash
# Build and run
docker-compose up -d

# Check logs
docker-compose logs -f

# Scale if needed
docker-compose up -d --scale complibot=3
```

### Option 3: Cloud Platform Deployment

#### Heroku
```bash
# Install Heroku CLI
# Login to Heroku
heroku login

# Create app
heroku create your-complibot-app

# Set environment variables
heroku config:set GOOGLE_AI_API_KEY=your_key
heroku config:set TURSO_DATABASE_URL=your_db_url
heroku config:set TURSO_AUTH_TOKEN=your_token
heroku config:set NODE_ENV=production

# Deploy
git push heroku main

# Check logs
heroku logs --tail
```

#### Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up

# Set environment variables in Railway dashboard
```

#### Vercel (API only)
```json
// vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "src/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/server.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

## 🔧 Environment-Specific Configuration

### Development
```env
NODE_ENV=development
PORT=8080
LOG_LEVEL=debug
CORS_ORIGIN=*
```

### Staging
```env
NODE_ENV=staging
PORT=8080
LOG_LEVEL=info
CORS_ORIGIN=https://staging.yourdomain.com
```

### Production
```env
NODE_ENV=production
PORT=8080
LOG_LEVEL=warn
CORS_ORIGIN=https://yourdomain.com
REQUEST_TIMEOUT=30000
MAX_FILE_SIZE=10485760
```

## 📊 Monitoring & Logging

### Application Monitoring
```bash
# Install monitoring tools
npm install --save express-rate-limit helmet morgan

# Add to server.js
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const morgan = require('morgan');

app.use(helmet());
app.use(morgan('combined'));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}));
```

### Health Checks
```javascript
// Add to server.js
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version
  });
});
```

### Log Management
```bash
# Using Winston for structured logging
npm install winston

# Configure in src/config/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console()
  ]
});
```

## 🔒 Security Hardening

### Production Security Checklist
- [ ] Environment variables properly configured
- [ ] No sensitive data in source code
- [ ] HTTPS enabled (SSL certificate)
- [ ] Rate limiting implemented
- [ ] File upload restrictions enforced
- [ ] CORS properly configured
- [ ] Security headers added (helmet.js)
- [ ] Input validation implemented
- [ ] Error messages don't expose sensitive info
- [ ] Database connections secured

### Security Headers
```javascript
// Add to server.js
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
```

## 📈 Performance Optimization

### Production Optimizations
```javascript
// Add to server.js
const compression = require('compression');
app.use(compression());

// Enable gzip compression
// Set appropriate cache headers
app.use((req, res, next) => {
  if (req.url.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000');
  }
  next();
});
```

### Database Optimization
```javascript
// Connection pooling for better performance
const dbConfig = {
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
  // Add connection pooling options
};
```

## 🚨 Troubleshooting

### Common Issues

#### 1. "Port already in use"
```bash
# Find and kill process using port
lsof -ti:8080 | xargs kill -9

# Or use different port
PORT=3000 npm start
```

#### 2. "Missing environment variables"
```bash
# Check configuration
node -e "console.log(require('./src/config/env'))"

# Verify .env file exists and has correct values
cat .env
```

#### 3. "Database connection failed"
```bash
# Test database connectivity
node -e "
const db = require('./src/db');
db.initDB().then(() => console.log('DB OK')).catch(console.error);
"
```

#### 4. "AI API errors"
```bash
# Test API key
curl -H "Authorization: Bearer $GOOGLE_AI_API_KEY" \
     https://generativelanguage.googleapis.com/v1/models
```

### Debug Mode
```bash
# Enable debug logging
DEBUG=* NODE_ENV=development npm start

# Or set in .env
LOG_LEVEL=debug
```

## 📋 Deployment Checklist

### Pre-deployment
- [ ] All tests passing (`npm test`)
- [ ] Environment variables configured
- [ ] Database accessible
- [ ] API keys valid
- [ ] Dependencies installed
- [ ] Build process completed

### Post-deployment
- [ ] Health check endpoint responding
- [ ] API endpoints functional
- [ ] File upload working
- [ ] Database operations successful
- [ ] Logs being generated
- [ ] Monitoring active
- [ ] SSL certificate valid (if HTTPS)

### Rollback Plan
```bash
# Keep previous version for quick rollback
git tag v1.0.0
git push origin v1.0.0

# If issues occur, rollback to previous version
git checkout v1.0.0
npm install
npm start
```

This deployment guide ensures your CompliBot runs reliably in production with proper monitoring, security, and performance optimization.
# PROJECT: CompliBot (Telegram GST Agent)
## TECH STACK (STRICT)
- **Runtime:** Node.js (ES6 Modules `import ...`)
- **Bot Framework:** Telegraf.js (v4.x)
- **Database:** better-sqlite3 (Single file: `./data.db`)
- **Server:** Express.js (for Dashboard & Webhooks)
- **Deployment:** Railway / Render

## ROLES
- **Member 1 (Integration):** Bot Core, Database, Deployment.
- **Member 2 (SMS Engine):** SMS Syntax (14409), Deep Links.
- **Member 3 (JSON Engine):** Tax Math, GST JSON Schema generation.
- **Member 4 (Frontend/UI):** Dashboard HTML, Penalty Calculator.

## DATA STRUCTURE (Use this exact schema)
CREATE TABLE users (
    chat_id TEXT PRIMARY KEY,
    name TEXT,
    gstin TEXT,
    business_type TEXT,
    language TEXT DEFAULT 'en'
);
CREATE TABLE filings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id TEXT,
    month TEXT,
    return_type TEXT, -- 'NIL' or 'REGULAR'
    status TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
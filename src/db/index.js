import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Recreate __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Resolve path to Project Root
// Current file is in: .../complibot-india/src/db/
// We need to go up two levels to get to: .../complibot-india/
const dataDir = path.resolve(__dirname, '../../data');

// Ensure the directory exists
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// 2. Initialize Database Connection
const dbPath = path.join(dataDir, 'complibot.db');
const db = new Database(dbPath); // verbose: console.log

// 3. Performance & Safety Pragmas
db.pragma('journal_mode = WAL'); 
db.pragma('foreign_keys = ON');

// 4. Schema Initialization
const initDB = () => {
    const schema = `
    -- ===========================
    -- CORE TABLES
    -- ===========================
    CREATE TABLE IF NOT EXISTS gst_state_codes (
        code TEXT PRIMARY KEY,
        state_name TEXT NOT NULL,
        type TEXT CHECK(type IN ('STATE', 'UT', 'OTHER'))
    );

    CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_chat_id BIGINT UNIQUE NOT NULL,
        gstin TEXT UNIQUE NOT NULL CHECK(length(gstin) = 15),
        trade_name TEXT NOT NULL,
        legal_name TEXT,
        state_code TEXT NOT NULL,
        registration_date DATE DEFAULT CURRENT_DATE,
        default_tax_rate REAL DEFAULT 12.0,
        composition_scheme BOOLEAN DEFAULT 0,
        FOREIGN KEY(state_code) REFERENCES gst_state_codes(code)
    );

    CREATE TABLE IF NOT EXISTS filing_periods (
        period_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        fp TEXT NOT NULL, -- Format: "MMYYYY"
        status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'GENERATED', 'FILED')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(user_id)
    );

    -- ===========================
    -- GST RETURN LOGIC TABLES
    -- ===========================
    CREATE TABLE IF NOT EXISTS filings ( 
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        gstin TEXT NOT NULL, 
        fp TEXT NOT NULL, 
        version TEXT, 
        hash TEXT, 
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
        UNIQUE(gstin, fp) 
    );

    CREATE TABLE IF NOT EXISTS b2b_batches ( 
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        filing_id INTEGER NOT NULL, 
        ctin TEXT NOT NULL, 
        FOREIGN KEY (filing_id) REFERENCES filings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS invoices ( 
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        batch_id INTEGER NOT NULL, 
        inum TEXT NOT NULL, 
        idt TEXT NOT NULL, 
        val REAL NOT NULL, 
        pos TEXT, 
        rchrg TEXT, 
        diff_percent REAL, 
        inv_typ TEXT, 
        FOREIGN KEY (batch_id) REFERENCES b2b_batches(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS invoice_items ( 
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        invoice_id INTEGER NOT NULL, 
        num INTEGER NOT NULL, 
        txval REAL, 
        rt REAL, 
        iamt REAL DEFAULT 0, 
        csamt REAL DEFAULT 0, 
        camt REAL DEFAULT 0, 
        samt REAL DEFAULT 0, 
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_filings_gstin ON filings(gstin);
    CREATE INDEX IF NOT EXISTS idx_invoices_inum ON invoices(inum);
    CREATE INDEX IF NOT EXISTS idx_items_invoice ON invoice_items(invoice_id);

    -- ===========================
    -- PENALTY & METRICS
    -- ===========================
    CREATE TABLE IF NOT EXISTS penalty_savings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        filing_date DATE DEFAULT CURRENT_DATE,
        actual_deadline DATE NOT NULL,
        days_saved INTEGER,
        penalty_avoided DECIMAL(10,2)
    );
    `;

    db.exec(schema);

    const seedQuery = `
    INSERT OR IGNORE INTO gst_state_codes (code, state_name, type) VALUES
    ('29', 'Karnataka', 'STATE'),
    ('27', 'Maharashtra', 'STATE'),
    ('07', 'Delhi', 'UT'),
    ('33', 'Tamil Nadu', 'STATE');
    `;
    
    db.exec(seedQuery);
    console.log(`✅ Database initialized successfully: ${dbPath}`);
};

initDB();

export const getUser = (telegram_chat_id) => {
    const stmt = db.prepare('SELECT * FROM users WHERE telegram_chat_id = ?');
    return stmt.get(telegram_chat_id);
};

export const addUser = (user) => {
    const stmt = db.prepare(`
        INSERT INTO users (telegram_chat_id, gstin, trade_name, state_code)
        VALUES (@telegram_chat_id, @gstin, @trade_name, @state_code)
    `);
    return stmt.run(user);
};

export default db;
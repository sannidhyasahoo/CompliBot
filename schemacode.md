import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
    throw new Error('❌ Missing Database Credentials in .env (TURSO_DATABASE_URL or TURSO_AUTH_TOKEN)');
}

// 1. Initialize Cloud Connection
const db = createClient({
    url,
    authToken,
});

// 2. Schema Initialization (Async)
// Note: Cloud providers often suggest running schema via their CLI, 
// but we can do it here for the Hackathon.
const initDB = async () => {
    const schema = `
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
        fp TEXT NOT NULL, 
        status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'GENERATED', 'FILED')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(user_id)
    );
    
    -- (Add the other tables here: filings, b2b_batches, invoices, invoice_items, penalty_savings)
    `;

    try {
        // LibSQL allows executing multiple statements
        await db.executeMultiple(schema);

        // Seed Data (Check if exists first to avoid errors)
        // Note: INSERT OR IGNORE works well
        await db.executeMultiple(`
            INSERT OR IGNORE INTO gst_state_codes (code, state_name, type) VALUES
            ('29', 'Karnataka', 'STATE'),
            ('27', 'Maharashtra', 'STATE'),
            ('07', 'Delhi', 'UT'),
            ('33', 'Tamil Nadu', 'STATE');
        `);

        console.log("✅ Cloud Database connected & verified.");
    } catch (err) {
        console.error("❌ Database Init Error:", err);
    }
};

// Run initialization
initDB();

// ===========================================
// MEMBER 1: DATABASE HELPER FUNCTIONS (ASYNC)
// ===========================================

/**
 * Get a user by their Telegram Chat ID
 */
export const getUser = async (telegram_chat_id) => {
    // Use '?' for parameters in LibSQL
    const result = await db.execute({
        sql: 'SELECT * FROM users WHERE telegram_chat_id = ?',
        args: [telegram_chat_id]
    });
    // result.rows is an array. Return the first object.
    return result.rows[0]; 
};

/**
 * Get Telegram Chat ID by GSTIN
 */
export const getChatIdByGstin = async (gstin) => {
    const result = await db.execute({
        sql: 'SELECT telegram_chat_id FROM users WHERE gstin = ?',
        args: [gstin]
    });
    return result.rows.length > 0 ? result.rows[0].telegram_chat_id : null;
};

/**
 * Add a new user to the database
 */
export const addUser = async (user) => {
    // Note: Use ':' for named parameters matches
    const sql = `
        INSERT INTO users (telegram_chat_id, gstin, trade_name, state_code)
        VALUES (:telegram_chat_id, :gstin, :trade_name, :state_code)
    `;
    
    await db.execute({
        sql,
        args: {
            telegram_chat_id: user.telegram_chat_id,
            gstin: user.gstin,
            trade_name: user.trade_name,
            state_code: user.state_code
        }
    });
    return true;
};

export default db;
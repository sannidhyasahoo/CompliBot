const { createClient } = require('@libsql/client');
const dotenv = require('dotenv');

dotenv.config();

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

let db;

// Initialize database connection
if (url && authToken) {
    // Cloud database
    db = createClient({
        url,
        authToken,
    });
    console.log('✅ Using cloud database (Turso)');
} else {
    // Local SQLite database
    const Database = require('better-sqlite3');
    const path = require('path');
    const fs = require('fs');

    // Ensure data directory exists
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = path.join(dataDir, 'complibot.db');
    const sqliteDb = new Database(dbPath);

    // Wrap SQLite in a Turso-like interface
    db = {
        execute: async (query) => {
            if (typeof query === 'string') {
                return { rows: sqliteDb.prepare(query).all() };
            } else {
                const stmt = sqliteDb.prepare(query.sql);
                if (query.args) {
                    return { rows: stmt.all(query.args) };
                } else {
                    return { rows: stmt.all() };
                }
            }
        },
        executeMultiple: async (sql) => {
            sqliteDb.exec(sql);
        }
    };

    console.log('✅ Using local SQLite database');
}

// Schema initialization
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
        language TEXT DEFAULT 'en',
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

    CREATE TABLE IF NOT EXISTS invoices (
        invoice_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        invoice_number TEXT NOT NULL,
        invoice_date DATE NOT NULL,
        supplier_gstin TEXT NOT NULL,
        recipient_gstin TEXT NOT NULL,
        total_value REAL NOT NULL,
        tax_amount REAL NOT NULL,
        json_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(user_id)
    );
    `;

    try {
        await db.executeMultiple(schema);

        // Seed state codes data
        await db.executeMultiple(`
            INSERT OR IGNORE INTO gst_state_codes (code, state_name, type) VALUES
            ('01', 'Jammu and Kashmir', 'UT'),
            ('02', 'Himachal Pradesh', 'STATE'),
            ('03', 'Punjab', 'STATE'),
            ('04', 'Chandigarh', 'UT'),
            ('05', 'Uttarakhand', 'STATE'),
            ('06', 'Haryana', 'STATE'),
            ('07', 'Delhi', 'UT'),
            ('08', 'Rajasthan', 'STATE'),
            ('09', 'Uttar Pradesh', 'STATE'),
            ('10', 'Bihar', 'STATE'),
            ('11', 'Sikkim', 'STATE'),
            ('12', 'Arunachal Pradesh', 'STATE'),
            ('13', 'Nagaland', 'STATE'),
            ('14', 'Manipur', 'STATE'),
            ('15', 'Mizoram', 'STATE'),
            ('16', 'Tripura', 'STATE'),
            ('17', 'Meghalaya', 'STATE'),
            ('18', 'Assam', 'STATE'),
            ('19', 'West Bengal', 'STATE'),
            ('20', 'Jharkhand', 'STATE'),
            ('21', 'Odisha', 'STATE'),
            ('22', 'Chhattisgarh', 'STATE'),
            ('23', 'Madhya Pradesh', 'STATE'),
            ('24', 'Gujarat', 'STATE'),
            ('25', 'Daman and Diu', 'UT'),
            ('26', 'Dadra and Nagar Haveli', 'UT'),
            ('27', 'Maharashtra', 'STATE'),
            ('28', 'Andhra Pradesh', 'STATE'),
            ('29', 'Karnataka', 'STATE'),
            ('30', 'Goa', 'STATE'),
            ('31', 'Lakshadweep', 'UT'),
            ('32', 'Kerala', 'STATE'),
            ('33', 'Tamil Nadu', 'STATE'),
            ('34', 'Puducherry', 'UT'),
            ('35', 'Andaman and Nicobar Islands', 'UT'),
            ('36', 'Telangana', 'STATE'),
            ('37', 'Andhra Pradesh', 'STATE'),
            ('38', 'Ladakh', 'UT');
        `);

        console.log("✅ Database initialized successfully");
    } catch (err) {
        console.error("❌ Database initialization error:", err);
    }
};

// Database helper functions

/**
 * Get a user by their Telegram Chat ID
 */
const getUser = async (telegram_chat_id) => {
    try {
        const result = await db.execute({
            sql: 'SELECT * FROM users WHERE telegram_chat_id = ?',
            args: [telegram_chat_id]
        });
        return result.rows[0] || null;
    } catch (error) {
        console.error('Error getting user:', error);
        return null;
    }
};

/**
 * Get Telegram Chat ID by GSTIN
 */
const getChatIdByGstin = async (gstin) => {
    try {
        const result = await db.execute({
            sql: 'SELECT telegram_chat_id FROM users WHERE gstin = ?',
            args: [gstin]
        });
        return result.rows.length > 0 ? result.rows[0].telegram_chat_id : null;
    } catch (error) {
        console.error('Error getting chat ID by GSTIN:', error);
        return null;
    }
};

/**
 * Add a new user to the database
 */
const addUser = async (user) => {
    try {
        const sql = `
            INSERT INTO users (telegram_chat_id, gstin, trade_name, legal_name, state_code, language)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        await db.execute({
            sql,
            args: [
                user.telegram_chat_id,
                user.gstin,
                user.trade_name,
                user.legal_name || user.trade_name,
                user.state_code,
                user.language || 'en'
            ]
        });

        console.log(`✅ User added successfully: ${user.gstin} - ${user.trade_name} (State: ${user.state_code})`);
        return true;
    } catch (error) {
        console.error('Error adding user:', error);
        throw error;
    }
};

/**
 * Update user information
 */
const updateUser = async (telegram_chat_id, updates) => {
    try {
        const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updates);
        values.push(telegram_chat_id);

        const sql = `UPDATE users SET ${fields} WHERE telegram_chat_id = ?`;

        await db.execute({
            sql,
            args: values
        });

        return true;
    } catch (error) {
        console.error('Error updating user:', error);
        throw error;
    }
};

/**
 * Validate state code
 */
const validateStateCode = async (stateCode) => {
    try {
        const result = await db.execute({
            sql: 'SELECT code FROM gst_state_codes WHERE code = ?',
            args: [stateCode]
        });
        return result.rows.length > 0;
    } catch (error) {
        console.error('Error validating state code:', error);
        return false;
    }
};

/**
 * Save invoice data
 */
const saveInvoice = async (invoiceData) => {
    try {
        const sql = `
            INSERT INTO invoices (user_id, invoice_number, invoice_date, supplier_gstin, recipient_gstin, total_value, tax_amount, json_data)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await db.execute({
            sql,
            args: [
                invoiceData.user_id,
                invoiceData.invoice_number,
                invoiceData.invoice_date,
                invoiceData.supplier_gstin,
                invoiceData.recipient_gstin,
                invoiceData.total_value,
                invoiceData.tax_amount,
                JSON.stringify(invoiceData.json_data)
            ]
        });

        return true;
    } catch (error) {
        console.error('Error saving invoice:', error);
        throw error;
    }
};

// Initialize database on module load
initDB();

module.exports = {
    db,
    getUser,
    getChatIdByGstin,
    addUser,
    updateUser,
    validateStateCode,
    saveInvoice
};
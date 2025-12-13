const { createClient } = require('@libsql/client');
const config = require('../config/env');

// Database configuration from centralized config
const url = config.database.url;
const authToken = config.database.authToken;

if (!url || !authToken) {
    throw new Error('❌ Missing Database Credentials in .env (TURSO_DATABASE_URL or TURSO_AUTH_TOKEN)');
}

// Initialize Cloud Connection
const db = createClient({
    url,
    authToken,
});

// Schema Initialization (Async)
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
        language TEXT DEFAULT 'en' CHECK(language IN ('en', 'hi', 'te')),
        registration_date DATE DEFAULT CURRENT_DATE,
        default_tax_rate REAL DEFAULT ${config.gst.defaultTaxRate},
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

    CREATE TABLE IF NOT EXISTS invoices (
        invoice_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        invoice_number TEXT NOT NULL,
        invoice_date DATE NOT NULL,
        supplier_gstin TEXT NOT NULL,
        recipient_gstin TEXT NOT NULL,
        total_value REAL NOT NULL,
        tax_amount REAL NOT NULL,
        place_of_supply TEXT NOT NULL,
        invoice_type TEXT DEFAULT 'R',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(user_id)
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
        item_id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id INTEGER NOT NULL,
        description TEXT NOT NULL,
        hsn_code TEXT,
        quantity REAL NOT NULL,
        unit_price REAL NOT NULL,
        taxable_value REAL NOT NULL,
        tax_rate REAL NOT NULL,
        cgst_amount REAL DEFAULT 0,
        sgst_amount REAL DEFAULT 0,
        igst_amount REAL DEFAULT 0,
        cess_amount REAL DEFAULT 0,
        FOREIGN KEY(invoice_id) REFERENCES invoices(invoice_id)
    );

    CREATE TABLE IF NOT EXISTS user_queries (
        query_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        question TEXT NOT NULL,
        answer TEXT,
        language TEXT DEFAULT 'en',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(user_id)
    );
    `;

    try {
        // Execute schema creation
        await db.executeMultiple(schema);

        // Migration: Add language column if it doesn't exist
        try {
            await db.execute({
                sql: 'ALTER TABLE users ADD COLUMN language TEXT DEFAULT "en" CHECK(language IN ("en", "hi", "te"))'
            });
            console.log("✅ Added language column to users table");
        } catch (error) {
            // Column might already exist, ignore error
            if (!error.message.includes('duplicate column name')) {
                console.log("ℹ️  Language column already exists or migration not needed");
            }
        }

        // Seed Data (Check if exists first to avoid errors)
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
            ('37', 'Andhra Pradesh (New)', 'STATE'),
            ('38', 'Ladakh', 'UT'),
            ('97', 'Other Territory', 'OTHER'),
            ('99', 'Centre Jurisdiction', 'OTHER');
        `);

        console.log("✅ Cloud Database connected & verified.");
    } catch (err) {
        console.error("❌ Database Init Error:", err);
        throw err;
    }
};

// Database helper functions
const getUser = async (telegram_chat_id) => {
    try {
        const result = await db.execute({
            sql: 'SELECT * FROM users WHERE telegram_chat_id = ?',
            args: [telegram_chat_id]
        });
        return result.rows?.[0] || null;
    } catch (error) {
        console.error('❌ Database error in getUser:', error);
        throw error;
    }
};

const getChatIdByGstin = async (gstin) => {
    try {
        const result = await db.execute({
            sql: 'SELECT telegram_chat_id FROM users WHERE gstin = ?',
            args: [gstin]
        });
        return result.rows?.length > 0 ? result.rows[0].telegram_chat_id : null;
    } catch (error) {
        console.error('❌ Database error in getChatIdByGstin:', error);
        throw error;
    }
};

const validateStateCode = async (stateCode) => {
    try {
        const result = await db.execute({
            sql: 'SELECT code FROM gst_state_codes WHERE code = ?',
            args: [stateCode]
        });
        return result.rows?.length > 0 || false;
    } catch (error) {
        console.error('❌ Database error in validateStateCode:', error);
        return false;
    }
};

const addUser = async (user) => {
    try {
        // First validate that the state code exists
        const stateExists = await validateStateCode(user.state_code);
        if (!stateExists) {
            // If state code doesn't exist, add it as 'OTHER'
            console.log(`⚠️ Unknown state code ${user.state_code}, adding as OTHER`);
            await db.execute({
                sql: 'INSERT OR IGNORE INTO gst_state_codes (code, state_name, type) VALUES (?, ?, ?)',
                args: [user.state_code, `State ${user.state_code}`, 'OTHER']
            });
        }

        // Now add the user
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
        console.error('❌ Database error in addUser:', error);
        throw error;
    }
};

const updateUserLanguage = async (telegram_chat_id, language) => {
    try {
        await db.execute({
            sql: 'UPDATE users SET language = ? WHERE telegram_chat_id = ?',
            args: [language, telegram_chat_id]
        });
        return true;
    } catch (error) {
        console.error('❌ Database error in updateUserLanguage:', error);
        throw error;
    }
};

const saveUserQuery = async (telegram_chat_id, question, answer, language = 'en') => {
    try {
        // First get the user_id
        const user = await getUser(telegram_chat_id);
        if (!user) {
            throw new Error('User not found');
        }

        await db.execute({
            sql: 'INSERT INTO user_queries (user_id, question, answer, language) VALUES (?, ?, ?, ?)',
            args: [user.user_id, question, answer, language]
        });
        return true;
    } catch (error) {
        console.error('❌ Database error in saveUserQuery:', error);
        throw error;
    }
};

const getUserQueries = async (telegram_chat_id, limit = 10) => {
    try {
        const result = await db.execute({
            sql: `SELECT uq.question, uq.answer, uq.language, uq.created_at 
                  FROM user_queries uq 
                  JOIN users u ON uq.user_id = u.user_id 
                  WHERE u.telegram_chat_id = ? 
                  ORDER BY uq.created_at DESC 
                  LIMIT ?`,
            args: [telegram_chat_id, limit]
        });
        return result.rows || [];
    } catch (error) {
        console.error('❌ Database error in getUserQueries:', error);
        throw error;
    }
};

const saveInvoice = async (invoiceData) => {
    try {
        const { supplier, recipient, invoice, items, userId } = invoiceData;

        // Insert invoice
        const invoiceResult = await db.execute({
            sql: `INSERT INTO invoices 
                  (user_id, invoice_number, invoice_date, supplier_gstin, recipient_gstin, 
                   total_value, tax_amount, place_of_supply, invoice_type) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                userId,
                invoice.number,
                invoice.date,
                supplier.gstin,
                recipient.gstin,
                invoice.totalValue,
                items.reduce((sum, item) => sum + (item.totalTax || 0), 0),
                invoice.placeOfSupply,
                invoice.invoiceType || 'R'
            ]
        });

        const invoiceId = invoiceResult.lastInsertRowid;

        // Insert invoice items
        for (const item of items) {
            await db.execute({
                sql: `INSERT INTO invoice_items 
                      (invoice_id, description, hsn_code, quantity, unit_price, 
                       taxable_value, tax_rate, cgst_amount, sgst_amount, igst_amount, cess_amount) 
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                args: [
                    invoiceId,
                    item.description,
                    item.hsnCode,
                    item.quantity,
                    item.unitPrice,
                    item.taxableValue,
                    item.taxRate,
                    item.cgst || 0,
                    item.sgst || 0,
                    item.igst || 0,
                    0 // cess amount
                ]
            });
        }

        return invoiceId;
    } catch (error) {
        console.error('❌ Database error in saveInvoice:', error);
        throw error;
    }
};

const getAllStates = async () => {
    try {
        const result = await db.execute('SELECT code, state_name, type FROM gst_state_codes ORDER BY code');
        return result.rows || [];
    } catch (error) {
        console.error('❌ Database error in getAllStates:', error);
        throw error;
    }
};

module.exports = {
    db,
    initDB,
    getUser,
    getChatIdByGstin,
    addUser,
    updateUserLanguage,
    saveUserQuery,
    getUserQueries,
    saveInvoice,
    validateStateCode,
    getAllStates
};
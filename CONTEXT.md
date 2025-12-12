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

CREATE TABLE gst_state_codes (
code TEXT PRIMARY KEY, -- e.g., '29' (Must be text, not int, for leading zeros)
state_name TEXT NOT NULL, -- e.g., 'Karnataka'
type TEXT CHECK(type IN ('STATE', 'UT', 'OTHER')) -- UT = Union Territory
);

-- Seed Data (Critical for Validation)
INSERT INTO gst_state_codes (code, state_name, type) VALUES
('29', 'Karnataka', 'STATE'),
('27', 'Maharashtra', 'STATE'),
('07', 'Delhi', 'UT'),
('33', 'Tamil Nadu', 'STATE');

CREATE TABLE users (
user_id INTEGER PRIMARY KEY AUTOINCREMENT,
telegram_chat_id BIGINT UNIQUE NOT NULL, -- To link Telegram User to Data
gstin TEXT UNIQUE NOT NULL CHECK(length(gstin) = 15), -- Strict 15-char validation
trade_name TEXT NOT NULL, -- Shop Name (e.g., "Ramesh General Store")
legal_name TEXT, -- Pan Card Name
state_code TEXT NOT NULL, -- Linked to gst_state_codes
registration_date DATE DEFAULT CURRENT_DATE,

    -- Smart Defaults (Automation Level 1)
    default_tax_rate REAL DEFAULT 12.0, -- If they mostly sell one thing
    composition_scheme BOOLEAN DEFAULT 0, -- 0 = Regular, 1 = Composition

    FOREIGN KEY(state_code) REFERENCES gst_state_codes(code)

);

CREATE TABLE filing_periods (
period_id INTEGER PRIMARY KEY AUTOINCREMENT,
user_id INTEGER NOT NULL,
fp TEXT NOT NULL, -- Format: "MMYYYY" (e.g., "112025")
status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'GENERATED', 'FILED')),
created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY(user_id) REFERENCES users(user_id)
);

CREATE TABLE gstr1_b2cs_summary (
id INTEGER PRIMARY KEY AUTOINCREMENT,
period_id INTEGER NOT NULL,

    -- JSON Mandatory Keys
    sply_ty TEXT NOT NULL,      -- "INTRA" or "INTER"
    pos TEXT NOT NULL,          -- Place of Supply (e.g., "29")
    typ TEXT DEFAULT 'OE',      -- "OE" = Other E-commerce (Default for manual)
    rt REAL NOT NULL,           -- Rate (e.g., 5.0)

    -- Monetary Values (Rounded to 2 decimals)
    txval DECIMAL(12,2) NOT NULL,
    iamt DECIMAL(12,2) DEFAULT 0.00,
    camt DECIMAL(12,2) DEFAULT 0.00,
    samt DECIMAL(12,2) DEFAULT 0.00,
    csamt DECIMAL(12,2) DEFAULT 0.00, -- Cess

    FOREIGN KEY(period_id) REFERENCES filing_periods(period_id)

);

CREATE TABLE gstr3b_summary (
id INTEGER PRIMARY KEY AUTOINCREMENT,
period_id INTEGER NOT NULL,

    -- Table 3.1 Details
    tot_txval DECIMAL(12,2),
    tot_iamt DECIMAL(12,2),
    tot_camt DECIMAL(12,2),
    tot_samt DECIMAL(12,2),

    -- Penalty/Interest (If filed late)
    late_fee DECIMAL(10,2) DEFAULT 0.00,
    interest DECIMAL(10,2) DEFAULT 0.00,

    FOREIGN KEY(period_id) REFERENCES filing_periods(period_id)

);

CREATE TABLE penalty_savings (
id INTEGER PRIMARY KEY AUTOINCREMENT,
user_id INTEGER NOT NULL,
filing_date DATE DEFAULT CURRENT_DATE,
actual_deadline DATE NOT NULL,

    -- Metrics
    days_saved INTEGER,          -- (Manual Time - Bot Time)
    penalty_avoided DECIMAL(10,2) -- ₹50 * (Today - Deadline)

);

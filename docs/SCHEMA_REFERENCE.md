# 🗄️ Database Schema & Models Reference

CompliBot uses a unified database layer supporting both **Turso (LibSQL)** cloud databases and local **SQLite (`better-sqlite3`)**.

---

## Entity Relationship & Schema

```sql
-- State & Union Territory Codes (2-digit standard)
CREATE TABLE IF NOT EXISTS gst_state_codes (
    code TEXT PRIMARY KEY,
    state_name TEXT NOT NULL,
    type TEXT CHECK(type IN ('STATE', 'UT', 'OTHER'))
);

-- Registered Telegram Users & Taxpayer Profiles
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

-- Filing Periods & Status Tracking
CREATE TABLE IF NOT EXISTS filing_periods (
    period_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    fp TEXT NOT NULL, -- e.g. "032025" (MMYYYY)
    status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'GENERATED', 'FILED')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(user_id)
);

-- Extracted Invoices & Processed JSON Records
CREATE TABLE IF NOT EXISTS invoices (
    invoice_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    invoice_number TEXT NOT NULL,
    invoice_date DATE NOT NULL,
    supplier_gstin TEXT NOT NULL,
    recipient_gstin TEXT NOT NULL,
    total_value REAL NOT NULL,
    tax_amount REAL NOT NULL,
    json_data TEXT, -- Full GST 3.2.3 formatted JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(user_id)
);
```

---

## State Code Seed Data

| Code | State / UT Name | Type |
| :--- | :--- | :--- |
| `01` | Jammu and Kashmir | UT |
| `02` | Himachal Pradesh | STATE |
| `03` | Punjab | STATE |
| `04` | Chandigarh | UT |
| `05` | Uttarakhand | STATE |
| `06` | Haryana | STATE |
| `07` | Delhi | UT |
| `08` | Rajasthan | STATE |
| `09` | Uttar Pradesh | STATE |
| `10` | Bihar | STATE |
| `19` | West Bengal | STATE |
| `24` | Gujarat | STATE |
| `27` | Maharashtra | STATE |
| `29` | Karnataka | STATE |
| `33` | Tamil Nadu | STATE |
| `36` | Telangana | STATE |

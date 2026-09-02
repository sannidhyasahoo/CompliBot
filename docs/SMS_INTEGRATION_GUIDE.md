# 📱 14409 SMS Engine Module Integration Guide

CompliBot includes full support for instant NIL return filing via the Government of India's official **14409** shortcode service.

---

## 🎯 What This Module Does

Generates compliant SMS messages and mobile deep links for instant GSTR-3B and GSTR-1 NIL filings without requiring web portal logins or OTP manual typing.

---

## 📦 Usage Guide

### 1. Import `createSMSFiling`:
```javascript
const { createSMSFiling } = require('../src/modules/smsHelper');
```

### 2. Generate Filing Payload:
```javascript
const filing = createSMSFiling('29ABCDE1234F1Z5', '2025-03');

console.log(filing);
```

#### Output:
```json
{
  "type": "NIL",
  "returnType": "GSTR-3B",
  "gstin": "29ABCDE1234F1Z5",
  "month": "032025",
  "smsBody": "NIL 3B 29ABCDE1234F1Z5 032025",
  "deepLinks": {
    "primary": "sms:14409?body=NIL%203B%2029ABCDE1234F1Z5%20032025",
    "fallback": "sms:14409&body=NIL%203B%2029ABCDE1234F1Z5%20032025"
  },
  "description": "This will file a NIL return for GSTR-3B for March 2025.",
  "instructions": [
    "1. Tap the 'Send SMS' button below",
    "2. Your SMS app will open with pre-filled details",
    "3. Tap Send to 14409",
    "4. Receive verification code and confirm"
  ]
}
```

---

## 📱 Official GST SMS Format Standards

| Action | SMS Syntax | Recipient | Example |
| :--- | :--- | :--- | :--- |
| **GSTR-3B NIL** | `NIL 3B <GSTIN> <MMYYYY>` | `14409` | `NIL 3B 29ABCDE1234F1Z5 032025` |
| **GSTR-1 NIL** | `NIL R1 <GSTIN> <MMYYYY>` | `14409` | `NIL R1 29ABCDE1234F1Z5 032025` |
| **Confirmation** | `CNF <RETURN> <code>` | `14409` | `CNF 3B 123456` |
| **Help Query** | `HELP <RETURN>` | `14409` | `HELP 3B` |

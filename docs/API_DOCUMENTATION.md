# 📘 CompliBot API Documentation

CompliBot provides RESTful HTTP endpoints for multimodal invoice parsing, automated tax calculation, and generation of standard Indian GST return JSON payloads.

---

## Base URL

```
http://localhost:8080
```

---

## Endpoints

### 1. Health & Discovery
`GET /`

Returns the operational status, version, and accessible endpoints.

#### Response:
```json
{
  "message": "GST Invoice Processing API",
  "version": "1.0.0",
  "endpoints": [
    "POST /extract-invoice - Extract basic invoice data",
    "POST /generate-gst-json - Generate GST return format JSON from invoice"
  ]
}
```

---

### 2. Generate GST Return JSON (Multimodal Gemini Vision)
`POST /generate-gst-json`

Upload an invoice image or document (JPG, PNG, PDF) and automatically extract supplier details, buyer details, line items, and generate a validated **GST 3.2.3** return payload (B2B format).

#### Headers:
- `Content-Type`: `multipart/form-data`

#### Request Body:
- `invoiceImage`: File (binary multipart)

#### Example Request (cURL):
```bash
curl -X POST http://localhost:8080/generate-gst-json \
  -F "invoiceImage=@/path/to/invoice.jpg"
```

#### Example Response:
```json
{
  "success": true,
  "data": {
    "extractedInvoiceData": {
      "supplier": {
        "gstin": "29AAACH7409R1Z2",
        "legalName": "ABC Enterprises Pvt Ltd",
        "tradeName": "ABC Traders",
        "address": "123 Commercial St, Bangalore",
        "state": "Karnataka",
        "stateCode": "29"
      },
      "recipient": {
        "gstin": "27BBCCH7409R1Z3",
        "legalName": "XYZ Solutions Ltd",
        "tradeName": "XYZ Corp",
        "address": "456 Nariman Point, Mumbai",
        "state": "Maharashtra",
        "stateCode": "27"
      },
      "invoice": {
        "number": "INV-2024-001",
        "date": "15-12-2024",
        "totalValue": 11800,
        "placeOfSupply": "27",
        "invoiceType": "R"
      },
      "items": [
        {
          "description": "IT Consulting Services",
          "hsnCode": "998311",
          "quantity": 1,
          "unitPrice": 10000,
          "taxableValue": 10000,
          "taxRate": 18,
          "cgst": 0,
          "sgst": 0,
          "igst": 1800,
          "totalTax": 1800
        }
      ]
    },
    "gstReturnFormat": {
      "gstin": "29AAACH7409R1Z2",
      "fp": "122024",
      "version": "GST3.2.3",
      "hash": "hash_placeholder",
      "b2b": [
        {
          "ctin": "27BBCCH7409R1Z3",
          "inv": [
            {
              "inum": "INV-2024-001",
              "idt": "15-12-2024",
              "val": 11800,
              "pos": "27",
              "rchrg": "N",
              "diff_percent": 0.65,
              "inv_typ": "R",
              "itms": [
                {
                  "num": 1,
                  "itm_det": {
                    "txval": 10000,
                    "rt": 18,
                    "iamt": 1800,
                    "camt": 0,
                    "samt": 0,
                    "csamt": 0
                  }
                }
              ]
            }
          ]
        }
      ]
    }
  }
}
```

---

### 3. Extract Invoice Data
`POST /extract-invoice`

Performs optical parsing and returns structured entity data without JSON format wrapping.

---

## Tax Math & State Detection Logic

- **Intra-State:** When `Supplier State Code == Recipient State Code / Place of Supply`:
  - $\text{CGST} = \text{Taxable Value} \times \frac{\text{Rate}}{2}$
  - $\text{SGST} = \text{Taxable Value} \times \frac{\text{Rate}}{2}$
  - $\text{IGST} = 0$
- **Inter-State:** When `Supplier State Code != Recipient State Code / Place of Supply`:
  - $\text{CGST} = 0$
  - $\text{SGST} = 0$
  - $\text{IGST} = \text{Taxable Value} \times \text{Rate}$

---

## Error Handling

Standard HTTP status codes are used:

| Code | Status | Description |
| :--- | :--- | :--- |
| `200` | OK | Processing successful |
| `400` | Bad Request | Missing file or invalid multipart body |
| `422` | Unprocessable Entity | Unreadable invoice or schema validation failure |
| `500` | Internal Server Error | Processing error or upstream AI service issue |

const multer = require("multer");
const {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
} = require("@google/generative-ai");
const {
    validateGSTIN,
    getStateCode,
    calculateGST,
    isInterStateTransaction,
    generateFilingPeriod,
    formatGSTDate,
    INVOICE_TYPES
} = require("../modules/gstHelper");
const config = require("../config/env");

// Configuration from centralized config
const API_KEY = config.googleAI.apiKey;
const MODEL_NAME = config.googleAI.modelName;
const MAX_FILE_SIZE = config.upload.maxFileSize;
const ALLOWED_TYPES = config.upload.allowedTypes;
const REQUEST_TIMEOUT = config.security.requestTimeout;

const safetySettings = [
    {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
];

const generationConfig = {
    responseMimeType: "application/json",
};

// Setup Multer for memory storage with file size limits
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MAX_FILE_SIZE
    },
    fileFilter: (req, file, cb) => {
        if (ALLOWED_TYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`File type ${file.mimetype} not allowed. Allowed types: ${ALLOWED_TYPES.join(', ')}`));
        }
    }
});

// Initialize Gemini
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    safetySettings,
    generationConfig
});

/**
 * Calculate tax amounts based on taxable value and rate using GST helper
 */
const calculateTaxAmounts = (txval, rate, isIGST = false) => {
    const gstAmounts = calculateGST(txval, rate, isIGST);

    return {
        iamt: gstAmounts.igst,
        camt: gstAmounts.cgst,
        samt: gstAmounts.sgst,
        csamt: 0 // Cess amount - usually 0 for most items
    };
};

/**
 * Generate GST return JSON from invoice data
 */
const generateGSTReturnJSON = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: "No invoice image uploaded."
            });
        }

        console.log("1. Processing invoice image for GST return generation...");

        // Prepare image for API
        const imagePart = {
            inlineData: {
                data: req.file.buffer.toString("base64"),
                mimeType: req.file.mimetype,
            },
        };

        // Enhanced prompt for comprehensive GST data extraction
        const prompt = `
        Extract comprehensive GST invoice details from this image and return ONLY valid JSON without any markdown formatting.

        Extract the following information:
        1. Supplier Details: GSTIN, Legal Name, Trade Name, Address, State
        2. Recipient Details: GSTIN, Legal Name, Trade Name, Address, State  
        3. Invoice Details: Invoice Number, Invoice Date, Total Value, Place of Supply
        4. Item Details: Description, HSN/SAC Code, Quantity, Unit Price, Taxable Value, Tax Rate, Tax Amount
        5. Tax Summary: CGST, SGST, IGST amounts

        Return the data in this exact JSON structure:
        {
          "supplier": {
            "gstin": "supplier GSTIN",
            "legalName": "legal name",
            "tradeName": "trade name", 
            "address": "complete address",
            "state": "state name",
            "stateCode": "state code"
          },
          "recipient": {
            "gstin": "recipient GSTIN",
            "legalName": "legal name",
            "tradeName": "trade name",
            "address": "complete address", 
            "state": "state name",
            "stateCode": "state code"
          },
          "invoice": {
            "number": "invoice number",
            "date": "DD-MM-YYYY",
            "totalValue": numeric_value,
            "placeOfSupply": "state code",
            "invoiceType": "R"
          },
          "items": [
            {
              "description": "item description",
              "hsnCode": "HSN/SAC code",
              "quantity": numeric_value,
              "unitPrice": numeric_value,
              "taxableValue": numeric_value,
              "taxRate": numeric_rate,
              "cgst": numeric_amount,
              "sgst": numeric_amount,
              "igst": numeric_amount,
              "totalTax": numeric_amount
            }
          ]
        }

        Important: 
        - Use actual values from the invoice
        - If state codes are not visible, derive them from state names using standard GST state codes
        - Calculate tax amounts if not explicitly shown
        - Return only the JSON, no explanatory text
        - Ensure all numeric values are numbers, not strings
        `;

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        let text = response.text();

        console.log("2. Raw AI response received");

        // Clean up potential markdown formatting
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();

        // Parse the extracted data
        const extractedData = JSON.parse(text);
        console.log("3. Invoice data extracted successfully");

        // Validate and enhance extracted data
        const validatedData = validateAndEnhanceData(extractedData);

        // Generate GST return format JSON
        const gstReturnData = generateGSTReturnFormat(validatedData);

        res.json({
            success: true,
            data: {
                extractedInvoiceData: validatedData,
                gstReturnFormat: gstReturnData
            }
        });

    } catch (error) {
        console.error("CRITICAL ERROR:", error);
        res.status(500).json({
            success: false,
            error: error.message,
            hint: "Check if your API Key is valid or if the invoice image is clear and readable.",
        });
    }
};

/**
 * Validate and enhance extracted data using GST helper functions
 */
const validateAndEnhanceData = (data) => {
    const enhanced = { ...data };

    // Validate and enhance supplier GSTIN
    if (enhanced.supplier && enhanced.supplier.gstin) {
        if (!validateGSTIN(enhanced.supplier.gstin)) {
            console.warn("Invalid supplier GSTIN format:", enhanced.supplier.gstin);
        }
        // If state code is missing, try to derive from state name
        if (!enhanced.supplier.stateCode && enhanced.supplier.state) {
            enhanced.supplier.stateCode = getStateCode(enhanced.supplier.state);
        }
    }

    // Validate and enhance recipient GSTIN
    if (enhanced.recipient && enhanced.recipient.gstin) {
        if (!validateGSTIN(enhanced.recipient.gstin)) {
            console.warn("Invalid recipient GSTIN format:", enhanced.recipient.gstin);
        }
        // If state code is missing, try to derive from state name
        if (!enhanced.recipient.stateCode && enhanced.recipient.state) {
            enhanced.recipient.stateCode = getStateCode(enhanced.recipient.state);
        }
    }

    // Format invoice date
    if (enhanced.invoice && enhanced.invoice.date) {
        try {
            const dateObj = new Date(enhanced.invoice.date);
            enhanced.invoice.date = formatGSTDate(dateObj);
        } catch (e) {
            console.warn("Could not format invoice date:", enhanced.invoice.date);
        }
    }

    return enhanced;
};

/**
 * Convert extracted invoice data to GST return format
 */
const generateGSTReturnFormat = (invoiceData) => {
    const { supplier, recipient, invoice, items } = invoiceData;

    // Generate current filing period (MMYYYY format)
    const fp = generateFilingPeriod();

    // Check if it's inter-state or intra-state transaction
    const isIGSTTransaction = isInterStateTransaction(
        supplier.stateCode,
        recipient.stateCode
    );

    // Process items and calculate tax details
    const processedItems = items.map((item, index) => {
        const taxAmounts = calculateTaxAmounts(
            item.taxableValue,
            item.taxRate,
            isIGSTTransaction
        );

        return {
            num: index + 1,
            itm_det: {
                txval: item.taxableValue,
                rt: item.taxRate,
                iamt: taxAmounts.iamt,
                camt: taxAmounts.camt,
                samt: taxAmounts.samt,
                csamt: taxAmounts.csamt
            }
        };
    });

    // Calculate total invoice value
    const totalTaxableValue = items.reduce((sum, item) => sum + item.taxableValue, 0);
    const totalTaxAmount = items.reduce((sum, item) => sum + (item.totalTax || 0), 0);
    const invoiceValue = totalTaxableValue + totalTaxAmount;

    // Generate GST return JSON structure
    const gstReturn = {
        gstin: supplier.gstin,
        fp: fp,
        version: config.gst.version,
        hash: "hash_placeholder",
        b2b: [
            {
                ctin: recipient.gstin,
                inv: [
                    {
                        inum: invoice.number,
                        idt: invoice.date,
                        val: invoiceValue,
                        pos: invoice.placeOfSupply || recipient.stateCode,
                        rchrg: "N",
                        diff_percent: config.gst.defaultDiffPercent,
                        inv_typ: invoice.invoiceType || INVOICE_TYPES.REGULAR,
                        itms: processedItems
                    }
                ]
            }
        ]
    };

    return gstReturn;
};

module.exports = {
    generateGSTReturnJSON,
    upload
};
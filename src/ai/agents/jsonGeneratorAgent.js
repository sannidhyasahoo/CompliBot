/**
 * JSON Generator AI Agent
 * Specialized agent for generating GST JSON from invoices and data
 */

const { generateObject, generateText } = require('ai');
const { google } = require('@ai-sdk/google');
const { z } = require('zod');
const config = require('../../config/env');
const {
    validateGSTIN,
    calculateGST,
    isInterStateTransaction,
    generateFilingPeriod,
    formatGSTDate
} = require('../../modules/gstHelper');

// Initialize AI model
const model = google('gemini-2.5-flash-lite', {
    apiKey: config.googleAI.apiKey
});

// Set environment variable for Vercel AI SDK compatibility
if (config.googleAI.apiKey && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = config.googleAI.apiKey;
}

// Invoice data extraction schema
const InvoiceDataSchema = z.object({
    supplier: z.object({
        gstin: z.string(),
        legalName: z.string(),
        tradeName: z.string().optional(),
        address: z.string(),
        state: z.string(),
        stateCode: z.string()
    }),
    recipient: z.object({
        gstin: z.string(),
        legalName: z.string(),
        tradeName: z.string().optional(),
        address: z.string(),
        state: z.string(),
        stateCode: z.string()
    }),
    invoice: z.object({
        number: z.string(),
        date: z.string(),
        totalValue: z.number(),
        placeOfSupply: z.string(),
        invoiceType: z.string().default('R')
    }),
    items: z.array(z.object({
        description: z.string(),
        hsnCode: z.string(),
        quantity: z.number(),
        unitPrice: z.number(),
        taxableValue: z.number(),
        taxRate: z.number(),
        cgst: z.number().optional(),
        sgst: z.number().optional(),
        igst: z.number().optional(),
        totalTax: z.number()
    }))
});

class JsonGeneratorAgent {
    constructor() {
        this.name = 'JSON Generator Agent';
        this.capabilities = [
            'invoice_image_processing',
            'gst_json_generation',
            'data_validation',
            'tax_calculation'
        ];
    }

    /**
     * Process user request for JSON generation
     * @param {string} userInput - User's message
     * @param {object} context - Request context
     * @returns {Promise<object>} - Processing result
     */
    async process(userInput, context = {}) {
        try {
            const { entities, intent } = context;

            // Check if user has uploaded a file
            if (context.hasFile) {
                return {
                    message: "📄 I can see you want to process an invoice. Please upload the invoice image and I'll extract the data and generate GST JSON for you.",
                    actions: [{
                        type: 'request_file_upload',
                        payload: {
                            acceptedTypes: ['image/jpeg', 'image/png', 'image/jpg'],
                            maxSize: '10MB'
                        }
                    }]
                };
            }

            // Check if user provided structured data
            if (entities.invoiceData) {
                return await this.generateFromData(entities.invoiceData, context);
            }

            // Guide user on what they can do
            return await this.generateGuidance(userInput, context);

        } catch (error) {
            console.error('[JSON Agent] Processing error:', error);
            return {
                message: "❌ I encountered an error while processing your request. Please try again or upload an invoice image.",
                error: error.message
            };
        }
    }

    /**
     * Process invoice image and extract data
     * @param {object} fileData - File information and buffer
     * @param {object} context - Request context
     * @returns {Promise<object>} - Extraction result
     */
    async processInvoiceImage(fileData, context = {}) {
        try {
            console.log('[JSON Agent] Processing invoice image...');

            // Prepare image for AI processing
            const imagePart = {
                inlineData: {
                    data: fileData.buffer.toString('base64'),
                    mimeType: fileData.mimetype
                }
            };

            // Extract invoice data using AI
            const extractedData = await this.extractInvoiceData(imagePart);

            // Validate and enhance the data
            const validatedData = this.validateAndEnhanceData(extractedData);

            // Generate GST return JSON
            const gstJson = this.generateGSTReturnFormat(validatedData);

            return {
                message: "✅ Invoice processed successfully! Here's your GST JSON data:",
                data: {
                    extractedData: validatedData,
                    gstReturnJson: gstJson,
                    summary: this.generateSummary(validatedData)
                },
                actions: [{
                    type: 'display_json',
                    payload: {
                        title: 'GST Return JSON',
                        data: gstJson
                    }
                }]
            };

        } catch (error) {
            console.error('[JSON Agent] Image processing error:', error);
            return {
                message: "❌ Failed to process the invoice image. Please ensure the image is clear and contains a valid GST invoice.",
                error: error.message
            };
        }
    }

    /**
     * Extract invoice data from image using AI
     * @param {object} imagePart - Image data for AI processing
     * @returns {Promise<object>} - Extracted invoice data
     */
    async extractInvoiceData(imagePart) {
        const prompt = `
        Extract comprehensive GST invoice details from this image.
        
        Focus on extracting:
        1. Supplier Details: GSTIN, Legal Name, Trade Name, Address, State
        2. Recipient Details: GSTIN, Legal Name, Trade Name, Address, State  
        3. Invoice Details: Invoice Number, Date, Total Value, Place of Supply
        4. Item Details: Description, HSN/SAC Code, Quantity, Unit Price, Taxable Value, Tax Rate, Tax Amounts
        5. Tax Summary: CGST, SGST, IGST amounts

        Important guidelines:
        - Extract actual values from the invoice
        - If state codes are not visible, derive from state names
        - Calculate missing tax amounts if rates are provided
        - Ensure all numeric values are numbers, not strings
        - Use standard GST state codes (01-38)
        `;

        const result = await generateObject({
            model,
            schema: InvoiceDataSchema,
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        { type: 'image', image: imagePart.inlineData.data }
                    ]
                }
            ]
        });

        return result.object;
    }

    /**
     * Generate GST JSON from structured data
     * @param {object} invoiceData - Structured invoice data
     * @param {object} context - Request context
     * @returns {Promise<object>} - Generation result
     */
    async generateFromData(invoiceData, context = {}) {
        try {
            const validatedData = this.validateAndEnhanceData(invoiceData);
            const gstJson = this.generateGSTReturnFormat(validatedData);

            return {
                message: "✅ GST JSON generated successfully from your data!",
                data: {
                    gstReturnJson: gstJson,
                    summary: this.generateSummary(validatedData)
                },
                actions: [{
                    type: 'display_json',
                    payload: {
                        title: 'Generated GST Return JSON',
                        data: gstJson
                    }
                }]
            };
        } catch (error) {
            console.error('[JSON Agent] Data generation error:', error);
            return {
                message: "❌ Failed to generate GST JSON from the provided data. Please check the data format.",
                error: error.message
            };
        }
    }

    /**
     * Generate guidance for JSON generation
     * @param {string} userInput - User's message
     * @param {object} context - Request context
     * @returns {Promise<object>} - Guidance response
     */
    async generateGuidance(userInput, context = {}) {
        const prompt = `
        The user wants help with GST JSON generation. Their message: "${userInput}"
        
        Provide helpful guidance on:
        1. How to upload invoice images
        2. What data is needed for JSON generation
        3. Supported formats and requirements
        4. Example of what they can expect
        
        Keep it concise and actionable. Use emojis appropriately.
        `;

        const result = await generateText({
            model,
            prompt
        });

        return {
            message: result.text,
            actions: [{
                type: 'show_examples',
                payload: {
                    title: 'JSON Generation Options',
                    options: [
                        '📷 Upload invoice image',
                        '📝 Provide invoice data manually',
                        '📊 Generate from existing data'
                    ]
                }
            }]
        };
    }

    /**
     * Validate and enhance extracted data
     * @param {object} data - Raw extracted data
     * @returns {object} - Validated and enhanced data
     */
    validateAndEnhanceData(data) {
        const enhanced = { ...data };

        // Validate GSTINs
        if (enhanced.supplier?.gstin && !validateGSTIN(enhanced.supplier.gstin)) {
            console.warn('Invalid supplier GSTIN:', enhanced.supplier.gstin);
        }
        if (enhanced.recipient?.gstin && !validateGSTIN(enhanced.recipient.gstin)) {
            console.warn('Invalid recipient GSTIN:', enhanced.recipient.gstin);
        }

        // Format date
        if (enhanced.invoice?.date) {
            try {
                const dateObj = new Date(enhanced.invoice.date);
                enhanced.invoice.date = formatGSTDate(dateObj);
            } catch (e) {
                console.warn('Could not format date:', enhanced.invoice.date);
            }
        }

        // Calculate missing tax amounts
        if (enhanced.items) {
            enhanced.items = enhanced.items.map(item => {
                const isIGST = isInterStateTransaction(
                    enhanced.supplier?.stateCode,
                    enhanced.recipient?.stateCode
                );

                const gstAmounts = calculateGST(item.taxableValue, item.taxRate, isIGST);

                return {
                    ...item,
                    cgst: item.cgst || gstAmounts.cgst,
                    sgst: item.sgst || gstAmounts.sgst,
                    igst: item.igst || gstAmounts.igst,
                    totalTax: item.totalTax || (gstAmounts.cgst + gstAmounts.sgst + gstAmounts.igst)
                };
            });
        }

        return enhanced;
    }

    /**
     * Generate GST return format JSON
     * @param {object} invoiceData - Validated invoice data
     * @returns {object} - GST return JSON
     */
    generateGSTReturnFormat(invoiceData) {
        const { supplier, recipient, invoice, items } = invoiceData;

        // Generate filing period
        const fp = generateFilingPeriod();

        // Process items
        const processedItems = items.map((item, index) => ({
            num: index + 1,
            itm_det: {
                txval: item.taxableValue,
                rt: item.taxRate,
                iamt: item.igst || 0,
                camt: item.cgst || 0,
                samt: item.sgst || 0,
                csamt: 0
            }
        }));

        // Calculate totals
        const totalTaxableValue = items.reduce((sum, item) => sum + item.taxableValue, 0);
        const totalTaxAmount = items.reduce((sum, item) => sum + item.totalTax, 0);
        const invoiceValue = totalTaxableValue + totalTaxAmount;

        return {
            gstin: supplier.gstin,
            fp: fp,
            version: "GST3.2.3",
            hash: "hash_placeholder",
            b2b: [{
                ctin: recipient.gstin,
                inv: [{
                    inum: invoice.number,
                    idt: invoice.date,
                    val: invoiceValue,
                    pos: invoice.placeOfSupply || recipient.stateCode,
                    rchrg: "N",
                    diff_percent: 0.65,
                    inv_typ: invoice.invoiceType || "R",
                    itms: processedItems
                }]
            }]
        };
    }

    /**
     * Generate summary of processed invoice
     * @param {object} invoiceData - Processed invoice data
     * @returns {object} - Summary information
     */
    generateSummary(invoiceData) {
        const { supplier, recipient, invoice, items } = invoiceData;

        const totalTaxableValue = items.reduce((sum, item) => sum + item.taxableValue, 0);
        const totalTax = items.reduce((sum, item) => sum + item.totalTax, 0);
        const totalValue = totalTaxableValue + totalTax;

        return {
            invoiceNumber: invoice.number,
            invoiceDate: invoice.date,
            supplierGSTIN: supplier.gstin,
            recipientGSTIN: recipient.gstin,
            itemCount: items.length,
            totalTaxableValue: totalTaxableValue,
            totalTaxAmount: totalTax,
            totalInvoiceValue: totalValue,
            isInterState: isInterStateTransaction(supplier.stateCode, recipient.stateCode)
        };
    }
}

module.exports = JsonGeneratorAgent;
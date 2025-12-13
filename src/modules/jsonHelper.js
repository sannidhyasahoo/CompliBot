/**
 * JSON Helper Module
 * Utilities for JSON processing and validation
 */

/**
 * Safely parse JSON with error handling
 * @param {string} jsonString - JSON string to parse
 * @returns {object|null} - Parsed object or null if invalid
 */
const safeJsonParse = (jsonString) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('JSON Parse Error:', error.message);
    return null;
  }
};

/**
 * Validate JSON structure against expected schema
 * @param {object} data - Data to validate
 * @param {object} schema - Expected schema structure
 * @returns {boolean} - True if valid
 */
const validateJsonSchema = (data, schema) => {
  try {
    // Basic validation - check if required fields exist
    for (const field of schema.required || []) {
      if (!(field in data)) {
        console.warn(`Missing required field: ${field}`);
        return false;
      }
    }
    return true;
  } catch (error) {
    console.error('Schema validation error:', error);
    return false;
  }
};

/**
 * Clean and format JSON response from AI
 * @param {string} rawResponse - Raw AI response
 * @returns {string} - Cleaned JSON string
 */
const cleanAIResponse = (rawResponse) => {
  // Remove markdown formatting
  let cleaned = rawResponse.replace(/```json/g, "").replace(/```/g, "").trim();

  // Remove any leading/trailing text that's not JSON
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');

  if (jsonStart !== -1 && jsonEnd !== -1) {
    cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
  }

  return cleaned;
};

/**
 * Format JSON for pretty printing
 * @param {object} data - Data to format
 * @param {number} indent - Indentation spaces
 * @returns {string} - Formatted JSON string
 */
const formatJson = (data, indent = 2) => {
  try {
    return JSON.stringify(data, null, indent);
  } catch (error) {
    console.error('JSON formatting error:', error);
    return JSON.stringify(data);
  }
};

/**
 * Deep merge two objects
 * @param {object} target - Target object
 * @param {object} source - Source object
 * @returns {object} - Merged object
 */
const deepMerge = (target, source) => {
  const result = { ...target };

  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }

  return result;
};

/**
 * Extract specific fields from object
 * @param {object} data - Source data
 * @param {array} fields - Fields to extract
 * @returns {object} - Object with only specified fields
 */
const extractFields = (data, fields) => {
  const result = {};
  fields.forEach(field => {
    if (field in data) {
      result[field] = data[field];
    }
  });
  return result;
};

/**
 * Convert object to query string
 * @param {object} params - Parameters object
 * @returns {string} - Query string
 */
const objectToQueryString = (params) => {
  return Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
};

/**
 * GST JSON Builder Class for structured GST return generation
 */
class GstJsonBuilder {
  constructor(gstin, fp) {
    this.gstin = gstin;
    this.fp = fp;
    this.version = "GST3.2.3";
    this.hash = "hash_placeholder";
    this.b2b = [];
  }

  /**
   * Add invoice to GST return
   * @param {string} ctin - Counter party GSTIN
   * @param {object} invoiceDetails - Invoice details
   * @param {array} items - Invoice items
   */
  addInvoice(ctin, invoiceDetails, items) {
    // Find existing customer or create new one
    let customer = this.b2b.find(c => c.ctin === ctin);
    if (!customer) {
      customer = { ctin, inv: [] };
      this.b2b.push(customer);
    }

    // Process items
    const processedItems = items.map((item, index) => ({
      num: index + 1,
      itm_det: {
        txval: item.txval || item.taxableValue,
        rt: item.rt || item.taxRate,
        iamt: item.iamt || item.igst || 0,
        camt: item.camt || item.cgst || 0,
        samt: item.samt || item.sgst || 0,
        csamt: item.csamt || 0
      }
    }));

    // Add invoice
    customer.inv.push({
      inum: invoiceDetails.inum || invoiceDetails.number,
      idt: invoiceDetails.idt || invoiceDetails.date,
      val: invoiceDetails.val || invoiceDetails.totalValue,
      pos: invoiceDetails.pos || invoiceDetails.placeOfSupply,
      rchrg: invoiceDetails.rchrg || "N",
      diff_percent: invoiceDetails.diff_percent || 0.65,
      inv_typ: invoiceDetails.inv_typ || invoiceDetails.invoiceType || "R",
      itms: processedItems
    });
  }

  /**
   * Build final GST return JSON
   * @returns {object} - Complete GST return JSON
   */
  build() {
    return {
      gstin: this.gstin,
      fp: this.fp,
      version: this.version,
      hash: this.hash,
      b2b: this.b2b
    };
  }
}

/**
 * Generate GSTR-1 JSON from invoice data
 * @param {object} params - Parameters object
 * @returns {object} - GSTR-1 JSON
 */
const generateGstr1Json = ({ gstin, fp, invoices }) => {
  console.log(`[Tool] Generating GSTR-1 for ${gstin}, Period: ${fp}`);

  const builder = new GstJsonBuilder(gstin, fp);

  // Process invoices
  for (const inv of invoices) {
    const { ctin, items, ...invoiceDetails } = inv;
    builder.addInvoice(ctin, invoiceDetails, items);
  }

  return builder.build();
};

module.exports = {
  safeJsonParse,
  validateJsonSchema,
  cleanAIResponse,
  formatJson,
  deepMerge,
  extractFields,
  objectToQueryString,
  GstJsonBuilder,
  generateGstr1Json
};
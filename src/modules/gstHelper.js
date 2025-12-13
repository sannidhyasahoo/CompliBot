/**
 * GST Helper Module
 * Contains utility functions for GST calculations and validations
 */

/**
 * GST State Codes mapping
 */
const GST_STATE_CODES = {
    "01": "JAMMU AND KASHMIR",
    "02": "HIMACHAL PRADESH",
    "03": "PUNJAB",
    "04": "CHANDIGARH",
    "05": "UTTARAKHAND",
    "06": "HARYANA",
    "07": "DELHI",
    "08": "RAJASTHAN",
    "09": "UTTAR PRADESH",
    "10": "BIHAR",
    "11": "SIKKIM",
    "12": "ARUNACHAL PRADESH",
    "13": "NAGALAND",
    "14": "MANIPUR",
    "15": "MIZORAM",
    "16": "TRIPURA",
    "17": "MEGHALAYA",
    "18": "ASSAM",
    "19": "WEST BENGAL",
    "20": "JHARKHAND",
    "21": "ODISHA",
    "22": "CHHATTISGARH",
    "23": "MADHYA PRADESH",
    "24": "GUJARAT",
    "25": "DAMAN AND DIU",
    "26": "DADRA AND NAGAR HAVELI",
    "27": "MAHARASHTRA",
    "28": "ANDHRA PRADESH (OLD)",
    "29": "KARNATAKA",
    "30": "GOA",
    "31": "LAKSHADWEEP",
    "32": "KERALA",
    "33": "TAMIL NADU",
    "34": "PUDUCHERRY",
    "35": "ANDAMAN AND NICOBAR ISLANDS",
    "36": "TELANGANA",
    "37": "ANDHRA PRADESH",
    "38": "LADAKH"
};

/**
 * Reverse mapping for state name to code
 */
const STATE_NAME_TO_CODE = Object.fromEntries(
    Object.entries(GST_STATE_CODES).map(([code, name]) => [name, code])
);

/**
 * Validate GSTIN format
 * @param {string} gstin - GSTIN to validate
 * @returns {boolean} - True if valid format
 */
const validateGSTIN = (gstin) => {
    if (!gstin || gstin.length !== 15) return false;

    // GSTIN format: 2 digits state code + 10 alphanumeric PAN + 1 entity code + 1 check digit + 1 default 'Z'
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstinRegex.test(gstin);
};

/**
 * Extract state code from GSTIN
 * @param {string} gstin - GSTIN
 * @returns {string} - State code
 */
const getStateCodeFromGSTIN = (gstin) => {
    if (!validateGSTIN(gstin)) return null;
    return gstin.substring(0, 2);
};

/**
 * Get state name from state code
 * @param {string} stateCode - State code
 * @returns {string} - State name
 */
const getStateName = (stateCode) => {
    return GST_STATE_CODES[stateCode] || null;
};

/**
 * Get state code from state name
 * @param {string} stateName - State name
 * @returns {string} - State code
 */
const getStateCode = (stateName) => {
    const upperStateName = stateName.toUpperCase();
    return STATE_NAME_TO_CODE[upperStateName] || null;
};

/**
 * Calculate GST amounts
 * @param {number} taxableValue - Taxable value
 * @param {number} gstRate - GST rate percentage
 * @param {boolean} isInterState - Whether it's inter-state transaction
 * @returns {object} - Tax amounts breakdown
 */
const calculateGST = (taxableValue, gstRate, isInterState = false) => {
    const totalGST = (taxableValue * gstRate) / 100;

    if (isInterState) {
        return {
            igst: parseFloat(totalGST.toFixed(2)),
            cgst: 0,
            sgst: 0,
            totalTax: parseFloat(totalGST.toFixed(2))
        };
    } else {
        const cgst = totalGST / 2;
        const sgst = totalGST / 2;
        return {
            igst: 0,
            cgst: parseFloat(cgst.toFixed(2)),
            sgst: parseFloat(sgst.toFixed(2)),
            totalTax: parseFloat(totalGST.toFixed(2))
        };
    }
};

/**
 * Determine if transaction is inter-state
 * @param {string} supplierStateCode - Supplier's state code
 * @param {string} recipientStateCode - Recipient's state code
 * @returns {boolean} - True if inter-state
 */
const isInterStateTransaction = (supplierStateCode, recipientStateCode) => {
    return supplierStateCode !== recipientStateCode;
};

/**
 * Generate filing period in MMYYYY format
 * @param {Date} date - Date object (defaults to current date)
 * @returns {string} - Filing period
 */
const generateFilingPeriod = (date = new Date()) => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}${year}`;
};

/**
 * Format date for GST returns (DD-MM-YYYY)
 * @param {Date|string} date - Date to format
 * @returns {string} - Formatted date
 */
const formatGSTDate = (date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}-${month}-${year}`;
};

/**
 * Common GST rates in India
 */
const GST_RATES = {
    EXEMPT: 0,
    GST_5: 5,
    GST_12: 12,
    GST_18: 18,
    GST_28: 28
};

/**
 * Invoice types for GST returns
 */
const INVOICE_TYPES = {
    REGULAR: 'R',
    DEBIT_NOTE: 'D',
    CREDIT_NOTE: 'C',
    EXPORT: 'EXPWP',
    EXPORT_WITH_PAYMENT: 'EXPWOP',
    SEZ_WITH_PAYMENT: 'SEWP',
    SEZ_WITHOUT_PAYMENT: 'SEWOP',
    DEEMED_EXPORT: 'DE'
};

module.exports = {
    GST_STATE_CODES,
    STATE_NAME_TO_CODE,
    validateGSTIN,
    getStateCodeFromGSTIN,
    getStateName,
    getStateCode,
    calculateGST,
    isInterStateTransaction,
    generateFilingPeriod,
    formatGSTDate,
    GST_RATES,
    INVOICE_TYPES
};
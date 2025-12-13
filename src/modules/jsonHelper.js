// gstTool.js
const GstJsonBuilder = require("./GstJsonBuilder"); // Assuming you saved the previous class here

/**
 * 1. THE EXECUTABLE FUNCTION
 * The AI Agent will execute this function when it decides to build the file.
 */
function generateGstr1Json({ gstin, fp, invoices }) {
  console.log(`[Tool] Generating GSTR-1 for ${gstin}, Period: ${fp}`);

  const builder = new GstJsonBuilder(gstin, fp);

  // Iterate through the data provided by the AI
  for (const inv of invoices) {
    // Separate metadata from items
    const { ctin, items, ...invoiceDetails } = inv;

    // Use our builder logic to handle grouping/nesting
    builder.addInvoice(ctin, invoiceDetails, items);
  }

  return builder.build();
}

/**
 * 2. THE TOOL DECLARATION (Schema)
 * This tells the Google AI SDK what this tool does and what arguments it needs.
 */
const gstToolDeclaration = {
  name: "generateGstr1Json",
  description:
    "Generates a validated GSTR-1 JSON schema for Indian GST tax filing. Use this when the user asks to create a GST return file or export invoice data to JSON.",
  parameters: {
    type: "OBJECT",
    properties: {
      gstin: {
        type: "STRING",
        description: "The GSTIN of the supplier (filer).",
      },
      fp: {
        type: "STRING",
        description: "Financial Period in 'MMYYYY' format (e.g., '122025').",
      },
      invoices: {
        type: "ARRAY",
        description: "List of all B2B invoices to be filed.",
        items: {
          type: "OBJECT",
          required: ["ctin", "inum", "idt", "val", "pos", "inv_typ", "items"],
          properties: {
            ctin: {
              type: "STRING",
              description: "Counter Party GSTIN (Buyer).",
            },
            inum: { type: "STRING", description: "Invoice number." },
            idt: { type: "STRING", description: "Invoice date (DD-MM-YYYY)." },
            val: { type: "NUMBER", description: "Total invoice value." },
            pos: {
              type: "STRING",
              description: "Place of Supply (2-digit state code).",
            },
            inv_typ: {
              type: "STRING",
              description: "Invoice type (e.g., R, DE, SEWP).",
            },
            rchrg: {
              type: "STRING",
              description: "Reverse charge 'Y' or 'N'. Defaults to N.",
            },
            diff_percent: {
              type: "NUMBER",
              description: "Differential percentage (e.g., 0.65). Optional.",
            },
            items: {
              type: "ARRAY",
              description: "Line items for this invoice.",
              items: {
                type: "OBJECT",
                required: ["num", "txval", "rt"],
                properties: {
                  num: { type: "NUMBER", description: "Item sequence number." },
                  txval: { type: "NUMBER", description: "Taxable value." },
                  rt: { type: "NUMBER", description: "Tax rate." },
                  iamt: { type: "NUMBER", description: "IGST amount." },
                  csamt: { type: "NUMBER", description: "Cess amount." },
                },
              },
            },
          },
        },
      },
    },
    required: ["gstin", "fp", "invoices"],
  },
};

module.exports = { generateGstr1Json, gstToolDeclaration };

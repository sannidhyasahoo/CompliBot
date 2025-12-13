const express = require("express");
const cors = require("cors");
const { generateGSTReturnJSON, upload } = require("./tools/jsonGenerator");

const app = express();
const PORT = 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/", (req, res) => {
    res.json({
        message: "GST Invoice Processing API",
        version: "1.0.0",
        endpoints: [
            "POST /extract-invoice - Extract basic invoice data",
            "POST /generate-gst-json - Generate GST return format JSON from invoice"
        ]
    });
});

// Original invoice extraction endpoint
app.post("/extract-invoice", upload.single("invoiceImage"), async (req, res) => {
    // Your existing invoice extraction logic here
    res.json({ message: "Original extract-invoice endpoint - implement as needed" });
});

// New GST JSON generator endpoint
app.post("/generate-gst-json", upload.single("invoiceImage"), generateGSTReturnJSON);

// Error handling middleware
app.use((error, req, res, next) => {
    console.error("Unhandled Error:", error);
    res.status(500).json({
        success: false,
        error: "Internal server error",
        message: error.message
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 GST Invoice Processing API running on http://localhost:${PORT}`);
    console.log(`📋 Available endpoints:`);
    console.log(`   POST /generate-gst-json - Generate GST return JSON from invoice image`);
    console.log(`   POST /extract-invoice - Extract basic invoice data`);
});

module.exports = app;
const express = require("express");
const cors = require("cors");
const { generateGSTReturnJSON, upload } = require("./tools/jsonGenerator");
const config = require("./config/env");

const app = express();
const PORT = config.server.port;
const CORS_ORIGIN = config.server.corsOrigin;
const NODE_ENV = config.server.nodeEnv;

// Middleware
app.use(cors({
    origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN.split(','),
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get("/", (req, res) => {
    res.json({
        message: "GST Invoice Processing API",
        version: "1.0.0",
        environment: NODE_ENV,
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
    console.log(`🌍 Environment: ${NODE_ENV}`);
    console.log(`🔧 CORS Origin: ${CORS_ORIGIN}`);
    console.log(`📋 Available endpoints:`);
    console.log(`   POST /generate-gst-json - Generate GST return JSON from invoice image`);
    console.log(`   POST /extract-invoice - Extract basic invoice data`);
});

module.exports = app;
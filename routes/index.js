const express = require("express");
const router = express.Router();

// Import route modules
const authRoutes = require("./auth");
const organizationRoutes = require("./organizations");
const tenantRoutes = require("./tenant");

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Webix Udirdlaga API is running",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// API routes
router.use("/auth", authRoutes);
router.use("/organizations", organizationRoutes);
router.use("/tenant", tenantRoutes);

// 404 handler for API routes
router.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
});

module.exports = router;

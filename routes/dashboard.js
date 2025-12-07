const express = require("express");
const router = express.Router();
const {
  getDashboardStats,
  getRecentActivities,
  getTopOrganizations,
  getSystemStatus,
} = require("../controllers/dashboardController");
const { protect, requireSuperAdmin } = require("../middleware/auth");

// All routes require authentication and super admin privileges
router.use(protect);
router.use(requireSuperAdmin);

// Dashboard routes
router.get("/stats", getDashboardStats);
router.get("/activities", getRecentActivities);
router.get("/top-organizations", getTopOrganizations);
router.get("/system-status", getSystemStatus);

module.exports = router;


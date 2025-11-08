const express = require("express");
const router = express.Router();
const {
  registerOrganization,
  getOrganizations,
  getOrganization,
  getOrganizationBySubdomain,
  checkSubdomainAvailability,
  updateOrganization,
  deleteOrganization,
  verifyOrganization,
} = require("../controllers/organizationController");
const { protect, authorize, requireSuperAdmin } = require("../middleware/auth");
const {
  validateOrganizationRegistration,
  validateOrganizationUpdate,
  validateSubdomain,
  validatePagination,
} = require("../middleware/validation");

// Public routes
router.get(
  "/subdomain/:subdomain",
  validateSubdomain,
  getOrganizationBySubdomain
);
router.get(
  "/check-subdomain/:subdomain",
  validateSubdomain,
  checkSubdomainAvailability
);

// Protected routes
router.use(protect); // All routes below require authentication

// Admin only routes
router.post("/", validateOrganizationRegistration, registerOrganization);
router.get("/", validatePagination, getOrganizations);
router.get("/:id", getOrganization);
router.put("/:id", validateOrganizationUpdate, updateOrganization);
router.delete("/:id", deleteOrganization);
router.post("/:id/verify", verifyOrganization);

module.exports = router;

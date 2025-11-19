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
const {
  addUserToOrganization,
  getOrganizationUsers,
  getOrganizationUser,
  updateOrganizationUser,
  deleteOrganizationUser,
} = require("../controllers/tenant/userController");
const { protect, authorize, requireSuperAdmin } = require("../middleware/auth");
const {
  validateOrganizationRegistration,
  validateOrganizationUpdate,
  validateSubdomain,
  validatePagination,
} = require("../middleware/validation");
const { uploadLogo, convertToBase64, handleUploadError } = require("../middleware/upload");

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
router.post(
  "/",
  uploadLogo,
  convertToBase64,
  handleUploadError,
  validateOrganizationRegistration,
  registerOrganization
);
router.get("/", validatePagination, getOrganizations);
router.get("/:id", getOrganization);
router.put(
  "/:id",
  uploadLogo,
  convertToBase64,
  handleUploadError,
  validateOrganizationUpdate,
  updateOrganization
);
router.delete("/:id", deleteOrganization);
router.post("/:id/verify", verifyOrganization);

// Organization user management routes
router.post("/:orgId/users", addUserToOrganization);
router.get("/:orgId/users", getOrganizationUsers);
router.get("/:orgId/users/:userId", getOrganizationUser);
router.put("/:orgId/users/:userId", updateOrganizationUser);
router.delete("/:orgId/users/:userId", deleteOrganizationUser);

module.exports = router;

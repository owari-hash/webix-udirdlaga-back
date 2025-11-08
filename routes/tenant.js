const express = require("express");
const router = express.Router();
const { tenantMiddleware, validateSubdomain } = require("../middleware/tenant");
const { protectTenant } = require("../middleware/tenantAuth");
const authController = require("../controllers/tenant/authController");

// All tenant routes require subdomain validation
router.use(validateSubdomain);

// Public authentication routes
router.post(
  "/:subdomain/auth/login",
  tenantMiddleware,
  authController.tenantLogin
);

// Protected routes (require authentication)
router.use(protectTenant);
router.get("/:subdomain/auth/me", tenantMiddleware, authController.getTenantMe);
router.post(
  "/:subdomain/auth/logout",
  tenantMiddleware,
  authController.tenantLogout
);

// TODO: Add other organization-specific routes here

module.exports = router;

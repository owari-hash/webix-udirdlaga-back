const express = require('express');
const router = express.Router();
const {
  registerOrganization,
  getOrganizations,
  getOrganization,
  getOrganizationBySubdomain,
  checkSubdomainAvailability,
  updateOrganization,
  deleteOrganization,
  verifyOrganization
} = require('../controllers/organizationController');
const { protect, authorize, checkOrganizationAccess } = require('../middleware/auth');
const {
  validateOrganizationRegistration,
  validateOrganizationUpdate,
  validateSubdomain,
  validatePagination
} = require('../middleware/validation');

// Public routes
router.post('/', validateOrganizationRegistration, registerOrganization);
router.get('/subdomain/:subdomain', validateSubdomain, getOrganizationBySubdomain);
router.get('/check-subdomain/:subdomain', validateSubdomain, checkSubdomainAvailability);

// Protected routes
router.use(protect); // All routes below require authentication

// Admin only routes
router.get('/', authorize('admin', 'owner'), validatePagination, getOrganizations);
router.post('/:id/verify', authorize('admin'), verifyOrganization);

// Organization-specific routes
router.get('/:id', checkOrganizationAccess, getOrganization);
router.put('/:id', checkOrganizationAccess, validateOrganizationUpdate, updateOrganization);
router.delete('/:id', checkOrganizationAccess, deleteOrganization);

module.exports = router;

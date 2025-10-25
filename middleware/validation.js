const { body, param, query, validationResult } = require("express-validator");

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((error) => ({
        field: error.path,
        message: error.msg,
        value: error.value,
      })),
    });
  }
  next();
};

// Organization validation rules
const validateOrganizationRegistration = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Organization name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Organization name must be between 2 and 100 characters"),

  body("displayName")
    .trim()
    .notEmpty()
    .withMessage("Display name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Display name must be between 2 and 100 characters"),

  body("email")
    .isArray({ min: 1 })
    .withMessage("At least one email is required")
    .custom((emails) => {
      emails.forEach((email) => {
        if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
          throw new Error("Please provide valid email addresses");
        }
      });
      return true;
    }),

  body("phone")
    .optional()
    .isArray()
    .custom((phones) => {
      if (phones) {
        phones.forEach((phone) => {
          if (!/^[0-9+\-\s()]+$/.test(phone)) {
            throw new Error("Please provide valid phone numbers");
          }
        });
      }
      return true;
    }),

  body("registrationNumber")
    .trim()
    .notEmpty()
    .withMessage("Registration number is required")
    .isLength({ min: 3, max: 50 })
    .withMessage("Registration number must be between 3 and 50 characters"),

  body("subdomain")
    .trim()
    .notEmpty()
    .withMessage("Subdomain is required")
    .isLength({ min: 3, max: 30 })
    .withMessage("Subdomain must be between 3 and 30 characters")
    .matches(/^[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?$/)
    .withMessage(
      "Subdomain must contain only lowercase letters, numbers, and hyphens"
    ),

  body("businessType")
    .optional()
    .isIn(["publisher", "distributor", "retailer", "library", "other"])
    .withMessage("Invalid business type"),

  body("industry")
    .optional()
    .isIn([
      "webtoon",
      "manga",
      "comics",
      "books",
      "media",
      "education",
      "other",
    ])
    .withMessage("Invalid industry type"),

  body("address.street")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Street address cannot exceed 200 characters"),

  body("address.city")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("City cannot exceed 100 characters"),

  body("address.postalCode")
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage("Postal code cannot exceed 20 characters"),

  handleValidationErrors,
];

// User validation rules
const validateUserRegistration = [
  body("firstName")
    .trim()
    .notEmpty()
    .withMessage("First name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be between 2 and 50 characters"),

  body("lastName")
    .trim()
    .notEmpty()
    .withMessage("Last name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2 and 50 characters"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),

  body("phone")
    .optional()
    .matches(/^[0-9+\-\s()]+$/)
    .withMessage("Please provide a valid phone number"),

  body("organizationId")
    .notEmpty()
    .withMessage("Organization ID is required")
    .isMongoId()
    .withMessage("Invalid organization ID"),

  body("role")
    .optional()
    .isIn(["user", "moderator", "admin", "owner"])
    .withMessage("Invalid role"),

  handleValidationErrors,
];

// Login validation rules
const validateLogin = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("password").notEmpty().withMessage("Password is required"),

  handleValidationErrors,
];

// Subdomain validation
const validateSubdomain = [
  param("subdomain")
    .trim()
    .notEmpty()
    .withMessage("Subdomain is required")
    .isLength({ min: 3, max: 30 })
    .withMessage("Subdomain must be between 3 and 30 characters")
    .matches(/^[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?$/)
    .withMessage(
      "Subdomain must contain only lowercase letters, numbers, and hyphens"
    ),

  handleValidationErrors,
];

// Organization update validation
const validateOrganizationUpdate = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Organization name must be between 2 and 100 characters"),

  body("displayName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Display name must be between 2 and 100 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters"),

  body("email")
    .optional()
    .isArray()
    .custom((emails) => {
      if (emails) {
        emails.forEach((email) => {
          if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
            throw new Error("Please provide valid email addresses");
          }
        });
      }
      return true;
    }),

  body("phone")
    .optional()
    .isArray()
    .custom((phones) => {
      if (phones) {
        phones.forEach((phone) => {
          if (!/^[0-9+\-\s()]+$/.test(phone)) {
            throw new Error("Please provide valid phone numbers");
          }
        });
      }
      return true;
    }),

  body("businessType")
    .optional()
    .isIn(["publisher", "distributor", "retailer", "library", "other"])
    .withMessage("Invalid business type"),

  body("industry")
    .optional()
    .isIn([
      "webtoon",
      "manga",
      "comics",
      "books",
      "media",
      "education",
      "other",
    ])
    .withMessage("Invalid industry type"),

  handleValidationErrors,
];

// Pagination validation
const validatePagination = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("sort")
    .optional()
    .isIn(["name", "createdAt", "updatedAt", "status"])
    .withMessage("Invalid sort field"),

  query("order")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Order must be asc or desc"),

  handleValidationErrors,
];

module.exports = {
  handleValidationErrors,
  validateOrganizationRegistration,
  validateUserRegistration,
  validateLogin,
  validateSubdomain,
  validateOrganizationUpdate,
  validatePagination,
};

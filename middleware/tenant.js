const { connectOrgDB, getOrgConnection } = require("../config/multiTenantDB");
const { getTenantModels } = require("../models/tenant");

// Middleware to handle tenant database connection
const tenantMiddleware = async (req, res, next) => {
  try {
    // Extract subdomain from request
    let subdomain = null;

    // Check if subdomain is in the URL path (e.g., /api/tenant/test/...)
    const pathParts = req.path.split("/");
    if (pathParts[2] === "tenant" && pathParts[3]) {
      subdomain = pathParts[3];
    }
    // Check if subdomain is in query params
    else if (req.query.subdomain) {
      subdomain = req.query.subdomain;
    }
    // Check if subdomain is in headers
    else if (req.headers["x-tenant-subdomain"]) {
      subdomain = req.headers["x-tenant-subdomain"];
    }
    // Check if subdomain is in body
    else if (req.body.subdomain) {
      subdomain = req.body.subdomain;
    }

    if (!subdomain) {
      return res.status(400).json({
        success: false,
        message: "Organization subdomain is required",
      });
    }

    // Connect to organization database
    await connectOrgDB(subdomain);

    // Get tenant models and attach to request
    req.tenantModels = getTenantModels(subdomain);
    req.subdomain = subdomain;

    next();
  } catch (error) {
    console.error("Tenant middleware error:", error);
    res.status(500).json({
      success: false,
      message: "Error connecting to organization database",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Middleware to validate subdomain format
const validateSubdomain = (req, res, next) => {
  const subdomain =
    req.params.subdomain || req.query.subdomain || req.body.subdomain;

  if (!subdomain) {
    return res.status(400).json({
      success: false,
      message: "Subdomain is required",
    });
  }

  // Validate subdomain format
  const subdomainRegex = /^[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?$/;
  if (!subdomainRegex.test(subdomain)) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid subdomain format. Use only lowercase letters, numbers, and hyphens",
    });
  }

  next();
};

module.exports = {
  tenantMiddleware,
  validateSubdomain,
};

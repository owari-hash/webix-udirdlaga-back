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

    // Find organization to check license
    // We need to use the default connection to find the organization
    const Organization = require("../models/Organization");
    const organization = await Organization.findBySubdomain(subdomain);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    // Check license status
    const isLicenseActive =
      organization.subscription &&
      organization.subscription.status === "active" &&
      (!organization.subscription.endDate ||
        new Date(organization.subscription.endDate) > new Date());

    if (!isLicenseActive) {
      // Update subscription status to inactive if license expired
      const isExpired = organization.subscription?.endDate && 
        new Date(organization.subscription.endDate) <= new Date();
      
      if (isExpired && organization.subscription?.status !== "inactive") {
        organization.subscription.status = "inactive";
        await organization.save();
      }

      return res.status(403).json({
        success: false,
        message: "Organization license is expired or inactive",
        code: "LICENSE_EXPIRED",
        organization: {
          name: organization.name,
          displayName: organization.displayName,
          contactEmail: organization.email[0],
        },
      });
    }

    // Connect to organization database
    await connectOrgDB(subdomain);

    // Get tenant models and attach to request
    req.tenantModels = getTenantModels(subdomain);
    req.subdomain = subdomain;
    req.organization = organization; // Attach organization to request for further use

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

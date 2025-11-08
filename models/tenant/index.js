const { getOrgConnection } = require("../../config/multiTenantDB");

// Cache for tenant models
const tenantModelCache = {};

// Get tenant models for a specific organization
const getTenantModels = (subdomain) => {
  if (!tenantModelCache[subdomain]) {
    const connection = getOrgConnection(subdomain);
    if (!connection) {
      throw new Error(
        `No database connection found for organization: ${subdomain}`
      );
    }

    tenantModelCache[subdomain] = {
      User: connection.model("User", require("./User")),
      Rental: connection.model("Rental", require("./Rental")),
    };
  }

  return tenantModelCache[subdomain];
};

// Clear tenant model cache for an organization
const clearTenantModels = (subdomain) => {
  delete tenantModelCache[subdomain];
};

// Clear all tenant model caches
const clearAllTenantModels = () => {
  Object.keys(tenantModelCache).forEach((subdomain) => {
    delete tenantModelCache[subdomain];
  });
};

module.exports = {
  getTenantModels,
  clearTenantModels,
  clearAllTenantModels,
};

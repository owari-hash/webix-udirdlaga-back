const jwt = require("jsonwebtoken");
const { getTenantModels } = require("../models/tenant");

// Protect tenant routes - require authentication
const protectTenant = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Check if token contains subdomain and matches current subdomain
      if (!decoded.subdomain || decoded.subdomain !== req.params.subdomain) {
        return res.status(401).json({
          success: false,
          message: "Invalid token for this organization",
        });
      }

      // Get user from tenant database
      const { User } = getTenantModels(req.params.subdomain);
      const user = await User.findById(decoded.id).select("+password");

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Token is valid but user no longer exists",
        });
      }

      // Check if user account is locked
      if (user.isLocked) {
        return res.status(423).json({
          success: false,
          message:
            "Account is temporarily locked due to too many failed login attempts",
        });
      }

      // Check if user is active
      if (user.status !== "active") {
        return res.status(401).json({
          success: false,
          message: "Account is not active",
        });
      }

      req.user = user;
      req.subdomain = req.params.subdomain;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }
  } catch (error) {
    console.error("Tenant auth middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error in authentication",
    });
  }
};

// Grant access to specific roles for tenant users
const authorizeTenant = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Please log in.",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(" or ")}`,
      });
    }

    next();
  };
};

// Check if tenant user has specific permission
const hasTenantPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Please log in.",
      });
    }

    if (!req.user.permissions || !req.user.permissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required permission: ${permission}`,
      });
    }

    next();
  };
};

module.exports = {
  protectTenant,
  authorizeTenant,
  hasTenantPermission,
};

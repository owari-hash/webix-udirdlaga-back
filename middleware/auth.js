const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Protect routes - require authentication
const protect = async (req, res, next) => {
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

      // Get user from token
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
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error in authentication",
    });
  }
};

// Grant access to specific roles
const authorize = (...roles) => {
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

// Check if user has specific permission
const hasPermission = (permission) => {
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

// Check if user belongs to organization
const checkOrganizationAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Access denied. Please log in.",
    });
  }

  const organizationId =
    req.params.organizationId ||
    req.body.organizationId ||
    req.query.organizationId;

  if (!organizationId) {
    return res.status(400).json({
      success: false,
      message: "Organization ID is required",
    });
  }

  if (req.user.organization.toString() !== organizationId.toString()) {
    return res.status(403).json({
      success: false,
      message: "Access denied. You do not have access to this organization.",
    });
  }

  next();
};

module.exports = {
  protect,
  authorize,
  hasPermission,
  checkOrganizationAccess,
};

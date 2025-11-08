const jwt = require("jsonwebtoken");
const { getTenantModels } = require("../../models/tenant");

// Generate JWT Token
const generateToken = (id, subdomain) => {
  return jwt.sign({ id, subdomain }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};

// @desc    Organization user login
// @route   POST /api/tenant/:subdomain/auth/login
// @access  Public
const tenantLogin = async (req, res) => {
  try {
    const { username, password } = req.body;
    const { subdomain } = req.params;

    // Get tenant models
    const { User } = getTenantModels(subdomain);

    // Check if user exists and include password
    const user = await User.findByUsername(username).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message:
          "Account is temporarily locked due to too many failed login attempts",
      });
    }

    // Check if account is active
    if (user.status !== "active") {
      return res.status(401).json({
        success: false,
        message: "Account is not active",
      });
    }

    // Check if password is correct
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      // Increment login attempts
      await user.incLoginAttempts();
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Reset login attempts on successful login
    if (user.loginAttempts > 0) {
      await user.resetLoginAttempts();
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id, subdomain);

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          email: user.email,
          role: user.role,
          lastLogin: user.lastLogin,
        },
        token,
        subdomain,
      },
    });
  } catch (error) {
    console.error("Tenant login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Get current tenant user
// @route   GET /api/tenant/:subdomain/auth/me
// @access  Private
const getTenantMe = async (req, res) => {
  try {
    const { subdomain } = req.params;
    const { User } = getTenantModels(subdomain);

    const user = await User.findById(req.user._id);

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error("Get tenant me error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching user data",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Logout tenant user
// @route   POST /api/tenant/:subdomain/auth/logout
// @access  Private
const tenantLogout = async (req, res) => {
  try {
    // In a stateless JWT system, logout is handled client-side
    // by removing the token. Here we can log the logout event.
    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Tenant logout error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during logout",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  tenantLogin,
  getTenantMe,
  tenantLogout,
};


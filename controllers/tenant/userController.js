const { getTenantModels } = require("../../models/tenant");
const { connectOrgDB } = require("../../config/multiTenantDB");
const mongoose = require("mongoose");

// Get organization model
const getOrganizationModel = () => {
  try {
    return mongoose.model("Organization");
  } catch (error) {
    return mongoose.model("Organization", require("../../models/Organization"));
  }
};

// @desc    Add admin user to organization
// @route   POST /api/organizations/:orgId/users
// @access  Private (Super Admin only)
const addUserToOrganization = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { firstName, lastName, username, email, password, role } = req.body;

    // Get organization from main database
    const Organization = getOrganizationModel();
    const organization = await Organization.findById(orgId);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    // Connect to organization's database
    await connectOrgDB(organization.subdomain);
    const { User } = getTenantModels(organization.subdomain);

    // Check if username already exists
    const existingUser = await User.findByUsername(username);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Username already exists in this organization",
      });
    }

    // Check if email already exists
    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: "Email already exists in this organization",
      });
    }

    // Create user in organization database
    const user = await User.create({
      firstName,
      lastName,
      username,
      email,
      password,
      role: role || "admin",
      status: "active",
      isEmailVerified: true,
    });

    // Update organization stats
    organization.stats.totalUsers = (organization.stats.totalUsers || 0) + 1;
    await organization.save();

    res.status(201).json({
      success: true,
      message: "User added to organization successfully",
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          email: user.email,
          role: user.role,
          status: user.status,
        },
        organization: {
          id: organization._id,
          name: organization.name,
          subdomain: organization.subdomain,
        },
      },
    });
  } catch (error) {
    console.error("Add user to organization error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while adding user to organization",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Get all users in an organization
// @route   GET /api/organizations/:orgId/users
// @access  Private (Super Admin or Org Admin)
const getOrganizationUsers = async (req, res) => {
  try {
    const { orgId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const role = req.query.role;
    const status = req.query.status;
    const search = req.query.search;

    // Get organization from main database
    const Organization = getOrganizationModel();
    const organization = await Organization.findById(orgId);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    // Connect to organization's database
    await connectOrgDB(organization.subdomain);
    const { User } = getTenantModels(organization.subdomain);

    // Build filter
    const filter = {};
    if (role) filter.role = role;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: {
        users,
        organization: {
          id: organization._id,
          name: organization.name,
          subdomain: organization.subdomain,
        },
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
        },
      },
    });
  } catch (error) {
    console.error("Get organization users error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching organization users",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Get single user from organization
// @route   GET /api/organizations/:orgId/users/:userId
// @access  Private (Super Admin or Org Admin)
const getOrganizationUser = async (req, res) => {
  try {
    const { orgId, userId } = req.params;

    // Get organization from main database
    const Organization = getOrganizationModel();
    const organization = await Organization.findById(orgId);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    // Connect to organization's database
    await connectOrgDB(organization.subdomain);
    const { User } = getTenantModels(organization.subdomain);

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found in this organization",
      });
    }

    res.json({
      success: true,
      data: {
        user,
        organization: {
          id: organization._id,
          name: organization.name,
          subdomain: organization.subdomain,
        },
      },
    });
  } catch (error) {
    console.error("Get organization user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching user",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Update user in organization
// @route   PUT /api/organizations/:orgId/users/:userId
// @access  Private (Super Admin or Org Admin)
const updateOrganizationUser = async (req, res) => {
  try {
    const { orgId, userId } = req.params;
    const { firstName, lastName, email, role, status } = req.body;

    // Get organization from main database
    const Organization = getOrganizationModel();
    const organization = await Organization.findById(orgId);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    // Connect to organization's database
    await connectOrgDB(organization.subdomain);
    const { User } = getTenantModels(organization.subdomain);

    const user = await User.findByIdAndUpdate(
      userId,
      {
        firstName,
        lastName,
        email,
        role,
        status,
      },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found in this organization",
      });
    }

    res.json({
      success: true,
      message: "User updated successfully",
      data: {
        user,
        organization: {
          id: organization._id,
          name: organization.name,
          subdomain: organization.subdomain,
        },
      },
    });
  } catch (error) {
    console.error("Update organization user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating user",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Delete user from organization
// @route   DELETE /api/organizations/:orgId/users/:userId
// @access  Private (Super Admin or Org Owner)
const deleteOrganizationUser = async (req, res) => {
  try {
    const { orgId, userId } = req.params;

    // Get organization from main database
    const Organization = getOrganizationModel();
    const organization = await Organization.findById(orgId);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    // Connect to organization's database
    await connectOrgDB(organization.subdomain);
    const { User } = getTenantModels(organization.subdomain);

    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found in this organization",
      });
    }

    // Update organization stats
    organization.stats.totalUsers = Math.max(
      (organization.stats.totalUsers || 1) - 1,
      0
    );
    await organization.save();

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete organization user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting user",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  addUserToOrganization,
  getOrganizationUsers,
  getOrganizationUser,
  updateOrganizationUser,
  deleteOrganizationUser,
};

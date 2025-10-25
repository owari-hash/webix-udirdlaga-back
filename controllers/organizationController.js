const Organization = require('../models/Organization');
const User = require('../models/User');
const crypto = require('crypto');

// @desc    Register new organization
// @route   POST /api/organizations
// @access  Public
const registerOrganization = async (req, res) => {
  try {
    const {
      name,
      displayName,
      description,
      email,
      phone,
      registrationNumber,
      subdomain,
      customDomain,
      businessType,
      industry,
      address,
      adminUser
    } = req.body;

    // Check if subdomain is available
    const existingOrg = await Organization.findOne({ subdomain: subdomain.toLowerCase() });
    if (existingOrg) {
      return res.status(400).json({
        success: false,
        message: 'Subdomain is already taken'
      });
    }

    // Check if registration number is unique
    const existingReg = await Organization.findOne({ registrationNumber });
    if (existingReg) {
      return res.status(400).json({
        success: false,
        message: 'Registration number already exists'
      });
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Create organization
    const organization = await Organization.create({
      name,
      displayName,
      description,
      email,
      phone,
      registrationNumber,
      subdomain: subdomain.toLowerCase(),
      customDomain,
      businessType,
      industry,
      address,
      verificationToken,
      verificationExpires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      adminUsers: []
    });

    // Create admin user if provided
    if (adminUser) {
      const user = await User.create({
        ...adminUser,
        organization: organization._id,
        role: 'owner',
        permissions: ['read', 'write', 'delete', 'manage_users', 'manage_content', 'manage_settings']
      });

      // Add user to organization's admin list
      organization.adminUsers.push({
        userId: user._id,
        role: 'owner',
        permissions: ['read', 'write', 'delete', 'manage_users', 'manage_content', 'manage_settings']
      });
      await organization.save();
    }

    res.status(201).json({
      success: true,
      message: 'Organization registered successfully',
      data: {
        organization: {
          id: organization._id,
          name: organization.name,
          displayName: organization.displayName,
          subdomain: organization.subdomain,
          domainUrl: organization.domainUrl,
          status: organization.status,
          isVerified: organization.isVerified
        }
      }
    });
  } catch (error) {
    console.error('Organization registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during organization registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get all organizations
// @route   GET /api/organizations
// @access  Private (Admin only)
const getOrganizations = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const sort = req.query.sort || 'createdAt';
    const order = req.query.order === 'asc' ? 1 : -1;
    const status = req.query.status;
    const search = req.query.search;

    // Build filter object
    const filter = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { displayName: { $regex: search, $options: 'i' } },
        { subdomain: { $regex: search, $options: 'i' } },
        { registrationNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const organizations = await Organization.find(filter)
      .select('-verificationToken -verificationExpires -apiKeys')
      .sort({ [sort]: order })
      .skip(skip)
      .limit(limit)
      .populate('adminUsers.userId', 'firstName lastName email role');

    const total = await Organization.countDocuments(filter);

    res.json({
      success: true,
      data: {
        organizations,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit
        }
      }
    });
  } catch (error) {
    console.error('Get organizations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching organizations',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get organization by ID
// @route   GET /api/organizations/:id
// @access  Private
const getOrganization = async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id)
      .select('-verificationToken -verificationExpires -apiKeys')
      .populate('adminUsers.userId', 'firstName lastName email role');

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    res.json({
      success: true,
      data: { organization }
    });
  } catch (error) {
    console.error('Get organization error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching organization',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get organization by subdomain
// @route   GET /api/organizations/subdomain/:subdomain
// @access  Public
const getOrganizationBySubdomain = async (req, res) => {
  try {
    const organization = await Organization.findBySubdomain(req.params.subdomain)
      .select('-verificationToken -verificationExpires -apiKeys');

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    res.json({
      success: true,
      data: { organization }
    });
  } catch (error) {
    console.error('Get organization by subdomain error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching organization',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Check subdomain availability
// @route   GET /api/organizations/check-subdomain/:subdomain
// @access  Public
const checkSubdomainAvailability = async (req, res) => {
  try {
    const isAvailable = await Organization.isSubdomainAvailable(req.params.subdomain);
    
    res.json({
      success: true,
      data: {
        subdomain: req.params.subdomain,
        available: isAvailable
      }
    });
  } catch (error) {
    console.error('Check subdomain availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while checking subdomain availability',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update organization
// @route   PUT /api/organizations/:id
// @access  Private (Organization admin/owner)
const updateOrganization = async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    // Check if user has permission to update
    const isAdmin = organization.adminUsers.some(
      admin => admin.userId.toString() === req.user._id.toString()
    );

    if (!isAdmin && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    // Check subdomain availability if changing
    if (req.body.subdomain && req.body.subdomain !== organization.subdomain) {
      const isAvailable = await Organization.isSubdomainAvailable(req.body.subdomain);
      if (!isAvailable) {
        return res.status(400).json({
          success: false,
          message: 'Subdomain is already taken'
        });
      }
    }

    const updatedOrganization = await Organization.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-verificationToken -verificationExpires -apiKeys');

    res.json({
      success: true,
      message: 'Organization updated successfully',
      data: { organization: updatedOrganization }
    });
  } catch (error) {
    console.error('Update organization error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating organization',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Delete organization
// @route   DELETE /api/organizations/:id
// @access  Private (Organization owner only)
const deleteOrganization = async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    // Check if user is owner
    const isOwner = organization.adminUsers.some(
      admin => admin.userId.toString() === req.user._id.toString() && admin.role === 'owner'
    );

    if (!isOwner && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Owner privileges required.'
      });
    }

    // Soft delete - change status to deleted
    organization.status = 'deleted';
    await organization.save();

    res.json({
      success: true,
      message: 'Organization deleted successfully'
    });
  } catch (error) {
    console.error('Delete organization error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting organization',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Verify organization
// @route   POST /api/organizations/:id/verify
// @access  Private (Admin only)
const verifyOrganization = async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    organization.isVerified = true;
    organization.status = 'active';
    await organization.save();

    res.json({
      success: true,
      message: 'Organization verified successfully',
      data: { organization }
    });
  } catch (error) {
    console.error('Verify organization error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while verifying organization',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  registerOrganization,
  getOrganizations,
  getOrganization,
  getOrganizationBySubdomain,
  checkSubdomainAvailability,
  updateOrganization,
  deleteOrganization,
  verifyOrganization
};

const mongoose = require("mongoose");
const organizationSchema = require("../models/Organization");
const {
  getToken,
  createCompanyMerchant,
  createPersonMerchant,
  deleteMerchant,
  getValidAccessToken,
} = require("../services/qpayService");

// Register model if not already registered
const getOrganizationModel = () => {
  try {
    return mongoose.model("Organization");
  } catch (error) {
    return mongoose.model("Organization", organizationSchema);
  }
};

/**
 * @desc    Set/Update QPay settings for organization
 * @route   PUT /api/organizations/:orgId/qpay/settings
 * @access  Private (Organization admin/owner)
 */
const setQPaySettings = async (req, res) => {
  try {
    const Organization = getOrganizationModel();
    const organization = await Organization.findById(req.params.orgId);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    // Check if user has permission
    const isAdmin = organization.adminUsers && organization.adminUsers.some(
      (admin) => admin.userId.toString() === req.user._id.toString()
    );

    if (!isAdmin && req.user.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
    }

    const { terminal_id } = req.body;

    if (!terminal_id) {
      return res.status(400).json({
        success: false,
        message: "terminal_id is required",
      });
    }

    // Initialize qpay object if it doesn't exist
    if (!organization.qpay) {
      organization.qpay = {};
    }

    // Update or set terminal_id
    if (!organization.qpay.credentials) {
      organization.qpay.credentials = {};
    }

    organization.qpay.credentials.terminal_id = terminal_id;

    await organization.save();

    res.json({
      success: true,
      message: "QPay settings updated successfully",
      data: {
        organization: {
          id: organization._id,
          name: organization.name,
        },
        qpay: {
          terminal_id: organization.qpay.credentials.terminal_id,
        },
      },
    });
  } catch (error) {
    console.error("Set QPay settings error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating QPay settings",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Register QPay merchant for organization (create)
 * @route   POST /api/organizations/:orgId/qpay/register
 * @access  Private (Organization admin/owner)
 */
const registerQPayMerchant = async (req, res) => {
  try {
    const Organization = getOrganizationModel();
    const organization = await Organization.findById(req.params.orgId);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    // Check if user has permission
    const isAdmin = organization.adminUsers && organization.adminUsers.some(
      (admin) => admin.userId.toString() === req.user._id.toString()
    );

    if (!isAdmin && req.user.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
    }

    const {
      // QPay credentials (optional - will use env vars if not provided)
      username,
      password,
      terminal_id, // Optional - will use saved settings if not provided
      // Merchant type
      merchant_type, // "company" or "person"
      // Company merchant data
      owner_first_name,
      owner_last_name,
      register_number,
      company_name,
      name,
      name_eng,
      mcc_code,
      city,
      district,
      address,
      phone,
      email,
      owner_register_no,
      // Person merchant data
      first_name,
      last_name,
      business_name,
      business_name_eng,
      // Bank account information
      bank_accounts,
    } = req.body;

    // Use global QPay credentials from env if not provided
    const qpayUsername = username || process.env.QPAY_USERNAME;
    const qpayPassword = password || process.env.QPAY_PASSWORD;

    // Validate required fields
    if (!qpayUsername || !qpayPassword) {
      return res.status(400).json({
        success: false,
        message:
          "QPay credentials are required. Provide username/password in request or set QPAY_USERNAME and QPAY_PASSWORD in environment variables.",
      });
    }

    // Use terminal_id from request, saved settings, or use default from env
    // QPay automatically assigns a default terminal, but we still need a terminal_id for API calls
    // If not provided, we can use a default or let QPay handle it
    const qpayTerminalId =
      terminal_id ||
      (organization.qpay &&
        organization.qpay.credentials &&
        organization.qpay.credentials.terminal_id) ||
      process.env.QPAY_DEFAULT_TERMINAL_ID ||
      null;

    // Note: terminal_id might be optional if QPay auto-assigns, but API still requires it
    // For now, we'll allow it to be null and let QPay API handle the error if needed
    // If QPay truly auto-assigns, the API should work without it

    if (!merchant_type || !["company", "person"].includes(merchant_type)) {
      return res.status(400).json({
        success: false,
        message: "merchant_type must be either 'company' or 'person'",
      });
    }

    // Validate company merchant fields
    if (merchant_type === "company") {
      if (
        !register_number ||
        !company_name ||
        !name ||
        !mcc_code ||
        !city ||
        !district ||
        !address ||
        !phone ||
        !email
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Company merchant requires: register_number, company_name, name, mcc_code, city, district, address, phone, email",
        });
      }
    }

    // Validate person merchant fields
    if (merchant_type === "person") {
      if (
        !register_number ||
        !first_name ||
        !last_name ||
        !business_name ||
        !mcc_code ||
        !city ||
        !district ||
        !address ||
        !phone ||
        !email
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Person merchant requires: register_number, first_name, last_name, business_name, mcc_code, city, district, address, phone, email",
        });
      }
    }

    // Step 1: Get QPay token
    let tokenData;
    try {
      // If terminal_id is not provided, QPay should auto-assign, but API might still require it
      // Try with the terminal_id if available, otherwise let QPay API handle it
      if (!qpayTerminalId) {
        return res.status(400).json({
          success: false,
          message:
            "terminal_id is required for initial registration. QPay will auto-assign a default terminal after account creation. Please provide terminal_id in the request or set it via PUT /api/organizations/:orgId/qpay/settings",
        });
      }
      tokenData = await getToken(qpayUsername, qpayPassword, qpayTerminalId);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Failed to authenticate with QPay",
        error: error.message,
      });
    }

    // Step 2: Create merchant based on type
    let merchantResponse;
    try {
      if (merchant_type === "company") {
        const merchantData = {
          owner_first_name,
          owner_last_name,
          register_number,
          company_name,
          name,
          name_eng,
          mcc_code,
          city,
          district,
          address,
          phone,
          email,
          owner_register_no,
        };
        // Remove undefined fields
        Object.keys(merchantData).forEach(
          (key) => merchantData[key] === undefined && delete merchantData[key]
        );
        merchantResponse = await createCompanyMerchant(
          tokenData.access_token,
          merchantData
        );
      } else {
        // person
        const merchantData = {
          register_number,
          first_name,
          last_name,
          name: name || `${first_name} ${last_name}`,
          name_eng: name_eng || `${first_name} ${last_name}`,
          business_name,
          business_name_eng,
          mcc_code,
          city,
          district,
          address,
          phone,
          email,
        };
        // Remove undefined fields
        Object.keys(merchantData).forEach(
          (key) => merchantData[key] === undefined && delete merchantData[key]
        );
        merchantResponse = await createPersonMerchant(
          tokenData.access_token,
          merchantData
        );
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Failed to create merchant in QPay",
        error: error.message,
      });
    }

    // Step 3: Save QPay data to organization
    // Initialize qpay object if it doesn't exist
    if (!organization.qpay) {
      organization.qpay = {};
    }
    if (!organization.qpay.credentials) {
      organization.qpay.credentials = {};
    }

    // Save terminal_id if provided in request, otherwise keep existing
    if (terminal_id) {
      organization.qpay.credentials.terminal_id = terminal_id;
    } else if (!organization.qpay.credentials.terminal_id) {
      organization.qpay.credentials.terminal_id = qpayTerminalId;
    }

    // Save token
    organization.qpay.token = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: tokenData.expires_at,
    };

    // Save merchant info
    organization.qpay.khariltsagch = {
      merchant_id: merchantResponse.id || merchantResponse.merchant_id,
      merchant_type,
      register_number,
      name: merchantResponse.name || name || company_name,
      created_at: new Date(),
    };

    // Save bank account information if provided
    if (bank_accounts && Array.isArray(bank_accounts) && bank_accounts.length > 0) {
      organization.qpay.bank_accounts = bank_accounts.map((account) => ({
        account_bank_code: account.account_bank_code,
        account_number: account.account_number,
        account_name: account.account_name,
        is_default: account.is_default !== undefined ? account.is_default : false,
      }));
    }

    await organization.save();

    res.status(201).json({
      success: true,
      message: "QPay merchant registered successfully",
      data: {
        merchant: {
          id: organization.qpay.khariltsagch.merchant_id,
          type: merchant_type,
          name: organization.qpay.khariltsagch.name,
          register_number: organization.qpay.khariltsagch.register_number,
        },
        organization: {
          id: organization._id,
          name: organization.name,
        },
      },
    });
  } catch (error) {
    console.error("Register QPay merchant error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while registering QPay merchant",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Delete QPay merchant for organization
 * @route   DELETE /api/organizations/:orgId/qpay/merchant
 * @access  Private (Organization admin/owner)
 */
const deleteQPayMerchant = async (req, res) => {
  try {
    const Organization = getOrganizationModel();
    const organization = await Organization.findById(req.params.orgId);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    // Check if user has permission
    const isAdmin = organization.adminUsers && organization.adminUsers.some(
      (admin) => admin.userId.toString() === req.user._id.toString()
    );

    if (!isAdmin && req.user.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
    }

    // Check if QPay merchant is registered
    if (
      !organization.qpay ||
      !organization.qpay.khariltsagch ||
      !organization.qpay.khariltsagch.merchant_id
    ) {
      return res.status(400).json({
        success: false,
        message: "QPay merchant is not registered for this organization",
      });
    }

    const merchantId = organization.qpay.khariltsagch.merchant_id;

    // Get valid access token
    let accessToken;
    try {
      accessToken = await getValidAccessToken(organization);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Failed to get QPay access token",
        error: error.message,
      });
    }

    // Delete merchant from QPay
    try {
      await deleteMerchant(accessToken, merchantId);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Failed to delete merchant from QPay",
        error: error.message,
      });
    }

    // Clear QPay merchant data from organization (keep credentials for potential re-registration)
    if (organization.qpay && organization.qpay.khariltsagch) {
      organization.qpay.khariltsagch.merchant_id = null;
      organization.qpay.khariltsagch.merchant_type = null;
      organization.qpay.khariltsagch.register_number = null;
      organization.qpay.khariltsagch.name = null;
      organization.qpay.khariltsagch.created_at = null;
      organization.markModified("qpay.khariltsagch");
    }

    await organization.save();

    res.json({
      success: true,
      message: "QPay merchant deleted successfully",
      data: {
        organization: {
          id: organization._id,
          name: organization.name,
        },
      },
    });
  } catch (error) {
    console.error("Delete QPay merchant error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting QPay merchant",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Get QPay settings for organization
 * @route   GET /api/organizations/:orgId/qpay/settings
 * @access  Private (Organization admin/owner)
 */
const getQPaySettings = async (req, res) => {
  try {
    const Organization = getOrganizationModel();
    const organization = await Organization.findById(req.params.orgId).select(
      "qpay name adminUsers"
    );

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    // Check if user has permission
    const isAdmin = organization.adminUsers && organization.adminUsers.some(
      (admin) => admin.userId.toString() === req.user._id.toString()
    );

    if (!isAdmin && req.user.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
    }

    const hasSettings =
      organization.qpay &&
      organization.qpay.credentials &&
      organization.qpay.credentials.terminal_id;

    res.json({
      success: true,
      data: {
        hasSettings,
        settings: hasSettings
          ? {
              terminal_id: organization.qpay.credentials.terminal_id,
            }
          : null,
        hasGlobalCredentials: !!(
          process.env.QPAY_USERNAME && process.env.QPAY_PASSWORD
        ),
      },
    });
  } catch (error) {
    console.error("Get QPay settings error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching QPay settings",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Get QPay merchant status for organization
 * @route   GET /api/organizations/:orgId/qpay/merchant
 * @access  Private (Organization admin/owner)
 */
const getQPayMerchant = async (req, res) => {
  try {
    const Organization = getOrganizationModel();
    const organization = await Organization.findById(req.params.orgId).select(
      "qpay name adminUsers"
    );

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    // Check if user has permission
    const isAdmin = organization.adminUsers && organization.adminUsers.some(
      (admin) => admin.userId.toString() === req.user._id.toString()
    );

    if (!isAdmin && req.user.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
    }

    const hasMerchant =
      organization.qpay &&
      organization.qpay.khariltsagch &&
      organization.qpay.khariltsagch.merchant_id;

    res.json({
      success: true,
      data: {
        registered: hasMerchant,
        merchant: hasMerchant
          ? {
              id: organization.qpay.khariltsagch.merchant_id,
              type: organization.qpay.khariltsagch.merchant_type,
              name: organization.qpay.khariltsagch.name,
              register_number: organization.qpay.khariltsagch.register_number,
              created_at: organization.qpay.khariltsagch.created_at,
            }
          : null,
        hasTerminalId:
          organization.qpay &&
          organization.qpay.credentials &&
          organization.qpay.credentials.terminal_id,
        hasGlobalCredentials: !!(
          process.env.QPAY_USERNAME && process.env.QPAY_PASSWORD
        ),
      },
    });
  } catch (error) {
    console.error("Get QPay merchant error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching QPay merchant",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  setQPaySettings,
  getQPaySettings,
  registerQPayMerchant,
  deleteQPayMerchant,
  getQPayMerchant,
};

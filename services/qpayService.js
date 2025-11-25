const axios = require("axios");

// QPay API Base URL - can be overridden with QPAY_BASE_URL environment variable
// Sandbox: https://sandbox-quickqr.qpay.mn
// Production: https://vendor.qpay.mn
const QPAY_BASE_URL =
  process.env.QPAY_BASE_URL || "https://sandbox-quickqr.qpay.mn";

/**
 * Get QPay authentication token
 * @param {string} username - QPay username
 * @param {string} password - QPay password
 * @param {string} terminalId - Terminal ID
 * @returns {Promise<Object>} Token response with access_token, refresh_token, expires_at
 */
const getToken = async (username, password, terminalId) => {
  try {
    // Create basic auth header
    const authHeader = Buffer.from(`${username}:${password}`).toString(
      "base64"
    );

    const response = await axios.post(
      `${QPAY_BASE_URL}/v2/auth/token`,
      {
        terminal_id: terminalId,
      },
      {
        headers: {
          Authorization: `Basic ${authHeader}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data && response.data.access_token) {
      // Calculate expiration time (assuming token expires in the time specified in response)
      const expiresIn = response.data.expires_in || 3600; // Default to 1 hour if not provided
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token || null,
        expires_at: expiresAt,
      };
    }

    throw new Error("Invalid token response from QPay");
  } catch (error) {
    console.error(
      "QPay getToken error:",
      error.response?.data || error.message
    );
    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Failed to get QPay token"
    );
  }
};

/**
 * Refresh QPay token
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<Object>} New token response
 */
const refreshToken = async (refreshToken) => {
  try {
    const response = await axios.post(
      `${QPAY_BASE_URL}/v2/auth/refresh`,
      {},
      {
        headers: {
          Authorization: `Bearer ${refreshToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data && response.data.access_token) {
      const expiresIn = response.data.expires_in || 3600;
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token || refreshToken,
        expires_at: expiresAt,
      };
    }

    throw new Error("Invalid refresh token response from QPay");
  } catch (error) {
    console.error(
      "QPay refreshToken error:",
      error.response?.data || error.message
    );
    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Failed to refresh QPay token"
    );
  }
};

/**
 * Create company merchant
 * @param {string} accessToken - QPay access token
 * @param {Object} merchantData - Merchant data
 * @returns {Promise<Object>} Created merchant response
 */
const createCompanyMerchant = async (accessToken, merchantData) => {
  try {
    const response = await axios.post(
      `${QPAY_BASE_URL}/v2/merchant/company`,
      merchantData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      "QPay createCompanyMerchant error:",
      error.response?.data || error.message
    );
    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Failed to create company merchant"
    );
  }
};

/**
 * Create person merchant
 * @param {string} accessToken - QPay access token
 * @param {Object} merchantData - Merchant data
 * @returns {Promise<Object>} Created merchant response
 */
const createPersonMerchant = async (accessToken, merchantData) => {
  try {
    const response = await axios.post(
      `${QPAY_BASE_URL}/v2/merchant/person`,
      merchantData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      "QPay createPersonMerchant error:",
      error.response?.data || error.message
    );
    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Failed to create person merchant"
    );
  }
};

/**
 * Delete merchant
 * @param {string} accessToken - QPay access token
 * @param {string} merchantId - Merchant ID
 * @returns {Promise<Object>} Delete response
 */
const deleteMerchant = async (accessToken, merchantId) => {
  try {
    const response = await axios.delete(
      `${QPAY_BASE_URL}/v2/merchant/${merchantId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      "QPay deleteMerchant error:",
      error.response?.data || error.message
    );
    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Failed to delete merchant"
    );
  }
};

/**
 * Get valid access token (checks expiration and refreshes if needed)
 * @param {Object} organization - Organization document with QPay credentials
 * @returns {Promise<string>} Valid access token
 */
const getValidAccessToken = async (organization) => {
  // Use global QPay credentials from env
  const username = process.env.QPAY_USERNAME;
  const password = process.env.QPAY_PASSWORD;

  if (!username || !password) {
    throw new Error(
      "QPay credentials not configured. Set QPAY_USERNAME and QPAY_PASSWORD in environment variables."
    );
  }

  if (!organization.qpay || !organization.qpay.credentials) {
    throw new Error("QPay terminal_id not configured for organization");
  }

  const { terminal_id } = organization.qpay.credentials;

  if (!terminal_id) {
    throw new Error("QPay terminal_id is required for organization");
  }

  // Check if we have a valid token
  if (
    organization.qpay.token &&
    organization.qpay.token.access_token &&
    organization.qpay.token.expires_at &&
    new Date(organization.qpay.token.expires_at) > new Date()
  ) {
    return organization.qpay.token.access_token;
  }

  // Try to refresh if we have a refresh token
  if (
    organization.qpay.token &&
    organization.qpay.token.refresh_token &&
    organization.qpay.token.expires_at &&
    new Date(organization.qpay.token.expires_at) <= new Date()
  ) {
    try {
      const newToken = await refreshToken(
        organization.qpay.token.refresh_token
      );
      return newToken.access_token;
    } catch (error) {
      console.log("Token refresh failed, getting new token:", error.message);
      // Fall through to get new token
    }
  }

  // Get new token
  const tokenData = await getToken(username, password, terminal_id);
  return tokenData.access_token;
};

module.exports = {
  getToken,
  refreshToken,
  createCompanyMerchant,
  createPersonMerchant,
  deleteMerchant,
  getValidAccessToken,
};

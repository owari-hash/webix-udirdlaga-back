const mongoose = require("mongoose");

// Store connections for each organization
const connections = {};

// Default database connection (for admin and organization management)
let defaultConnection = null;

// Connect to default database
const connectDefaultDB = async () => {
  try {
    defaultConnection = await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/webix-udirdlaga"
    );
    console.log(
      "Default MongoDB Connected:",
      defaultConnection.connection.host
    );
    return defaultConnection;
  } catch (error) {
    console.error("Default Database connection error:", error);
    process.exit(1);
  }
};

// Connect to organization-specific database
const connectOrgDB = async (subdomain) => {
  try {
    // If connection already exists, return it
    if (connections[subdomain]) {
      return connections[subdomain];
    }

    // Create new connection for this organization
    const orgDBName = `webix_${subdomain}`;
    const baseUri = process.env.MONGODB_URI || "mongodb://localhost:27017";

    // Remove any existing database name from the URI to get the base connection string
    // Only remove the database name if it exists (after the last slash)
    const cleanBaseUri =
      baseUri.includes("/") && baseUri.split("/").length > 3
        ? baseUri.replace(/\/[^\/]*$/, "")
        : baseUri;

    // Create the organization-specific URI
    const orgUri = `${cleanBaseUri}/${orgDBName}`;

    const orgConnection = await mongoose.createConnection(orgUri);

    // Store the connection
    connections[subdomain] = orgConnection;

    console.log(`Organization database connected: ${orgDBName}`);
    return orgConnection;
  } catch (error) {
    console.error(
      `Error connecting to organization database ${subdomain}:`,
      error
    );
    throw error;
  }
};

// Get organization connection
const getOrgConnection = (subdomain) => {
  return connections[subdomain];
};

// Get default connection
const getDefaultConnection = () => {
  return defaultConnection;
};

// Close organization connection
const closeOrgConnection = async (subdomain) => {
  if (connections[subdomain]) {
    await connections[subdomain].close();
    delete connections[subdomain];
    console.log(`Organization database closed: ${subdomain}`);
  }
};

// Close all connections
const closeAllConnections = async () => {
  // Close organization connections
  for (const subdomain in connections) {
    await connections[subdomain].close();
  }

  // Close default connection
  if (defaultConnection) {
    await defaultConnection.close();
  }

  console.log("All database connections closed");
};

module.exports = {
  connectDefaultDB,
  connectOrgDB,
  getOrgConnection,
  getDefaultConnection,
  closeOrgConnection,
  closeAllConnections,
};

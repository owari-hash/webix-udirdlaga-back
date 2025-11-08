const { connectOrgDB } = require("./config/multiTenantDB");
const { getTenantModels } = require("./models/tenant");

async function testUserCreation() {
  try {
    console.log("Testing user creation in organization database...");

    // Connect to the organization database
    await connectOrgDB("baiguullagassss");
    const { User } = getTenantModels("baiguullagassss");

    // Check if user already exists
    const existingUser = await User.findByUsername("baiguullagassss");
    if (existingUser) {
      console.log("✅ User already exists:", existingUser.username);
      return;
    }

    // Create a test user
    const testUser = await User.create({
      firstName: "Admin",
      lastName: "User",
      username: "baiguullagassss",
      email: "baiguullagassss@webix.com",
      password: "test123",
      role: "admin",
      status: "active",
      isEmailVerified: true,
    });

    console.log("✅ Test user created successfully:", testUser.username);

    // Verify the user was created
    const createdUser = await User.findByUsername("baiguullagassss");
    console.log("✅ User verification:", createdUser ? "Found" : "Not found");
  } catch (error) {
    console.error("❌ Error creating test user:", error.message);
  }
}

testUserCreation();


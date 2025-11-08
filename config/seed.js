const mongoose = require("mongoose");

const seedAdmin = async () => {
  try {
    // Get Admin model
    const Admin = mongoose.model("Admin", require("../models/Admin"));

    // Check if admin already exists
    const existingAdmin = await Admin.findByUsername("admin");

    if (existingAdmin) {
      console.log("Admin user already exists");
      return;
    }

    // Create default admin user
    const admin = await Admin.create({
      username: "admin",
      password: "123",
      email: "admin@webix.com",
      role: "super_admin",
      isActive: true,
    });

    console.log("✅ Admin user created successfully:");
    console.log(`   Username: ${admin.username}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Role: ${admin.role}`);
  } catch (error) {
    console.error("❌ Error seeding admin user:", error);
  }
};

module.exports = seedAdmin;

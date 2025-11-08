const mongoose = require("mongoose");
require("dotenv").config();

// Connect to MongoDB
mongoose.connect(
  process.env.MONGODB_URI || "mongodb://localhost:27017/webix-udirdlaga",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

// Admin schema
const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, default: "super_admin" },
  isActive: { type: Boolean, default: true },
});

// Hash password
const bcrypt = require("bcryptjs");
adminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

const Admin = mongoose.model("Admin", adminSchema);

async function createAdmin() {
  try {
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ username: "admin" });

    if (existingAdmin) {
      console.log("✅ Admin user already exists!");
      console.log("Username: admin");
      console.log("Password: 123");
      process.exit(0);
    }

    // Create admin user
    const admin = new Admin({
      username: "admin",
      password: "123",
      email: "admin@webix.com",
      role: "super_admin",
      isActive: true,
    });

    await admin.save();

    console.log("✅ Admin user created successfully!");
    console.log("Username: admin");
    console.log("Password: 123");
    console.log("Email: admin@webix.com");
  } catch (error) {
    console.error("❌ Error creating admin:", error);
  } finally {
    mongoose.connection.close();
  }
}

createAdmin();



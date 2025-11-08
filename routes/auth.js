const express = require("express");
const router = express.Router();
const { adminLogin, getMe, logout } = require("../controllers/authController");
const { protect } = require("../middleware/auth");

// Public routes
router.post("/login", adminLogin);

// Protected routes
router.use(protect); // All routes below require authentication

router.get("/me", getMe);
router.post("/logout", logout);

module.exports = router;

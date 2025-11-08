const express = require("express");
const router = express.Router();
const { adminLogin, getMe, logout } = require("../controllers/authController");
const { protect } = require("../middleware/auth");

// Info endpoint
router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Authentication endpoints",
    endpoints: {
      login: "POST /api/auth/login",
      me: "GET /api/auth/me (protected)",
      logout: "POST /api/auth/logout (protected)",
    },
  });
});

// Public routes
router.post("/login", adminLogin);

// Protected routes
router.use(protect); // All routes below require authentication

router.get("/me", getMe);
router.post("/logout", logout);

module.exports = router;

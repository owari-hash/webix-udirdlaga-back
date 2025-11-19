const multer = require("multer");

// Configure multer to store files in memory (for base64 conversion)
const storage = multer.memoryStorage();

// File filter - only allow images
const fileFilter = (req, file, cb) => {
  // Allowed image MIME types
  const allowedMimes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed."
      ),
      false
    );
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter,
});

// Middleware for single logo upload - converts to base64
const uploadLogo = upload.single("logo");

// Middleware to convert uploaded file to base64
const convertToBase64 = (req, res, next) => {
  if (req.file) {
    // Convert buffer to base64
    const base64String = req.file.buffer.toString("base64");
    const mimeType = req.file.mimetype;

    // Create data URI
    req.body.logo = `data:${mimeType};base64,${base64String}`;

    // Remove file object since we're using base64 now
    delete req.file;
  }
  next();
};

// Middleware to handle upload errors
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File too large. Maximum size is 5MB.",
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
  next();
};

module.exports = {
  uploadLogo,
  convertToBase64,
  handleUploadError,
};

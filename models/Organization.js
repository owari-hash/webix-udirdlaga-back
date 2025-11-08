const mongoose = require("mongoose");
const Schema = mongoose.Schema;

mongoose.pluralize(null);

const organizationSchema = new Schema(
  {
    // Basic Information
    name: {
      type: String,
      required: [true, "Organization name is required"],
      trim: true,
      maxlength: [100, "Organization name cannot exceed 100 characters"],
    },
    displayName: {
      type: String,
      required: [true, "Display name is required"],
      trim: true,
      maxlength: [100, "Display name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },

    // Contact Information
    email: [
      {
        type: String,
        validate: {
          validator: function (v) {
            return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
          },
          message: "Please enter a valid email address",
        },
      },
    ],
    phone: [
      {
        type: String,
        validate: {
          validator: function (v) {
            return /^[0-9+\-\s()]+$/.test(v);
          },
          message: "Please enter a valid phone number",
        },
      },
    ],
    website: {
      type: String,
      validate: {
        validator: function (v) {
          return /^https?:\/\/.+/.test(v);
        },
        message: "Please enter a valid website URL",
      },
    },

    // Registration Information
    registrationNumber: {
      type: String,
      required: [true, "Registration number is required"],
      unique: true,
      trim: true,
    },
    taxId: {
      type: String,
      trim: true,
    },

    // Address Information
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: {
        type: String,
        default: "Mongolia",
      },
      coordinates: {
        type: {
          type: String,
          enum: ["Point"],
          default: "Point",
        },
        coordinates: {
          type: [Number],
          default: [0, 0],
        },
      },
    },

    // Subdomain Configuration
    subdomain: {
      type: String,
      required: [true, "Subdomain is required"],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          return /^[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?$/.test(v);
        },
        message:
          "Subdomain must be valid (lowercase letters, numbers, and hyphens only)",
      },
    },
    customDomain: {
      type: String,
      validate: {
        validator: function (v) {
          return /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/.test(
            v
          );
        },
        message: "Please enter a valid domain name",
      },
    },

    // Business Configuration
    businessType: {
      type: String,
      enum: ["publisher", "distributor", "retailer", "library", "other"],
      default: "publisher",
    },
    industry: {
      type: String,
      enum: [
        "webtoon",
        "manga",
        "comics",
        "books",
        "media",
        "education",
        "other",
      ],
      default: "webtoon",
    },

    // Subscription and Billing
    subscription: {
      plan: {
        type: String,
        enum: ["free", "basic", "premium", "enterprise"],
        default: "free",
      },
      status: {
        type: String,
        enum: ["active", "inactive", "suspended", "cancelled"],
        default: "active",
      },
      startDate: {
        type: Date,
        default: Date.now,
      },
      endDate: Date,
      autoRenew: {
        type: Boolean,
        default: true,
      },
    },

    // Settings and Configuration
    settings: {
      // Storage Settings
      maxStorage: {
        type: Number,
        default: 1024, // MB
      },

      // Rental Settings
      rentalSettings: {
        maxRentalDays: {
          type: Number,
          default: 30,
        },
        lateFeePerDay: {
          type: Number,
          default: 0,
        },
        gracePeriodDays: {
          type: Number,
          default: 3,
        },
        autoReturn: {
          type: Boolean,
          default: false,
        },
      },

      // User Management
      userSettings: {
        allowSelfRegistration: {
          type: Boolean,
          default: true,
        },
        requireEmailVerification: {
          type: Boolean,
          default: true,
        },
        maxUsers: {
          type: Number,
          default: 50,
        },
      },

      // Notification Settings
      notifications: {
        emailNotifications: {
          type: Boolean,
          default: true,
        },
        smsNotifications: {
          type: Boolean,
          default: false,
        },
        pushNotifications: {
          type: Boolean,
          default: true,
        },
      },
    },

    // API Configuration
    apiKeys: [
      {
        name: String,
        key: String,
        permissions: [String],
        isActive: {
          type: Boolean,
          default: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        lastUsed: Date,
      },
    ],

    // Status and Metadata
    status: {
      type: String,
      enum: ["pending", "active", "inactive", "suspended", "deleted"],
      default: "pending",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: String,
    verificationExpires: Date,

    // Admin Information
    adminUsers: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
        role: {
          type: String,
          enum: ["owner", "admin", "moderator"],
          default: "admin",
        },
        permissions: [String],
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Statistics
    stats: {
      totalUsers: {
        type: Number,
        default: 0,
      },
      totalRentals: {
        type: Number,
        default: 0,
      },
      lastActivity: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better performance
organizationSchema.index({ status: 1 });
organizationSchema.index({ "subscription.plan": 1 });
organizationSchema.index({ "address.coordinates": "2dsphere" });

// Virtual for full domain URL
organizationSchema.virtual("domainUrl").get(function () {
  if (this.customDomain) {
    return `https://${this.customDomain}`;
  }
  return `https://${this.subdomain}.webix.com`;
});

// Pre-save middleware
organizationSchema.pre("save", function (next) {
  // Ensure subdomain is lowercase and clean
  if (this.subdomain) {
    this.subdomain = this.subdomain.toLowerCase().trim();
  }

  // Update last activity
  this.stats.lastActivity = new Date();

  next();
});

// Static method to find by subdomain
organizationSchema.statics.findBySubdomain = function (subdomain) {
  return this.findOne({
    subdomain: subdomain.toLowerCase(),
    status: { $in: ["active", "pending"] },
  });
};

// Static method to check subdomain availability
organizationSchema.statics.isSubdomainAvailable = function (subdomain) {
  return this.findOne({
    subdomain: subdomain.toLowerCase(),
    status: { $ne: "deleted" },
  }).then((org) => !org);
};

module.exports = organizationSchema;

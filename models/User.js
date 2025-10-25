const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Schema = mongoose.Schema;

mongoose.pluralize(null);

const userSchema = new Schema(
  {
    // Basic Information
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      maxlength: [50, "First name cannot exceed 50 characters"]
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      maxlength: [50, "Last name cannot exceed 50 characters"]
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function(v) {
          return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
        },
        message: "Please enter a valid email address"
      }
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
      select: false
    },
    phone: {
      type: String,
      validate: {
        validator: function(v) {
          return /^[0-9+\-\s()]+$/.test(v);
        },
        message: "Please enter a valid phone number"
      }
    },
    
    // Profile Information
    avatar: {
      type: String,
      default: null
    },
    bio: {
      type: String,
      maxlength: [500, "Bio cannot exceed 500 characters"]
    },
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer_not_to_say"],
      default: "prefer_not_to_say"
    },
    
    // Organization Association
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, "Organization is required"]
    },
    role: {
      type: String,
      enum: ["owner", "admin", "moderator", "user"],
      default: "user"
    },
    permissions: [{
      type: String,
      enum: ["read", "write", "delete", "manage_users", "manage_content", "manage_settings"]
    }],
    
    // Account Status
    status: {
      type: String,
      enum: ["active", "inactive", "suspended", "pending_verification"],
      default: "pending_verification"
    },
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    
    // Password Reset
    passwordResetToken: String,
    passwordResetExpires: Date,
    
    // Login Information
    lastLogin: Date,
    loginAttempts: {
      type: Number,
      default: 0
    },
    lockUntil: Date,
    
    // Preferences
    preferences: {
      language: {
        type: String,
        default: "mn",
        enum: ["mn", "en", "ko", "ja", "zh"]
      },
      theme: {
        type: String,
        default: "light",
        enum: ["light", "dark", "auto"]
      },
      notifications: {
        email: {
          type: Boolean,
          default: true
        },
        push: {
          type: Boolean,
          default: true
        },
        sms: {
          type: Boolean,
          default: false
        }
      }
    },
    
    // Rental History
    rentalHistory: [{
      webtoonId: {
        type: Schema.Types.ObjectId,
        ref: 'Webtoon'
      },
      rentedAt: {
        type: Date,
        default: Date.now
      },
      returnedAt: Date,
      dueDate: Date,
      status: {
        type: String,
        enum: ["active", "returned", "overdue", "cancelled"],
        default: "active"
      }
    }],
    
    // Statistics
    stats: {
      totalRentals: {
        type: Number,
        default: 0
      },
      activeRentals: {
        type: Number,
        default: 0
      },
      overdueRentals: {
        type: Number,
        default: 0
      }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ organization: 1 });
userSchema.index({ status: 1 });
userSchema.index({ role: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to increment login attempts
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// Instance method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Static method to find by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find by organization
userSchema.statics.findByOrganization = function(organizationId) {
  return this.find({ organization: organizationId });
};

module.exports = function(conn) {
  if (!conn || !conn.connection) {
    throw new Error("Database connection is required!");
  }
  return conn.model("User", userSchema);
};

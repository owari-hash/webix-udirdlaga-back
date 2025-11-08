const mongoose = require("mongoose");

const rentalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    webtoon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Webtoon",
      required: true,
    },
    chapters: [
      {
        chapterNumber: {
          type: Number,
          required: true,
        },
        rentedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    status: {
      type: String,
      enum: ["active", "expired", "returned", "cancelled"],
      default: "active",
    },
    rentalPeriod: {
      type: Number,
      required: true,
      default: 7, // days
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    actualReturnDate: {
      type: Date,
    },
    totalCost: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["credit_card", "paypal", "wallet", "free"],
      default: "free",
    },
    paymentId: {
      type: String,
      trim: true,
    },
    lateFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    isLate: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
rentalSchema.index({ user: 1 });
rentalSchema.index({ webtoon: 1 });
rentalSchema.index({ status: 1 });
rentalSchema.index({ startDate: -1 });
rentalSchema.index({ endDate: 1 });
rentalSchema.index({ paymentStatus: 1 });
rentalSchema.index({ user: 1, status: 1 });

// Virtual for days remaining
rentalSchema.virtual("daysRemaining").get(function () {
  if (this.status !== "active") return 0;
  const now = new Date();
  const diffTime = this.endDate - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for is overdue
rentalSchema.virtual("isOverdue").get(function () {
  if (this.status !== "active") return false;
  return new Date() > this.endDate;
});

// Pre-save middleware to calculate end date
rentalSchema.pre("save", function (next) {
  if (this.isNew && !this.endDate) {
    this.endDate = new Date(
      this.startDate.getTime() + this.rentalPeriod * 24 * 60 * 60 * 1000
    );
  }
  next();
});

// Static method to find active rentals for user
rentalSchema.statics.findActiveByUser = function (userId) {
  return this.find({ user: userId, status: "active" });
};

// Static method to find expired rentals
rentalSchema.statics.findExpired = function () {
  return this.find({
    status: "active",
    endDate: { $lt: new Date() },
  });
};

// Static method to find rentals by webtoon
rentalSchema.statics.findByWebtoon = function (webtoonId) {
  return this.find({ webtoon: webtoonId });
};

module.exports = rentalSchema;



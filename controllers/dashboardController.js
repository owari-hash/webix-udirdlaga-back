const mongoose = require("mongoose");
const organizationSchema = require("../models/Organization");
const userSchema = require("../models/User");

// Register models if not already registered
const getOrganizationModel = () => {
  try {
    return mongoose.model("Organization");
  } catch (error) {
    return mongoose.model("Organization", organizationSchema);
  }
};

const getUserModel = () => {
  try {
    return mongoose.model("User");
  } catch (error) {
    return mongoose.model("User", userSchema);
  }
};

// Helper function to calculate percentage change
const calculateChange = (current, previous) => {
  if (!previous || previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

// Helper function to get start of month
const getStartOfMonth = (date = new Date()) => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

// Helper function to get start of previous month
const getStartOfPreviousMonth = () => {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth() - 1, 1);
};

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/dashboard/stats
 * @access  Private (Admin only)
 */
const getDashboardStats = async (req, res) => {
  try {
    const Organization = getOrganizationModel();
    const User = getUserModel();

    const now = new Date();
    const startOfMonth = getStartOfMonth(now);
    const startOfPreviousMonth = getStartOfPreviousMonth();
    const endOfPreviousMonth = getStartOfMonth(now);

    // Total Organizations
    const totalOrganizations = await Organization.countDocuments({
      status: { $ne: "deleted" },
    });
    const previousMonthOrgs = await Organization.countDocuments({
      createdAt: { $lt: startOfMonth },
      status: { $ne: "deleted" },
    });
    const totalOrganizationsChange = calculateChange(
      totalOrganizations,
      previousMonthOrgs
    );

    // Active Users (logged in this month)
    const activeUsers = await User.countDocuments({
      lastLogin: { $gte: startOfMonth },
      status: "active",
    });
    const previousMonthUsers = await User.countDocuments({
      lastLogin: {
        $gte: startOfPreviousMonth,
        $lt: endOfPreviousMonth,
      },
      status: "active",
    });
    const activeUsersChange = calculateChange(
      activeUsers,
      previousMonthUsers
    );

    // Total Webtoons (if model exists, otherwise return 0)
    let totalWebtoons = 0;
    let totalWebtoonsChange = 0;
    try {
      // Try to get webtoon model if it exists
      const Webtoon = mongoose.models.Webtoon || null;
      if (Webtoon) {
        totalWebtoons = await Webtoon.countDocuments();
        const previousMonthWebtoons = await Webtoon.countDocuments({
          createdAt: { $lt: startOfMonth },
        });
        totalWebtoonsChange = calculateChange(
          totalWebtoons,
          previousMonthWebtoons
        );
      }
    } catch (error) {
      // Webtoon model doesn't exist, return 0
      console.log("Webtoon model not found, returning 0");
    }

    // Monthly Revenue (if Payment model exists)
    let monthlyRevenue = 0;
    let monthlyRevenueChange = 0;
    try {
      const Payment = mongoose.models.Payment || null;
      if (Payment) {
        const currentMonthRevenue = await Payment.aggregate([
          {
            $match: {
              status: "completed",
              paymentDate: { $gte: startOfMonth },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$amount" },
            },
          },
        ]);
        monthlyRevenue = currentMonthRevenue[0]?.total || 0;

        const previousMonthRevenue = await Payment.aggregate([
          {
            $match: {
              status: "completed",
              paymentDate: {
                $gte: startOfPreviousMonth,
                $lt: endOfPreviousMonth,
              },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$amount" },
            },
          },
        ]);
        const prevRevenue = previousMonthRevenue[0]?.total || 0;
        monthlyRevenueChange = calculateChange(monthlyRevenue, prevRevenue);
      }
    } catch (error) {
      console.log("Payment model not found, returning 0");
    }

    // Total Invoices (if Invoice model exists)
    let totalInvoices = 0;
    let totalInvoicesChange = 0;
    try {
      const Invoice = mongoose.models.Invoice || null;
      if (Invoice) {
        totalInvoices = await Invoice.countDocuments({
          createdAt: { $gte: startOfMonth },
        });
        const previousMonthInvoices = await Invoice.countDocuments({
          createdAt: {
            $gte: startOfPreviousMonth,
            $lt: endOfPreviousMonth,
          },
        });
        totalInvoicesChange = calculateChange(
          totalInvoices,
          previousMonthInvoices
        );
      }
    } catch (error) {
      console.log("Invoice model not found, returning 0");
    }

    // System Load (simplified - can be enhanced with actual monitoring)
    // For now, calculate based on request rate or return a static value
    const systemLoad = 78; // Placeholder - can be calculated from actual metrics
    const systemLoadChange = -3; // Placeholder

    res.json({
      success: true,
      data: {
        totalOrganizations,
        totalOrganizationsChange: Math.round(totalOrganizationsChange * 100) / 100,
        activeUsers,
        activeUsersChange: Math.round(activeUsersChange * 100) / 100,
        totalWebtoons,
        totalWebtoonsChange: Math.round(totalWebtoonsChange * 100) / 100,
        monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
        monthlyRevenueChange: Math.round(monthlyRevenueChange * 100) / 100,
        totalInvoices,
        totalInvoicesChange: Math.round(totalInvoicesChange * 100) / 100,
        systemLoad,
        systemLoadChange,
      },
    });
  } catch (error) {
    console.error("Get dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching dashboard statistics",
      messageEn: "Server error while fetching dashboard statistics",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Get recent activities
 * @route   GET /api/dashboard/activities
 * @access  Private (Admin only)
 */
const getRecentActivities = async (req, res) => {
  try {
    const Organization = getOrganizationModel();
    const User = getUserModel();
    const limit = parseInt(req.query.limit) || 10;

    const activities = [];

    // Get recent organizations
    const recentOrgs = await Organization.find({
      status: { $ne: "deleted" },
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name createdAt")
      .lean();

    recentOrgs.forEach((org) => {
      activities.push({
        id: `org_${org._id}`,
        type: "organization_created",
        message: `Шинэ байгууллага "${org.name}" бүртгэгдлээ`,
        timestamp: org.createdAt,
        icon: "solar:buildings-2-bold",
        color: "primary",
      });
    });

    // Get recent users
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("email firstName lastName createdAt")
      .lean();

    // Group users by day for aggregation
    const usersByDay = {};
    recentUsers.forEach((user) => {
      const day = new Date(user.createdAt).toDateString();
      if (!usersByDay[day]) {
        usersByDay[day] = [];
      }
      usersByDay[day].push(user);
    });

    // Create activity for each day with multiple users
    Object.keys(usersByDay).forEach((day) => {
      const users = usersByDay[day];
      if (users.length > 1) {
        activities.push({
          id: `users_${day}`,
          type: "user_registered",
          message: `${users.length} шинэ хэрэглэгч бүртгэгдлээ`,
          timestamp: users[0].createdAt,
          icon: "solar:user-plus-bold",
          color: "success",
        });
      } else {
        activities.push({
          id: `user_${users[0]._id}`,
          type: "user_registered",
          message: `Шинэ хэрэглэгч "${users[0].firstName} ${users[0].lastName}" бүртгэгдлээ`,
          timestamp: users[0].createdAt,
          icon: "solar:user-plus-bold",
          color: "success",
        });
      }
    });

    // Get recent webtoons if model exists
    try {
      const Webtoon = mongoose.models.Webtoon || null;
      if (Webtoon) {
        const recentWebtoons = await Webtoon.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .select("title createdAt")
          .lean();

        const webtoonsByDay = {};
        recentWebtoons.forEach((webtoon) => {
          const day = new Date(webtoon.createdAt).toDateString();
          if (!webtoonsByDay[day]) {
            webtoonsByDay[day] = [];
          }
          webtoonsByDay[day].push(webtoon);
        });

        Object.keys(webtoonsByDay).forEach((day) => {
          const webtoons = webtoonsByDay[day];
          activities.push({
            id: `webtoons_${day}`,
            type: "webtoon_uploaded",
            message: `${webtoons.length} шинэ вэбтоон орууллаа`,
            timestamp: webtoons[0].createdAt,
            icon: "solar:book-2-bold",
            color: "info",
          });
        });
      }
    } catch (error) {
      console.log("Webtoon model not found, skipping webtoon activities");
    }

    // Get recent invoices if model exists
    try {
      const Invoice = mongoose.models.Invoice || null;
      if (Invoice) {
        const recentInvoices = await Invoice.find()
          .sort({ createdAt: -1 })
          .limit(3)
          .select("invoiceNumber amount createdAt")
          .lean();

        recentInvoices.forEach((invoice) => {
          activities.push({
            id: `invoice_${invoice._id}`,
            type: "invoice_created",
            message: `Шинэ нэхэмжлэх #${invoice.invoiceNumber || invoice._id} үүслээ`,
            timestamp: invoice.createdAt,
            icon: "solar:document-text-bold",
            color: "warning",
          });
        });
      }
    } catch (error) {
      console.log("Invoice model not found, skipping invoice activities");
    }

    // Sort by timestamp and limit
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const limitedActivities = activities.slice(0, limit);

    res.json({
      success: true,
      data: limitedActivities,
    });
  } catch (error) {
    console.error("Get recent activities error:", error);
    res.status(500).json({
      success: false,
      message: "Серверийн алдаа гарлаа",
      messageEn: "Server error while fetching recent activities",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Get top organizations
 * @route   GET /api/dashboard/top-organizations
 * @access  Private (Admin only)
 */
const getTopOrganizations = async (req, res) => {
  try {
    const Organization = getOrganizationModel();
    const User = getUserModel();
    const limit = parseInt(req.query.limit) || 5;

    // Get organizations with user counts
    // Note: Collection name matches model name exactly due to mongoose.pluralize(null)
    const UserCollection = User.collection.name || "User";
    const topOrgs = await Organization.aggregate([
      {
        $match: {
          status: { $ne: "deleted" },
        },
      },
      {
        $lookup: {
          from: UserCollection,
          localField: "_id",
          foreignField: "organization",
          as: "users",
        },
      },
      {
        $project: {
          name: 1,
          displayName: 1,
          status: 1,
          userCount: {
            $size: {
              $filter: {
                input: "$users",
                as: "user",
                cond: { $eq: ["$$user.status", "active"] },
              },
            },
          },
          createdAt: 1,
        },
      },
      {
        $sort: { userCount: -1, createdAt: -1 },
      },
      {
        $limit: limit,
      },
    ]);

    // Get webtoon counts for each organization if model exists
    const formatted = await Promise.all(
      topOrgs.map(async (org) => {
        let webtoonCount = 0;
        try {
          const Webtoon = mongoose.models.Webtoon || null;
          if (Webtoon) {
            webtoonCount = await Webtoon.countDocuments({
              organization: org._id,
            });
          }
        } catch (error) {
          // Webtoon model doesn't exist
        }

        return {
          id: org._id.toString(),
          name: org.displayName || org.name,
          users: org.userCount || 0,
          webtoons: webtoonCount,
          status: org.status,
        };
      })
    );

    res.json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error("Get top organizations error:", error);
    res.status(500).json({
      success: false,
      message: "Серверийн алдаа гарлаа",
      messageEn: "Server error while fetching top organizations",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Get system status
 * @route   GET /api/dashboard/system-status
 * @access  Private (Admin only)
 */
const getSystemStatus = async (req, res) => {
  try {
    // Check database connection
    const checkDatabase = async () => {
      try {
        await mongoose.connection.db.admin().ping();
        return { status: "online", uptime: "99.8%" };
      } catch (error) {
        return { status: "offline", uptime: "0%" };
      }
    };

    // Check email service (placeholder - implement actual check if you have email service)
    const checkEmailService = async () => {
      try {
        // If you have an email service, test it here
        // For now, return online status
        return { status: "online", uptime: "99.5%" };
      } catch (error) {
        return { status: "offline", uptime: "0%" };
      }
    };

    const [databaseStatus, emailStatus] = await Promise.all([
      checkDatabase(),
      checkEmailService(),
    ]);

    const systemStatus = [
      {
        name: "Сервер",
        status: "online", // Server is running if we can respond
        uptime: "99.9%",
      },
      {
        name: "База өгөгдөл",
        ...databaseStatus,
      },
      {
        name: "CDN",
        status: "online", // Placeholder - implement actual CDN check if available
        uptime: "99.7%",
      },
      {
        name: "Email сервис",
        ...emailStatus,
      },
    ];

    res.json({
      success: true,
      data: systemStatus,
    });
  } catch (error) {
    console.error("Get system status error:", error);
    res.status(500).json({
      success: false,
      message: "Серверийн алдаа гарлаа",
      messageEn: "Server error while fetching system status",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  getDashboardStats,
  getRecentActivities,
  getTopOrganizations,
  getSystemStatus,
};


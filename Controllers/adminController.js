const UserModel = require("../Models/userModel");
const ErrorHandler = require("../special/errorHandelar");
const sendToken = require("../special/jwtToken");

// Admin Login (uses same User model, but checks for admin role)
exports.adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new ErrorHandler("Please provide email and password", 400));
    }

    // Find user with admin role
    const user = await UserModel.findOne({ 
      email,
      role: "admin"
    }).select("+password");

    if (!user) {
      return next(new ErrorHandler("Invalid email or password", 401));
    }

    // Check if user is blocked
    if (user.isBlocked) {
      return next(new ErrorHandler("Your account has been blocked", 403));
    }

    const isPasswordMatched = await user.ComparePassword(password);

    if (!isPasswordMatched) {
      return next(new ErrorHandler("Invalid email or password", 401));
    }

    sendToken(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// Get Admin Profile
exports.getAdminProfile = async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.userid);

    if (!user) {
      return next(new ErrorHandler("Admin not found", 404));
    }

    // Verify user is admin
    if (user.role !== "admin") {
      return next(new ErrorHandler("Access denied. Admin role required.", 403));
    }

    res.status(200).json({
      success: true,
      admin: user,
    });
  } catch (error) {
    next(error);
  }
};

// Create Admin (Admin only)
exports.createAdmin = async (req, res, next) => {
  try {
    // Check if current user is admin
    if (req.userRole !== "admin") {
      return next(
        new ErrorHandler("Only admin can create new admins", 403)
      );
    }

    const { fullname, email, phone, password } = req.body;

    if (!fullname || !email || !phone || !password) {
      return next(
        new ErrorHandler("Please provide all required fields (fullname, email, phone, password)", 400)
      );
    }

    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return next(new ErrorHandler("User already exists with this email", 400));
    }

    // Create user with admin role
    const admin = await UserModel.create({
      fullname,
      email,
      phone,
      password,
      role: "admin", // Always set to admin
    });

    res.status(201).json({
      success: true,
      message: "Admin created successfully",
      admin: {
        _id: admin._id,
        fullname: admin.fullname,
        email: admin.email,
        phone: admin.phone,
        role: admin.role,
        createdAt: admin.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get All Admins (Admin only)
exports.getAllAdmins = async (req, res, next) => {
  try {
    if (req.userRole !== "admin") {
      return next(
        new ErrorHandler("Only admin can view all admins", 403)
      );
    }

    // Get all users with admin role
    const admins = await UserModel.find({
      role: "admin"
    }).select("-password");

    res.status(200).json({
      success: true,
      count: admins.length,
      admins,
    });
  } catch (error) {
    next(error);
  }
};

// Update Admin (Admin only)
exports.updateAdmin = async (req, res, next) => {
  try {
    if (req.userRole !== "admin") {
      return next(new ErrorHandler("Only admin can update admins", 403));
    }

    // Only allow updating users with admin role
    const admin = await UserModel.findOne({
      _id: req.params.id,
      role: "admin"
    });

    if (!admin) {
      return next(new ErrorHandler("Admin not found", 404));
    }

    // Update allowed fields
    const updateData = {};
    if (req.body.fullname) updateData.fullname = req.body.fullname;
    if (req.body.phone) updateData.phone = req.body.phone;
    if (req.body.isBlocked !== undefined) updateData.isBlocked = req.body.isBlocked;

    const updatedAdmin = await UserModel.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    ).select("-password");

    res.status(200).json({
      success: true,
      message: "Admin updated successfully",
      admin: updatedAdmin,
    });
  } catch (error) {
    next(error);
  }
};

// Delete Admin (Admin only)
exports.deleteAdmin = async (req, res, next) => {
  try {
    if (req.userRole !== "admin") {
      return next(new ErrorHandler("Only admin can delete admins", 403));
    }

    const admin = await UserModel.findOne({
      _id: req.params.id,
      role: "admin"
    });

    if (!admin) {
      return next(new ErrorHandler("Admin not found", 404));
    }

    // Don't allow deleting yourself
    if (admin._id.toString() === req.userid.toString()) {
      return next(new ErrorHandler("You cannot delete your own account", 400));
    }

    // Instead of deleting, change role back to user or block the account
    // Option 1: Change role to user
    admin.role = "user";
    await admin.save();

    // Option 2: Or block the account
    // admin.isBlocked = true;
    // await admin.save();

    res.status(200).json({
      success: true,
      message: "Admin removed successfully (role changed to user)",
    });
  } catch (error) {
    next(error);
  }
};

// Get Dashboard Stats (Admin only)
exports.getDashboardStats = async (req, res, next) => {
  try {
    const OrderModel = require("../Models/orderModel");
    const UserModel = require("../Models/userModel");

    const [
      totalOrders,
      pendingOrders,
      completedOrders,
      totalUsers,
      totalRevenue,
    ] = await Promise.all([
      OrderModel.countDocuments(),
      OrderModel.countDocuments({ status: "pending" }),
      OrderModel.countDocuments({ status: "completed" }),
      UserModel.countDocuments(),
      OrderModel.aggregate([
        {
          $match: { paymentStatus: "paid" },
        },
        {
          $project: {
            totalOrderPrice: {
              $multiply: ["$planPrice", "$numberOfAds"]
            }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$totalOrderPrice" },
          },
        },
      ]),
    ]);

    const revenue = totalRevenue[0]?.total || 0;

    res.status(200).json({
      success: true,
      stats: {
        totalOrders,
        pendingOrders,
        completedOrders,
        totalUsers,
        totalRevenue: revenue,
      },
    });
  } catch (error) {
    next(error);
  }
};


const UserModel = require("../Models/userModel");
const ErrorHandler = require("../special/errorHandelar");
const sendToken = require("../special/jwtToken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

// Register User
exports.registerUser = async (req, res, next) => {
  try {
    const { fullname, email, phone, password } = req.body;

    // Validation
    if (!fullname || !email || !phone || !password) {
      return next(new ErrorHandler("Please provide all required fields", 400));
    }

    // Check if user already exists
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return next(new ErrorHandler("User already exists with this email", 400));
    }

    // Create user
    const user = await UserModel.create({
      fullname,
      email,
      phone,
      password,
    });

    sendToken(user, 201, res);
  } catch (error) {
    next(error);
  }
};

// Login User
exports.loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return next(new ErrorHandler("Please provide email and password", 400));
    }

    // Find user and include password
    const user = await UserModel.findOne({ email }).select("+password");

    if (!user) {
      return next(new ErrorHandler("Invalid email or password", 401));
    }

    // Check if user is blocked
    if (user.isBlocked) {
      return next(new ErrorHandler("Your account has been blocked", 403));
    }

    // Check password
    const isPasswordMatched = await user.ComparePassword(password);

    if (!isPasswordMatched) {
      return next(new ErrorHandler("Invalid email or password", 401));
    }

    sendToken(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// Logout User
exports.logoutUser = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Get User Profile
exports.getUserProfile = async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.userid);

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// Update User Profile
exports.updateProfile = async (req, res, next) => {
  try {
    const updateData = {
      fullname: req.body.fullname,
      phone: req.body.phone,
    };

    // Handle profile image if uploaded
    if (req.files && req.files.profileimage) {
      // You can add Cloudinary upload logic here
      // For now, just storing the file info
      updateData.profileimage = {
        public_id: "temp",
        url: "temp_url",
      };
    }

    const user = await UserModel.findByIdAndUpdate(req.userid, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// Get All Users (Admin)
exports.GetUserAll = async (req, res, next) => {
  try {
    const users = await UserModel.find().select("-password");

    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    next(error);
  }
};

// Get User By ID (Admin)
exports.GetUserById = async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.params.id).select("-password");

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// Update User By Admin
exports.UpdateUserByAdmin = async (req, res, next) => {
  try {
    const user = await UserModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// Delete User By Admin
exports.DeleteUserByAdmin = async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.params.id);

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    await UserModel.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Forgot Password
exports.ResetPasswordForgot = async (req, res, next) => {
  try {
    const user = await UserModel.findOne({ email: req.body.email });

    if (!user) {
      return next(new ErrorHandler("User not found with this email", 404));
    }

    // Get reset token
    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    // Create reset password URL
    const resetPasswordUrl = `${req.protocol}://${req.get(
      "host"
    )}/api/password/reset/${resetToken}`;

    // Email message (you can enhance this with nodemailer)
    const message = `Your password reset token is: ${resetToken}\n\nIf you didn't request this, please ignore.`;

    try {
      // Send email (implement nodemailer here)
      // await sendEmail({
      //   email: user.email,
      //   subject: "Password Reset Token",
      //   message,
      // });

      res.status(200).json({
        success: true,
        message: `Email sent to ${user.email} successfully`,
        resetToken, // Remove this in production, only for testing
      });
    } catch (error) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      return next(new ErrorHandler(error.message, 500));
    }
  } catch (error) {
    next(error);
  }
};

// Reset Password
exports.ResetPassword = async (req, res, next) => {
  try {
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await UserModel.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return next(
        new ErrorHandler("Password reset token is invalid or expired", 400)
      );
    }

    if (req.body.password !== req.body.confirmPassword) {
      return next(new ErrorHandler("Passwords do not match", 400));
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    sendToken(user, 200, res);
  } catch (error) {
    next(error);
  }
};


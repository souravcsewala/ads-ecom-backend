const ErrorHandler = require("../special/errorHandelar");
const jwt = require("jsonwebtoken");
const User = require("../Models/userModel");

const isAuthCheck = async (req, res, next) => {
  try {
    // Check for token in header or cookie
    const token = req.header("x-auth-token") || req.cookies.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No auth token, access denied.",
      });
    }

    // Verify token
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    if (!decodedToken) {
      return res.status(401).json({
        success: false,
        message: "Token verification failed, authorization denied.",
      });
    }

    // Find user (can be regular user or admin)
    const user = await User.findById(decodedToken._id);

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    // Check if blocked
    if (user.isBlocked) {
      return next(new ErrorHandler("Your account has been blocked", 403));
    }

    // Set request properties
    req.user = user;
    req.userid = user._id;
    req.userName = user.fullname;
    req.userRole = user.role;
    req.isAdmin = user.role === "admin";

    console.log(`Authenticated as ${req.isAdmin ? "admin" : "user"} (${user.role}), req.userid:`, user._id);
    next();
  } catch (error) {
    console.error("Error in isAuthCheck middleware:", error);
    next(error);
  }
};

module.exports = { isAuthCheck };

const ErrorHandelar = require("../special/errorHandelar");

const isRoleCheak = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      const userRole = req.userRole || req.user?.role;
      const userName = req.userName || req.user?.name || req.user?.fullname || "User";

      if (!userRole) {
        return next(
          new ErrorHandelar(
            "User role not found. Please login again.",
            401
          )
        );
      }

      if (!allowedRoles.includes(userRole)) {
        return next(
          new ErrorHandelar(
            `Hi ${userName}, you are not allowed to access this resource. Required role: ${allowedRoles.join(" or ")}`,
            403 
          )
        );
      }

      next();
    } catch (error) {
      console.error("Error in isRoleCheak middleware:", error);
      next(error);
    }
  };
};

module.exports = { isRoleCheak };

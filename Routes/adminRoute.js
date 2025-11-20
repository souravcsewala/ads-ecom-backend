const express = require("express");
const {
  adminLogin,
  getAdminProfile,
  createAdmin,
  getAllAdmins,
  updateAdmin,
  deleteAdmin,
  getDashboardStats,
} = require("../Controllers/adminController");
const { isAuthCheck } = require("../Middliware/IsAuthCheck");
const { isRoleCheak } = require("../Middliware/IsRoleCheak");

const Router = express.Router();

// Public route
Router.route("/login").post(adminLogin);

// Protected routes
Router.route("/profile").get(isAuthCheck, isRoleCheak("admin"), getAdminProfile);
Router.route("/dashboard/stats").get(
  isAuthCheck,
  isRoleCheak("admin"),
  getDashboardStats
);

// Admin only routes
Router.route("/create").post(
  isAuthCheck,
  isRoleCheak("admin"),
  createAdmin
);
Router.route("/all").get(
  isAuthCheck,
  isRoleCheak("admin"),
  getAllAdmins
);
Router.route("/:id").put(
  isAuthCheck,
  isRoleCheak("admin"),
  updateAdmin
);
Router.route("/:id").delete(
  isAuthCheck,
  isRoleCheak("admin"),
  deleteAdmin
);

module.exports = Router;


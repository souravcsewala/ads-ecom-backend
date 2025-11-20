const express = require("express");
const {
  getAllDemoContent,
  getDemoContentById,
  createDemoContent,
  updateDemoContent,
  deleteDemoContent,
} = require("../Controllers/demoContentController");
const { isAuthCheck } = require("../Middliware/IsAuthCheck");
const { isRoleCheak } = require("../Middliware/IsRoleCheak");

const Router = express.Router();

// Public routes (for frontend)
Router.route("/").get(getAllDemoContent);
Router.route("/:id").get(getDemoContentById);

// Admin routes (require admin authentication)
Router.route("/admin/create").post(
  isAuthCheck,
  isRoleCheak("admin"),
  createDemoContent
);
Router.route("/admin/:id").put(
  isAuthCheck,
  isRoleCheak("admin"),
  updateDemoContent
);
Router.route("/admin/:id").delete(
  isAuthCheck,
  isRoleCheak("admin"),
  deleteDemoContent
);

module.exports = Router;


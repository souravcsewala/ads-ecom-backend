const express = require("express");
const {
  getAllPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
} = require("../Controllers/planController");
const { isAuthCheck } = require("../Middliware/IsAuthCheck");
const { isRoleCheak } = require("../Middliware/IsRoleCheak");

const Router = express.Router();

// Public routes (for frontend)
Router.route("/").get(getAllPlans);
Router.route("/:id").get(getPlanById);

// Admin routes (require admin authentication)
Router.route("/admin/create").post(
  isAuthCheck,
  isRoleCheak("admin"),
  createPlan
);
Router.route("/admin/:id").put(
  isAuthCheck,
  isRoleCheak("admin"),
  updatePlan
);
Router.route("/admin/:id").delete(
  isAuthCheck,
  isRoleCheak("admin"),
  deletePlan
);

module.exports = Router;


const express = require("express");
const {
  getAllPortfolio,
  getPortfolioById,
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
} = require("../Controllers/portfolioController");
const { isAuthCheck } = require("../Middliware/IsAuthCheck");
const { isRoleCheak } = require("../Middliware/IsRoleCheak");

const Router = express.Router();

// Public routes
Router.route("/").get(getAllPortfolio);
Router.route("/:id").get(getPortfolioById);

// Admin routes (require admin role)
Router.route("/admin/create").post(
  isAuthCheck,
  isRoleCheak("admin"),
  createPortfolio
);
Router.route("/admin/:id").put(
  isAuthCheck,
  isRoleCheak("admin"),
  updatePortfolio
);
Router.route("/admin/:id").delete(
  isAuthCheck,
  isRoleCheak("admin"),
  deletePortfolio
);

module.exports = Router;


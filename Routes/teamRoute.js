const express = require("express");
const {
  getAllTeamMembers,
  getTeamMemberById,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
} = require("../Controllers/teamController");
const { isAuthCheck } = require("../Middliware/IsAuthCheck");
const { isRoleCheak } = require("../Middliware/IsRoleCheak");

const Router = express.Router();

// Public routes (for frontend)
Router.route("/").get(getAllTeamMembers);
Router.route("/:id").get(getTeamMemberById);

// Admin routes (require admin authentication)
Router.route("/admin/create").post(
  isAuthCheck,
  isRoleCheak("admin"),
  createTeamMember
);
Router.route("/admin/:id").put(
  isAuthCheck,
  isRoleCheak("admin"),
  updateTeamMember
);
Router.route("/admin/:id").delete(
  isAuthCheck,
  isRoleCheak("admin"),
  deleteTeamMember
);

module.exports = Router;


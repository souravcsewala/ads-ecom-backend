const express = require("express");
const Router = express.Router();
const {
  createMeetingRequest,
  getAllMeetingRequests,
  getMeetingRequest,
  updateMeetingRequestStatus,
  deleteMeetingRequest,
} = require("../Controllers/meetingRequestController");
const { isAuthCheck } = require("../Middliware/IsAuthCheck");
const { isRoleCheak } = require("../Middliware/IsRoleCheak");

// Public route - anyone can create a meeting request
Router.route("/create").post(createMeetingRequest);

// Admin routes - require authentication and admin role
Router.route("/admin/all").get(isAuthCheck, isRoleCheak("admin"), getAllMeetingRequests);
Router.route("/admin/:id").get(isAuthCheck, isRoleCheak("admin"), getMeetingRequest);
Router.route("/admin/:id/status").put(isAuthCheck, isRoleCheak("admin"), updateMeetingRequestStatus);
Router.route("/admin/:id").delete(isAuthCheck, isRoleCheak("admin"), deleteMeetingRequest);

module.exports = Router;


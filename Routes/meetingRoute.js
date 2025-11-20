const express = require("express");
const {
  getAllMeetings,
  getMeetingById,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  updateMeetingStatus,
  addMeetingNotes,
  getUpcomingMeetings,
  getPastMeetings,
} = require("../Controllers/meetingController");
const { isAuthCheck } = require("../Middliware/IsAuthCheck");
const { isRoleCheak } = require("../Middliware/IsRoleCheak");

const Router = express.Router();

// All routes require admin authentication
Router.route("/").get(
  isAuthCheck,
  isRoleCheak("admin"),
  getAllMeetings
);

Router.route("/upcoming").get(
  isAuthCheck,
  isRoleCheak("admin"),
  getUpcomingMeetings
);

Router.route("/past").get(
  isAuthCheck,
  isRoleCheak("admin"),
  getPastMeetings
);

Router.route("/:id").get(
  isAuthCheck,
  isRoleCheak("admin"),
  getMeetingById
);

Router.route("/create").post(
  isAuthCheck,
  isRoleCheak("admin"),
  createMeeting
);

Router.route("/:id").put(
  isAuthCheck,
  isRoleCheak("admin"),
  updateMeeting
);

Router.route("/:id/status").put(
  isAuthCheck,
  isRoleCheak("admin"),
  updateMeetingStatus
);

Router.route("/:id/notes").post(
  isAuthCheck,
  isRoleCheak("admin"),
  addMeetingNotes
);

Router.route("/:id").delete(
  isAuthCheck,
  isRoleCheak("admin"),
  deleteMeeting
);

module.exports = Router;


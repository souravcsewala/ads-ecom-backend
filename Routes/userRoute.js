const express = require("express");
const {
  GetUserAll,
  UpdateUserByAdmin,
  DeleteUserByAdmin,
  GetUserById,
} = require("../Controllers/userController");
const { isAuthCheck } = require("../Middliware/IsAuthCheck");
const { isRoleCheak } = require("../Middliware/IsRoleCheak");

const Router = express.Router();

// All routes require admin authentication
Router.route("/get-all-user").get(
  isAuthCheck,
  isRoleCheak("admin"),
  GetUserAll
);

Router.route("/get-user/:id").get(
  isAuthCheck,
  isRoleCheak("admin"),
  GetUserById
);

Router.route("/update-user/:id").put(
  isAuthCheck,
  isRoleCheak("admin"),
  UpdateUserByAdmin
);

Router.route("/delete-user/:id").delete(
  isAuthCheck,
  isRoleCheak("admin"),
  DeleteUserByAdmin
);

module.exports = Router;








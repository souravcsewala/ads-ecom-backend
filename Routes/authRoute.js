const express = require("express");
const {
  registerUser,
  loginUser,
  logoutUser,
  getUserProfile,
  updateProfile,
  ResetPasswordForgot,
  ResetPassword,
} = require("../Controllers/userController");
const { isAuthCheck } = require("../Middliware/IsAuthCheck");

const Router = express.Router();

// Public routes
Router.route("/register").post(registerUser);
Router.route("/login").post(loginUser);
Router.route("/logout").get(logoutUser);
Router.route("/forgot-password").post(ResetPasswordForgot);
Router.route("/reset-password/:token").post(ResetPassword);

// Protected routes (require authentication)
Router.route("/me").get(isAuthCheck, getUserProfile);
Router.route("/update-profile").put(isAuthCheck, updateProfile);

module.exports = Router;


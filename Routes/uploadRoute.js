const express = require("express");
const {
  uploadFile,
  uploadMultipleFiles,
  uploadDemoContent,
  uploadBrandAssets,
  getPresignedUploadUrl,
} = require("../Controllers/uploadController");
const { isAuthCheck } = require("../Middliware/IsAuthCheck");
const { isRoleCheak } = require("../Middliware/IsRoleCheak");

const Router = express.Router();

// Generate pre-signed upload URL
Router.route("/presigned-url").post(isAuthCheck, getPresignedUploadUrl);

// User file upload (requires authentication)
Router.route("/file").post(isAuthCheck, uploadFile);
Router.route("/files").post(isAuthCheck, uploadMultipleFiles);
Router.route("/brand-assets").post(isAuthCheck, uploadBrandAssets);

// Admin demo content upload (requires admin role)
Router.route("/demo-content").post(
  isAuthCheck,
  isRoleCheak("admin"),
  uploadDemoContent
);

module.exports = Router;


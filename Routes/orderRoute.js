const express = require("express");
const {
  createOrder,
  getMyOrders,
  getOrderById,
  getOrderByIdAdmin,
  updateOrderStatus,
  updatePaymentStatus,
  getAllOrders,
  deleteOrder,
} = require("../Controllers/orderController");
const { isAuthCheck } = require("../Middliware/IsAuthCheck");
const { isRoleCheak } = require("../Middliware/IsRoleCheak");

const Router = express.Router();

// User routes - create order (authentication optional for guest orders)
Router.route("/create").post(createOrder);
Router.route("/my-orders").get(isAuthCheck, getMyOrders);
Router.route("/:id").get(isAuthCheck, getOrderById);

// Admin routes (require admin role)
Router.route("/admin/all").get(
  isAuthCheck,
  isRoleCheak("admin"),
  getAllOrders
);
Router.route("/admin/:id").get(
  isAuthCheck,
  isRoleCheak("admin"),
  getOrderByIdAdmin
);
Router.route("/admin/:id/status").put(
  isAuthCheck,
  isRoleCheak("admin"),
  updateOrderStatus
);
Router.route("/admin/:id/payment-status").put(
  isAuthCheck,
  isRoleCheak("admin"),
  updatePaymentStatus
);
Router.route("/admin/:id").delete(
  isAuthCheck,
  isRoleCheak("admin"),
  deleteOrder
);

module.exports = Router;


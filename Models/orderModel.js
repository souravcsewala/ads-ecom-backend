const mongoose = require("mongoose");

const OrderItemSchema = new mongoose.Schema({
  adNumber: {
    type: Number,
    required: true,
  },
  referenceImageUrl: {
    type: String,
    required: [true, "Reference image/video URL is required"],
  },
  productPageUrl: {
    type: String,
    required: [true, "Product page URL is required"],
  },
  specificInstructions: {
    type: String,
    required: [true, "Specific instructions are required"],
  },
  status: {
    type: String,
    enum: ["not_started", "in_progress", "completed", "delivered"],
    default: "not_started",
  },
  deliveryFile: {
    public_id: String,
    url: String,
  },
  deliveryDate: Date,
});

const OrderSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    default: null, // Optional - allows guest orders
  },
  planType: {
    type: String,
    required: [true, "Plan type is required"],
    enum: ["standard", "custom"],
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Plan",
    default: null, // null for custom plans
  },
  planName: {
    type: String,
    required: [true, "Plan name is required"],
  },
  planPrice: {
    type: Number,
    required: [true, "Plan price is required"],
  },
  adType: {
    type: String,
    required: [true, "Ad type is required"],
    enum: ["image", "video"],
  },
  numberOfAds: {
    type: Number,
    required: [true, "Number of ads is required"],
  },
  // For image ads
  imageDimensions: {
    type: String,
    default: "",
  },
  // Brand assets
  brandAssetsLink: {
    type: String,
    required: [true, "Brand assets link is required"],
  },
  generalInstructions: {
    type: String,
    default: "",
  },
  // Individual ads
  ads: [OrderItemSchema],
  // Customer contact info (stored here for quick access)
  customerName: {
    type: String,
    required: true,
  },
  customerEmail: {
    type: String,
    required: true,
  },
  customerContact: {
    type: String,
    required: true,
  },
  customerCompany: {
    type: String,
    default: "",
  },
  additionalNotes: {
    type: String,
    default: "",
  },
  // Meeting information
  meetingInterest: {
    type: String,
    enum: ["yes", "no"],
    default: "no",
  },
  meetingDate: {
    type: String,
    default: "",
  },
  meetingTime: {
    type: String,
    default: "",
  },
  // Order status
  status: {
    type: String,
    enum: ["pending", "in_progress", "completed", "cancelled"],
    default: "pending",
  },
  // Payment
  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "failed", "refunded"],
    default: "pending",
  },
  paymentId: {
    type: String,
    default: "",
  },
  // Dates
  orderDate: {
    type: Date,
    default: Date.now,
  },
  deliveryDeadline: {
    type: Date,
  },
  completedDate: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

OrderSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const OrderModel = mongoose.model("Order", OrderSchema);
module.exports = OrderModel;


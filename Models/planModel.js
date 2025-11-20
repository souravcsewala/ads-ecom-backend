const mongoose = require("mongoose");

const PlanSchema = new mongoose.Schema({
  planType: {
    type: String,
    required: [true, "Plan type is required"],
    enum: ["image", "video"],
  },
  planName: {
    type: String,
    required: [true, "Plan name is required"],
  },
  price: {
    type: Number,
    required: [true, "Price is required"],
  },
  pricePer: {
    type: String, // e.g., "per image ad", "per video ad"
    default: "",
  },
  total: {
    type: String, // e.g., "Total: ₹5,000"
    default: "",
  },
  description: {
    type: String,
    default: "",
  },
  tag: {
    type: String, // e.g., "New Here? Start Here", "Most Popular"
    default: "",
  },
  tagColor: {
    type: String, // e.g., "bg-green-500", "bg-purple-600"
    default: "",
  },
  features: [
    {
      type: String,
    },
  ],
  cta: {
    type: String, // Call to action text
    required: [true, "CTA is required"],
  },
  isPopular: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  displayOrder: {
    type: Number,
    default: 0, // For ordering plans
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

PlanSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const PlanModel = mongoose.model("Plan", PlanSchema);
module.exports = PlanModel;


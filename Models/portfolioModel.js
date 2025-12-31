const mongoose = require("mongoose");

const PortfolioSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Title is required"],
  },
  imageUrl: {
    type: String,
    default: "",
  },
  imageKey: {
    type: String,
    default: "",
  },
  linkUrl: {
    type: String,
    default: "",
  },
  category: {
    type: String,
    default: "",
  },
  displayOrder: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
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

PortfolioSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const PortfolioModel = mongoose.model("Portfolio", PortfolioSchema);
module.exports = PortfolioModel;


const mongoose = require("mongoose");

const DemoContentSchema = new mongoose.Schema({
  contentType: {
    type: String,
    required: [true, "Content type is required"],
    enum: ["image", "video"],
  },
  title: {
    type: String,
    required: [true, "Title is required"],
  },
  description: {
    type: String,
    default: "",
  },
  imageUrl: {
    type: String,
    default: "",
  },
  imageKey: {
    type: String,
    default: "",
  },
  videoUrl: {
    type: String,
    default: "",
  },
  videoKey: {
    type: String,
    default: "",
  },
  thumbnailUrl: {
    type: String,
    default: "",
  },
  thumbnailKey: {
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

DemoContentSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const DemoContentModel = mongoose.model("DemoContent", DemoContentSchema);
module.exports = DemoContentModel;


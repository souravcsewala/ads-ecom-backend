const mongoose = require("mongoose");

const TeamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Team member name is required"],
  },
  role: {
    type: String,
    required: [true, "Role is required"],
  },
  bio: {
    type: String,
    default: "",
  },
  image: {
    public_id: String,
    url: String,
  },
  socialLinks: {
    linkedin: { type: String, default: "" },
    twitter: { type: String, default: "" },
    github: { type: String, default: "" },
    portfolio: { type: String, default: "" },
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

TeamSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const TeamModel = mongoose.model("Team", TeamSchema);
module.exports = TeamModel;


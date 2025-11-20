const mongoose = require("mongoose");

const MeetingRequestSchema = new mongoose.Schema({
  // Customer contact info
  customerName: {
    type: String,
    required: [true, "Customer name is required"],
  },
  customerEmail: {
    type: String,
    required: [true, "Customer email is required"],
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: "Please provide a valid email address",
    },
  },
  customerContact: {
    type: String,
    required: [true, "Customer contact number is required"],
  },
  customerCompany: {
    type: String,
    default: "",
  },
  // Meeting details
  meetingDate: {
    type: String,
    required: [true, "Meeting date is required"],
  },
  meetingTime: {
    type: String,
    required: [true, "Meeting time is required"],
  },
  // Additional message
  message: {
    type: String,
    default: "",
  },
  // Status tracking
  status: {
    type: String,
    enum: ["pending", "confirmed", "completed", "cancelled"],
    default: "pending",
  },
  // Admin notes
  adminNotes: {
    type: String,
    default: "",
  },
  // Dates
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

MeetingRequestSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const MeetingRequestModel = mongoose.model("MeetingRequest", MeetingRequestSchema);
module.exports = MeetingRequestModel;


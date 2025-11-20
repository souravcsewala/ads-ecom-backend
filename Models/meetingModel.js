const mongoose = require("mongoose");

const MeetingSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: [true, "Customer ID is required"],
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    default: null, // Optional - link to specific order
  },
  customPlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CustomPlan",
    default: null, // Optional - link to custom plan request
  },
  meetingTitle: {
    type: String,
    required: [true, "Meeting title is required"],
  },
  meetingDescription: {
    type: String,
    default: "",
  },
  scheduledDate: {
    type: Date,
    required: [true, "Scheduled date is required"],
  },
  scheduledTime: {
    type: String, // e.g., "14:00" or "2:00 PM"
    required: [true, "Scheduled time is required"],
  },
  timezone: {
    type: String,
    default: "IST", // Indian Standard Time
  },
  meetingType: {
    type: String,
    enum: ["custom_plan_discussion", "follow_up", "consultation", "other"],
    default: "consultation",
  },
  status: {
    type: String,
    enum: ["scheduled", "confirmed", "completed", "cancelled", "rescheduled"],
    default: "scheduled",
  },
  meetingLink: {
    type: String, // Google Meet, Zoom, etc.
    default: "",
  },
  calendarEventId: {
    type: String, // Google Calendar event ID
    default: "",
  },
  meetingNotes: {
    type: String,
    default: "",
  },
  preMeetingNotes: {
    type: String,
    default: "",
  },
  postMeetingNotes: {
    type: String,
    default: "",
  },
  duration: {
    type: Number, // Duration in minutes
    default: 30,
  },
  attendees: [
    {
      email: String,
      name: String,
      role: String, // "customer", "admin", "team_member"
    },
  ],
  reminderSent: {
    type: Boolean,
    default: false,
  },
  reminderSentAt: {
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

MeetingSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const MeetingModel = mongoose.model("Meeting", MeetingSchema);
module.exports = MeetingModel;


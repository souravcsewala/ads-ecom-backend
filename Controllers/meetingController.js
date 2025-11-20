const MeetingModel = require("../Models/meetingModel");
const ErrorHandler = require("../special/errorHandelar");

// Get All Meetings (Admin only)
exports.getAllMeetings = async (req, res, next) => {
  try {
    const { status, upcoming, past } = req.query;

    let query = {};

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter upcoming meetings
    if (upcoming === "true") {
      const now = new Date();
      query.scheduledDate = { $gte: now };
    }

    // Filter past meetings
    if (past === "true") {
      const now = new Date();
      query.scheduledDate = { $lt: now };
    }

    const meetings = await MeetingModel.find(query)
      .populate("customerId", "fullname email phone")
      .populate("orderId", "planName planPrice status")
      .sort({ scheduledDate: 1, scheduledTime: 1 });

    res.status(200).json({
      success: true,
      count: meetings.length,
      meetings,
    });
  } catch (error) {
    next(error);
  }
};

// Get Single Meeting (Admin only)
exports.getMeetingById = async (req, res, next) => {
  try {
    const meeting = await MeetingModel.findById(req.params.id)
      .populate("customerId", "fullname email phone company")
      .populate("orderId", "planName planPrice status")
      .populate("customPlanId");

    if (!meeting) {
      return next(new ErrorHandler("Meeting not found", 404));
    }

    res.status(200).json({
      success: true,
      meeting,
    });
  } catch (error) {
    next(error);
  }
};

// Create Meeting (Admin only)
exports.createMeeting = async (req, res, next) => {
  try {
    const {
      customerId,
      orderId,
      customPlanId,
      meetingTitle,
      meetingDescription,
      scheduledDate,
      scheduledTime,
      timezone,
      meetingType,
      meetingLink,
      duration,
      attendees,
      preMeetingNotes,
    } = req.body;

    // Validation
    if (!customerId || !meetingTitle || !scheduledDate || !scheduledTime) {
      return next(
        new ErrorHandler(
          "Customer ID, meeting title, scheduled date and time are required",
          400
        )
      );
    }

    const meeting = await MeetingModel.create({
      customerId,
      orderId: orderId || null,
      customPlanId: customPlanId || null,
      meetingTitle,
      meetingDescription: meetingDescription || "",
      scheduledDate,
      scheduledTime,
      timezone: timezone || "IST",
      meetingType: meetingType || "consultation",
      meetingLink: meetingLink || "",
      duration: duration || 30,
      attendees: attendees || [],
      preMeetingNotes: preMeetingNotes || "",
    });

    // Populate customer info
    await meeting.populate("customerId", "fullname email phone");

    res.status(201).json({
      success: true,
      message: "Meeting created successfully",
      meeting,
    });
  } catch (error) {
    next(error);
  }
};

// Update Meeting (Admin only)
exports.updateMeeting = async (req, res, next) => {
  try {
    const meeting = await MeetingModel.findById(req.params.id);

    if (!meeting) {
      return next(new ErrorHandler("Meeting not found", 404));
    }

    const updatedMeeting = await MeetingModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("customerId", "fullname email phone")
      .populate("orderId", "planName planPrice status");

    res.status(200).json({
      success: true,
      message: "Meeting updated successfully",
      meeting: updatedMeeting,
    });
  } catch (error) {
    next(error);
  }
};

// Delete Meeting (Admin only)
exports.deleteMeeting = async (req, res, next) => {
  try {
    const meeting = await MeetingModel.findById(req.params.id);

    if (!meeting) {
      return next(new ErrorHandler("Meeting not found", 404));
    }

    await MeetingModel.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Meeting deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Update Meeting Status (Admin only)
exports.updateMeetingStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!status) {
      return next(new ErrorHandler("Status is required", 400));
    }

    const validStatuses = [
      "scheduled",
      "confirmed",
      "completed",
      "cancelled",
      "rescheduled",
    ];

    if (!validStatuses.includes(status)) {
      return next(new ErrorHandler("Invalid status", 400));
    }

    const meeting = await MeetingModel.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    )
      .populate("customerId", "fullname email phone")
      .populate("orderId", "planName planPrice status");

    if (!meeting) {
      return next(new ErrorHandler("Meeting not found", 404));
    }

    res.status(200).json({
      success: true,
      message: "Meeting status updated successfully",
      meeting,
    });
  } catch (error) {
    next(error);
  }
};

// Add Meeting Notes (Admin only)
exports.addMeetingNotes = async (req, res, next) => {
  try {
    const { notes, noteType } = req.body; // noteType: "pre" or "post"

    if (!notes) {
      return next(new ErrorHandler("Notes are required", 400));
    }

    const meeting = await MeetingModel.findById(req.params.id);

    if (!meeting) {
      return next(new ErrorHandler("Meeting not found", 404));
    }

    if (noteType === "pre") {
      meeting.preMeetingNotes = notes;
    } else if (noteType === "post") {
      meeting.postMeetingNotes = notes;
    } else {
      meeting.meetingNotes = notes;
    }

    await meeting.save();

    res.status(200).json({
      success: true,
      message: "Meeting notes added successfully",
      meeting,
    });
  } catch (error) {
    next(error);
  }
};

// Get Upcoming Meetings (Admin only)
exports.getUpcomingMeetings = async (req, res, next) => {
  try {
    const now = new Date();
    const meetings = await MeetingModel.find({
      scheduledDate: { $gte: now },
      status: { $in: ["scheduled", "confirmed"] },
    })
      .populate("customerId", "fullname email phone")
      .populate("orderId", "planName planPrice")
      .sort({ scheduledDate: 1, scheduledTime: 1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: meetings.length,
      meetings,
    });
  } catch (error) {
    next(error);
  }
};

// Get Past Meetings (Admin only)
exports.getPastMeetings = async (req, res, next) => {
  try {
    const now = new Date();
    const meetings = await MeetingModel.find({
      scheduledDate: { $lt: now },
      status: { $in: ["completed", "cancelled"] },
    })
      .populate("customerId", "fullname email phone")
      .populate("orderId", "planName planPrice")
      .sort({ scheduledDate: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: meetings.length,
      meetings,
    });
  } catch (error) {
    next(error);
  }
};


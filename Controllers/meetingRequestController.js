const MeetingRequestModel = require("../Models/meetingRequestModel");
const ErrorHandler = require("../special/errorHandelar");
const { sendMeetingRequestConfirmationEmail, sendMeetingRequestNotificationToAdmin } = require("../utils/sendEmail");

// Create Meeting Request (Public - no auth required)
exports.createMeetingRequest = async (req, res, next) => {
  try {
    const { customerName, customerEmail, customerContact, customerCompany, meetingDate, meetingTime, message } = req.body;

    // Validation
    if (!customerName || !customerEmail || !customerContact || !meetingDate || !meetingTime) {
      return next(new ErrorHandler("Please provide all required fields", 400));
    }

    // Create meeting request
    const meetingRequest = await MeetingRequestModel.create({
      customerName,
      customerEmail,
      customerContact,
      customerCompany: customerCompany || "",
      meetingDate,
      meetingTime,
      message: message || "",
      status: "pending",
    });

    // Send emails asynchronously (don't wait for them to complete)
    // Send confirmation email to customer
    sendMeetingRequestConfirmationEmail(meetingRequest).catch((error) => {
      console.error("Failed to send customer confirmation email:", error);
    });

    // Send notification email to admin
    sendMeetingRequestNotificationToAdmin(meetingRequest).catch((error) => {
      console.error("Failed to send admin notification email:", error);
    });

    res.status(201).json({
      success: true,
      message: "Meeting request submitted successfully",
      meetingRequest,
    });
  } catch (error) {
    next(error);
  }
};

// Get All Meeting Requests (Admin only)
exports.getAllMeetingRequests = async (req, res, next) => {
  try {
    const meetingRequests = await MeetingRequestModel.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: meetingRequests.length,
      meetingRequests,
    });
  } catch (error) {
    next(error);
  }
};

// Get Single Meeting Request (Admin only)
exports.getMeetingRequest = async (req, res, next) => {
  try {
    const meetingRequest = await MeetingRequestModel.findById(req.params.id);

    if (!meetingRequest) {
      return next(new ErrorHandler("Meeting request not found", 404));
    }

    res.status(200).json({
      success: true,
      meetingRequest,
    });
  } catch (error) {
    next(error);
  }
};

// Update Meeting Request Status (Admin only)
exports.updateMeetingRequestStatus = async (req, res, next) => {
  try {
    const { status, adminNotes } = req.body;

    if (!status) {
      return next(new ErrorHandler("Status is required", 400));
    }

    const validStatuses = ["pending", "confirmed", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return next(new ErrorHandler("Invalid status", 400));
    }

    const updateData = { status };
    if (adminNotes !== undefined) {
      updateData.adminNotes = adminNotes;
    }

    const meetingRequest = await MeetingRequestModel.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!meetingRequest) {
      return next(new ErrorHandler("Meeting request not found", 404));
    }

    res.status(200).json({
      success: true,
      message: "Meeting request updated successfully",
      meetingRequest,
    });
  } catch (error) {
    next(error);
  }
};

// Delete Meeting Request (Admin only)
exports.deleteMeetingRequest = async (req, res, next) => {
  try {
    const meetingRequest = await MeetingRequestModel.findById(req.params.id);

    if (!meetingRequest) {
      return next(new ErrorHandler("Meeting request not found", 404));
    }

    await meetingRequest.deleteOne();

    res.status(200).json({
      success: true,
      message: "Meeting request deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};


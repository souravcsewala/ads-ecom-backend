const OrderModel = require("../Models/orderModel");
const ErrorHandler = require("../special/errorHandelar");
const { sendOrderConfirmationEmail, sendOrderNotificationToAdmin } = require("../utils/sendEmail");

// Create Order (Requires Authentication)
exports.createOrder = async (req, res, next) => {
  try {
    const {
      planType,
      planId,
      planName,
      planPrice,
      adType,
      numberOfAds,
      imageDimensions,
      brandAssetsLink,
      generalInstructions,
      ads,
      customerName,
      customerEmail,
      customerContact,
      customerCompany,
      additionalNotes,
      meetingInterest,
      meetingDate,
      meetingTime,
    } = req.body;

    // Validation - check each field individually for better error messages
    if (!planType) {
      return next(new ErrorHandler("planType is required", 400));
    }
    if (!planName) {
      return next(new ErrorHandler("planName is required", 400));
    }
    if (planPrice === undefined || planPrice === null || planPrice === '') {
      return next(new ErrorHandler("planPrice is required", 400));
    }
    if (!adType) {
      return next(new ErrorHandler("adType is required", 400));
    }
    if (!numberOfAds || numberOfAds <= 0) {
      return next(new ErrorHandler("numberOfAds must be greater than 0", 400));
    }

    if (!brandAssetsLink) {
      return next(new ErrorHandler("Brand assets link is required", 400));
    }

    if (!ads || ads.length === 0) {
      return next(new ErrorHandler("At least one ad is required", 400));
    }

    // Validate each ad
    for (let i = 0; i < ads.length; i++) {
      const ad = ads[i];
      if (
        !ad.referenceImageUrl ||
        !ad.productPageUrl ||
        !ad.specificInstructions
      ) {
        return next(
          new ErrorHandler(
            `Ad ${i + 1} is missing required fields`,
            400
          )
        );
      }
    }

    // Calculate delivery deadline (default: 5 days from now)
    const deliveryDeadline = new Date();
    deliveryDeadline.setDate(deliveryDeadline.getDate() + 5);

    // Add ad numbers
    const adsWithNumbers = ads.map((ad, index) => ({
      ...ad,
      adNumber: index + 1,
    }));

    // Create order - customerId is optional (guest orders allowed)
    const order = await OrderModel.create({
      customerId: req.userid || null, // Optional - null for guest orders
      planType,
      planId: planId || null,
      planName,
      planPrice,
      adType,
      numberOfAds,
      imageDimensions: imageDimensions || "",
      brandAssetsLink,
      generalInstructions: generalInstructions || "",
      ads: adsWithNumbers,
      customerName: customerName || req.user?.fullname || "",
      customerEmail: customerEmail || req.user?.email || "",
      customerContact: customerContact || req.user?.phone || "",
      customerCompany: customerCompany || "",
      additionalNotes: additionalNotes || "",
      meetingInterest: meetingInterest || "no",
      meetingDate: meetingInterest === "yes" ? (meetingDate || "") : "",
      meetingTime: meetingInterest === "yes" ? (meetingTime || "") : "",
      deliveryDeadline,
    });

    // Send emails asynchronously (don't wait for them to complete)
    // Send confirmation email to customer
    sendOrderConfirmationEmail(order).catch((error) => {
      console.error("Failed to send customer confirmation email:", error);
    });

    // Send notification email to admin
    sendOrderNotificationToAdmin(order).catch((error) => {
      console.error("Failed to send admin notification email:", error);
    });

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      order,
    });
  } catch (error) {
    next(error);
  }
};

// Get User's Orders (Requires Authentication)
exports.getMyOrders = async (req, res, next) => {
  try {
    const orders = await OrderModel.find({ customerId: req.userid }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    next(error);
  }
};

// Get Single Order (Requires Authentication - User can only see their own)
exports.getOrderById = async (req, res, next) => {
  try {
    const order = await OrderModel.findById(req.params.id)
      .populate("customerId", "fullname email phone")
      .populate("planId", "planName price");

    if (!order) {
      return next(new ErrorHandler("Order not found", 404));
    }

    // Check if user owns this order or is admin
    // Handle null customerId (guest orders)
    const isOwner = order.customerId && 
                    order.customerId.toString() === req.userid?.toString();
    const isAdmin = req.userRole === "admin";

    if (!isOwner && !isAdmin) {
      return next(
        new ErrorHandler("You are not authorized to view this order", 403)
      );
    }

    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    next(error);
  }
};

// Get Single Order (Admin only - for admin panel)
exports.getOrderByIdAdmin = async (req, res, next) => {
  try {
    const order = await OrderModel.findById(req.params.id)
      .populate("customerId", "fullname email phone")
      .populate("planId", "planName price");

    if (!order) {
      return next(new ErrorHandler("Order not found", 404));
    }

    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    next(error);
  }
};

// Update Order Status (Admin only)
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!status) {
      return next(new ErrorHandler("Status is required", 400));
    }

    const validStatuses = ["pending", "in_progress", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return next(new ErrorHandler("Invalid status", 400));
    }

    const order = await OrderModel.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!order) {
      return next(new ErrorHandler("Order not found", 404));
    }

    res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      order,
    });
  } catch (error) {
    next(error);
  }
};

// Update Payment Status (Admin only)
exports.updatePaymentStatus = async (req, res, next) => {
  try {
    const { paymentStatus } = req.body;

    if (!paymentStatus) {
      return next(new ErrorHandler("Payment status is required", 400));
    }

    const validStatuses = ["pending", "paid", "failed", "refunded"];
    if (!validStatuses.includes(paymentStatus)) {
      return next(new ErrorHandler("Invalid payment status", 400));
    }

    const order = await OrderModel.findByIdAndUpdate(
      req.params.id,
      { paymentStatus },
      { new: true, runValidators: true }
    );

    if (!order) {
      return next(new ErrorHandler("Order not found", 404));
    }

    res.status(200).json({
      success: true,
      message: "Payment status updated successfully",
      order,
    });
  } catch (error) {
    next(error);
  }
};

// Get All Orders (Admin only)
exports.getAllOrders = async (req, res, next) => {
  try {
    const orders = await OrderModel.find()
      .populate("customerId", "fullname email phone")
      .populate("planId", "planName price")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    next(error);
  }
};

// Delete Order (Admin only)
exports.deleteOrder = async (req, res, next) => {
  try {
    const order = await OrderModel.findById(req.params.id);

    if (!order) {
      return next(new ErrorHandler("Order not found", 404));
    }

    await OrderModel.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Order deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};


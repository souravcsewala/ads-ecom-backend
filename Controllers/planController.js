const PlanModel = require("../Models/planModel");
const ErrorHandler = require("../special/errorHandelar");

// Get All Plans (Public - for frontend)
exports.getAllPlans = async (req, res, next) => {
  try {
    const { planType } = req.query; // "image" or "video"

    const query = { isActive: true };
    if (planType) {
      query.planType = planType;
    }

    const plans = await PlanModel.find(query).sort({ displayOrder: 1 });

    res.status(200).json({
      success: true,
      count: plans.length,
      plans,
    });
  } catch (error) {
    next(error);
  }
};

// Get Single Plan (Public)
exports.getPlanById = async (req, res, next) => {
  try {
    const plan = await PlanModel.findById(req.params.id);

    if (!plan) {
      return next(new ErrorHandler("Plan not found", 404));
    }

    if (!plan.isActive) {
      return next(new ErrorHandler("Plan is not active", 404));
    }

    res.status(200).json({
      success: true,
      plan,
    });
  } catch (error) {
    next(error);
  }
};

// Create Plan (Admin only)
exports.createPlan = async (req, res, next) => {
  try {
    const {
      planType,
      planName,
      price,
      pricePer,
      total,
      description,
      tag,
      tagColor,
      features,
      cta,
      isPopular,
      displayOrder,
    } = req.body;

    // Validation
    if (!planType || !planName || !price || !cta) {
      return next(
        new ErrorHandler("Please provide all required plan fields", 400)
      );
    }

    const plan = await PlanModel.create({
      planType,
      planName,
      price,
      pricePer: pricePer || "",
      total: total || "",
      description: description || "",
      tag: tag || "",
      tagColor: tagColor || "",
      features: features || [],
      cta,
      isPopular: isPopular || false,
      displayOrder: displayOrder || 0,
    });

    res.status(201).json({
      success: true,
      message: "Plan created successfully",
      plan,
    });
  } catch (error) {
    next(error);
  }
};

// Update Plan (Admin only)
exports.updatePlan = async (req, res, next) => {
  try {
    const plan = await PlanModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!plan) {
      return next(new ErrorHandler("Plan not found", 404));
    }

    res.status(200).json({
      success: true,
      message: "Plan updated successfully",
      plan,
    });
  } catch (error) {
    next(error);
  }
};

// Delete Plan (Admin only)
exports.deletePlan = async (req, res, next) => {
  try {
    const plan = await PlanModel.findById(req.params.id);

    if (!plan) {
      return next(new ErrorHandler("Plan not found", 404));
    }

    // Soft delete - just mark as inactive
    plan.isActive = false;
    await plan.save();

    res.status(200).json({
      success: true,
      message: "Plan deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};


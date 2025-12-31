const PortfolioModel = require("../Models/portfolioModel");
const ErrorHandler = require("../special/errorHandelar");
const { getSignedDownloadUrl, uploadToS3 } = require("../utils/s3Upload");

const signPortfolioImage = async (portfolioDoc) => {
  if (!portfolioDoc) return portfolioDoc;

  const portfolio = portfolioDoc.toObject ? portfolioDoc.toObject() : { ...portfolioDoc };

  // Use longer expiration (2 hours) for portfolio images
  const PORTFOLIO_EXPIRATION = 7200; // 2 hours in seconds

  if (portfolio.imageKey || portfolio.imageUrl) {
    portfolio.imageUrl = await getSignedDownloadUrl(
      portfolio.imageKey || portfolio.imageUrl,
      PORTFOLIO_EXPIRATION
    );
  }

  return portfolio;
};

const parseBoolean = (value, defaultValue = true) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return defaultValue;
};

const parseNumber = (value, defaultValue = 0) => {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? defaultValue : parsed;
};

// Get All Portfolio Items (Public - for frontend)
exports.getAllPortfolio = async (req, res, next) => {
  try {
    const portfolios = await PortfolioModel.find({ isActive: true }).sort({
      displayOrder: 1,
    });

    const signedPortfolios = await Promise.all(portfolios.map(signPortfolioImage));

    res.status(200).json({
      success: true,
      count: signedPortfolios.length,
      portfolios: signedPortfolios,
    });
  } catch (error) {
    next(error);
  }
};

// Get Single Portfolio Item (Public)
exports.getPortfolioById = async (req, res, next) => {
  try {
    const portfolio = await PortfolioModel.findById(req.params.id);

    if (!portfolio) {
      return next(new ErrorHandler("Portfolio item not found", 404));
    }

    const signedPortfolio = await signPortfolioImage(portfolio);

    res.status(200).json({
      success: true,
      portfolio: signedPortfolio,
    });
  } catch (error) {
    next(error);
  }
};

// Create Portfolio Item (Admin only) - with file upload support
exports.createPortfolio = async (req, res, next) => {
  try {
    const { title, linkUrl, category, displayOrder, isActive } = req.body;

    if (!title) {
      return next(new ErrorHandler("Title is required", 400));
    }

    const uploadedFiles = req.files || {};
    let imageData = { url: "", key: "" };

    const imageFile = uploadedFiles.imageFile;
    if (!imageFile) {
      return next(new ErrorHandler("Image file is required", 400));
    }

    const uploadResult = await uploadToS3(imageFile, "portfolio");
    imageData = { url: uploadResult.url, key: uploadResult.key };

    let portfolio = await PortfolioModel.create({
      title,
      linkUrl: linkUrl || "",
      category: category || "",
      imageUrl: imageData.url,
      imageKey: imageData.key,
      displayOrder: parseNumber(displayOrder, 0),
      isActive: parseBoolean(isActive, true),
    });

    portfolio = await signPortfolioImage(portfolio);

    res.status(201).json({
      success: true,
      message: "Portfolio item created successfully",
      portfolio,
    });
  } catch (error) {
    next(error);
  }
};

// Update Portfolio Item (Admin only)
exports.updatePortfolio = async (req, res, next) => {
  try {
    const portfolio = await PortfolioModel.findById(req.params.id);

    if (!portfolio) {
      return next(new ErrorHandler("Portfolio item not found", 404));
    }

    const updates = {
      title: req.body.title ?? portfolio.title,
      linkUrl: req.body.linkUrl !== undefined ? (req.body.linkUrl || "") : portfolio.linkUrl,
      category: req.body.category !== undefined ? (req.body.category || "") : portfolio.category,
      displayOrder: req.body.displayOrder !== undefined
        ? parseNumber(req.body.displayOrder, portfolio.displayOrder)
        : portfolio.displayOrder,
      isActive: req.body.isActive !== undefined
        ? parseBoolean(req.body.isActive, portfolio.isActive)
        : portfolio.isActive,
    };

    const uploadedFiles = req.files || {};

    if (uploadedFiles.imageFile) {
      const imageUpload = await uploadToS3(uploadedFiles.imageFile, "portfolio");
      updates.imageUrl = imageUpload.url;
      updates.imageKey = imageUpload.key;
    }

    Object.assign(portfolio, updates);
    await portfolio.save();

    const signedPortfolio = await signPortfolioImage(portfolio);

    res.status(200).json({
      success: true,
      message: "Portfolio item updated successfully",
      portfolio: signedPortfolio,
    });
  } catch (error) {
    next(error);
  }
};

// Delete Portfolio Item (Admin only)
exports.deletePortfolio = async (req, res, next) => {
  try {
    const portfolio = await PortfolioModel.findById(req.params.id);

    if (!portfolio) {
      return next(new ErrorHandler("Portfolio item not found", 404));
    }

    // Soft delete - just mark as inactive
    portfolio.isActive = false;
    await portfolio.save();

    res.status(200).json({
      success: true,
      message: "Portfolio item deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};


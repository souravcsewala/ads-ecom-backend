const DemoContentModel = require("../Models/demoContentModel");
const ErrorHandler = require("../special/errorHandelar");
const { getSignedDownloadUrl, uploadToS3 } = require("../utils/s3Upload");

const signDemoContentMedia = async (contentDoc) => {
  if (!contentDoc) return contentDoc;

  const content = contentDoc.toObject ? contentDoc.toObject() : { ...contentDoc };

  // Use longer expiration (2 hours) for demo content to prevent 403 errors on initial page load
  const DEMO_CONTENT_EXPIRATION = 7200; // 2 hours in seconds

  const signField = async (key, fallbackUrl) => {
    const source = key || fallbackUrl;
    return source ? await getSignedDownloadUrl(source, DEMO_CONTENT_EXPIRATION) : "";
  };

  content.imageUrl = await signField(content.imageKey, content.imageUrl);
  content.videoUrl = await signField(content.videoKey, content.videoUrl);
  content.thumbnailUrl = await signField(content.thumbnailKey, content.thumbnailUrl);

  return content;
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

// Get All Demo Content (Public - for frontend)
exports.getAllDemoContent = async (req, res, next) => {
  try {
    const { contentType } = req.query; // "image" or "video"

    const query = { isActive: true };
    if (contentType) {
      query.contentType = contentType;
    }

    const contents = await DemoContentModel.find(query).sort({
      displayOrder: 1,
    });

    const signedContents = await Promise.all(contents.map(signDemoContentMedia));

    res.status(200).json({
      success: true,
      count: signedContents.length,
      contents: signedContents,
    });
  } catch (error) {
    next(error);
  }
};

// Get Single Demo Content (Public)
exports.getDemoContentById = async (req, res, next) => {
  try {
    const content = await DemoContentModel.findById(req.params.id);

    if (!content) {
      return next(new ErrorHandler("Demo content not found", 404));
    }

    const signedContent = await signDemoContentMedia(content);

    res.status(200).json({
      success: true,
      content: signedContent,
    });
  } catch (error) {
    next(error);
  }
};

// Create Demo Content (Admin only) - with file upload support
exports.createDemoContent = async (req, res, next) => {
  try {
    const { contentType, title, description, displayOrder, isActive } = req.body;

    if (!contentType || !title) {
      return next(
        new ErrorHandler("Content type and title are required", 400)
      );
    }

    const normalizedType = contentType.toLowerCase();

    if (!["image", "video"].includes(normalizedType)) {
      return next(new ErrorHandler("Content type must be 'image' or 'video'", 400));
    }

    const uploadedFiles = req.files || {};
    let imageData = { url: "", key: "" };
    let videoData = { url: "", key: "" };
    let thumbnailData = { url: "", key: "" };

    if (normalizedType === "image") {
      const imageFile = uploadedFiles.imageFile;
      if (!imageFile) {
        return next(new ErrorHandler("Image file is required for image content", 400));
      }
      const uploadResult = await uploadToS3(imageFile, "demo-content/images");
      imageData = { url: uploadResult.url, key: uploadResult.key };
    }

    if (normalizedType === "video") {
      const videoFile = uploadedFiles.videoFile;
      if (!videoFile) {
        return next(new ErrorHandler("Video file is required for video content", 400));
      }
      const videoUpload = await uploadToS3(videoFile, "demo-content/videos");
      videoData = { url: videoUpload.url, key: videoUpload.key };
    }

    if (uploadedFiles.thumbnailFile) {
      const thumbnailUpload = await uploadToS3(
        uploadedFiles.thumbnailFile,
        "demo-content/thumbnails"
      );
      thumbnailData = { url: thumbnailUpload.url, key: thumbnailUpload.key };
    }

    let content = await DemoContentModel.create({
      contentType: normalizedType,
      title,
      description: description || "",
      imageUrl: imageData.url,
      imageKey: imageData.key,
      videoUrl: videoData.url,
      videoKey: videoData.key,
      thumbnailUrl: thumbnailData.url,
      thumbnailKey: thumbnailData.key,
      displayOrder: parseNumber(displayOrder, 0),
      isActive: parseBoolean(isActive, true),
    });

    content = await signDemoContentMedia(content);

    res.status(201).json({
      success: true,
      message: "Demo content created successfully",
      content,
    });
  } catch (error) {
    next(error);
  }
};

// Update Demo Content (Admin only)
exports.updateDemoContent = async (req, res, next) => {
  try {
    const content = await DemoContentModel.findById(req.params.id);

    if (!content) {
      return next(new ErrorHandler("Demo content not found", 404));
    }

    const updates = {
      title: req.body.title ?? content.title,
      description: req.body.description ?? content.description,
      displayOrder: req.body.displayOrder !== undefined
        ? parseNumber(req.body.displayOrder, content.displayOrder)
        : content.displayOrder,
      isActive: req.body.isActive !== undefined
        ? parseBoolean(req.body.isActive, content.isActive)
        : content.isActive,
    };

    const uploadedFiles = req.files || {};

    if (uploadedFiles.imageFile) {
      const imageUpload = await uploadToS3(uploadedFiles.imageFile, "demo-content/images");
      updates.imageUrl = imageUpload.url;
      updates.imageKey = imageUpload.key;
    }

    if (uploadedFiles.videoFile) {
      const videoUpload = await uploadToS3(uploadedFiles.videoFile, "demo-content/videos");
      updates.videoUrl = videoUpload.url;
      updates.videoKey = videoUpload.key;
    }

    if (uploadedFiles.thumbnailFile) {
      const thumbnailUpload = await uploadToS3(
        uploadedFiles.thumbnailFile,
        "demo-content/thumbnails"
      );
      updates.thumbnailUrl = thumbnailUpload.url;
      updates.thumbnailKey = thumbnailUpload.key;
    }

    Object.assign(content, updates);
    await content.save();

    const signedContent = await signDemoContentMedia(content);

    res.status(200).json({
      success: true,
      message: "Demo content updated successfully",
      content: signedContent,
    });
  } catch (error) {
    next(error);
  }
};

// Delete Demo Content (Admin only)
exports.deleteDemoContent = async (req, res, next) => {
  try {
    const content = await DemoContentModel.findById(req.params.id);

    if (!content) {
      return next(new ErrorHandler("Demo content not found", 404));
    }

    content.isActive = false;
    await content.save();

    res.status(200).json({
      success: true,
      message: "Demo content deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};


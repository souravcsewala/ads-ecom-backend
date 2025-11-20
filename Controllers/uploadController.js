const ErrorHandler = require("../special/errorHandelar");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const {
  uploadToS3,
  uploadMultipleToS3,
  validateFileType,
  validateFileSize,
  generateFileName,
  getPublicUrl,
  s3Client,
} = require("../utils/s3Upload");

// Upload single file (for users - brand assets, reference images/videos)
exports.uploadFile = async (req, res, next) => {
  try {
    if (!req.files || !req.files.file) {
      return next(new ErrorHandler("No file uploaded", 400));
    }

    const file = req.files.file;
    const folder = req.body.folder || "user-uploads"; // Default folder

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "video/mp4",
      "video/quicktime",
      "video/x-msvideo",
      "video/webm",
    ];

    if (!validateFileType(file, allowedTypes)) {
      return next(new ErrorHandler("Invalid file type. Only images and videos are allowed.", 400));
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (!validateFileSize(file, maxSize)) {
      return next(new ErrorHandler("File size too large. Maximum size is 50MB.", 400));
    }

    // Upload to S3
    const result = await uploadToS3(file, folder);

    res.status(200).json({
      success: true,
      message: "File uploaded successfully",
      file: result,
    });
  } catch (error) {
    next(error);
  }
};

// Upload multiple files
exports.uploadMultipleFiles = async (req, res, next) => {
  try {
    if (!req.files || !req.files.files) {
      return next(new ErrorHandler("No files uploaded", 400));
    }

    const files = Array.isArray(req.files.files) 
      ? req.files.files 
      : [req.files.files];
    
    const folder = req.body.folder || "user-uploads";

    // Validate all files
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "video/mp4",
      "video/quicktime",
      "video/x-msvideo",
      "video/webm",
    ];

    const maxSize = 50 * 1024 * 1024; // 50MB

    for (const file of files) {
      if (!validateFileType(file, allowedTypes)) {
        return next(new ErrorHandler(`Invalid file type: ${file.name}. Only images and videos are allowed.`, 400));
      }
      if (!validateFileSize(file, maxSize)) {
        return next(new ErrorHandler(`File too large: ${file.name}. Maximum size is 50MB.`, 400));
      }
    }

    // Upload to S3
    const result = await uploadMultipleToS3(files, folder);

    res.status(200).json({
      success: true,
      message: "Files uploaded successfully",
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

// Upload demo content (Admin only - for demo images/videos)
exports.uploadDemoContent = async (req, res, next) => {
  try {
    if (!req.files || !req.files.file) {
      return next(new ErrorHandler("No file uploaded", 400));
    }

    const file = req.files.file;
    const contentType = req.body.contentType; // "image" or "video"

    // Validate content type
    if (!contentType || !["image", "video"].includes(contentType)) {
      return next(new ErrorHandler("Content type must be 'image' or 'video'", 400));
    }

    // Set allowed types based on content type
    const allowedTypes = contentType === "image"
      ? ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
      : ["video/mp4", "video/quicktime", "video/x-msvideo", "video/webm"];

    if (!validateFileType(file, allowedTypes)) {
      return next(
        new ErrorHandler(
          `Invalid file type for ${contentType}. Allowed: ${allowedTypes.join(", ")}`,
          400
        )
      );
    }

    // Validate file size
    const maxSize = contentType === "image" 
      ? 10 * 1024 * 1024  // 10MB for images
      : 100 * 1024 * 1024; // 100MB for videos

    if (!validateFileSize(file, maxSize)) {
      return next(
        new ErrorHandler(
          `File size too large. Maximum size for ${contentType} is ${maxSize / (1024 * 1024)}MB`,
          400
        )
      );
    }

    // Upload to S3 in demo-content folder
    const folder = `demo-content/${contentType}`;
    const result = await uploadToS3(file, folder);

    res.status(200).json({
      success: true,
      message: "Demo content uploaded successfully",
      file: result,
      contentType,
    });
  } catch (error) {
    next(error);
  }
};

// Upload brand assets (User - for order submission)
exports.uploadBrandAssets = async (req, res, next) => {
  try {
    if (!req.files || !req.files.file) {
      return next(new ErrorHandler("No file uploaded", 400));
    }

    const file = req.files.file;

    // Allow images, videos, and zip files for brand assets
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "video/mp4",
      "video/quicktime",
      "video/x-msvideo",
      "application/zip",
      "application/x-zip-compressed",
    ];

    if (!validateFileType(file, allowedTypes)) {
      return next(new ErrorHandler("Invalid file type. Only images, videos, and zip files are allowed.", 400));
    }

    // Larger size limit for brand assets (100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (!validateFileSize(file, maxSize)) {
      return next(new ErrorHandler("File size too large. Maximum size is 100MB.", 400));
    }

    // Upload to S3 in brand-assets folder with user ID
    const userId = req.userid || "anonymous";
    const folder = `brand-assets/${userId}`;
    const result = await uploadToS3(file, folder);

    res.status(200).json({
      success: true,
      message: "Brand assets uploaded successfully",
      file: result,
    });
  } catch (error) {
    next(error);
  }
};

// Generate pre-signed URL for direct uploads to S3
exports.getPresignedUploadUrl = async (req, res, next) => {
  try {
    const { fileName, fileType, folder = "uploads", expiresIn = 300 } = req.body;

    if (!fileName || !fileType) {
      return next(new ErrorHandler("File name and file type are required", 400));
    }

    if (!process.env.AWS_BUCKET_NAME) {
      return next(new ErrorHandler("AWS bucket is not configured", 500));
    }

    const sanitizedFolder = folder
      .toString()
      .replace(/\\/g, "/")
      .replace(/^\/*|\/*$/g, "") || "uploads";

    const safeFileName = fileName.replace(/\s+/g, "-");
    const objectKey = `${sanitizedFolder}/${generateFileName(12)}-${safeFileName}`;

    const uploadContentType = fileType || "application/octet-stream";
    const maxExpiry = 3600; // 1 hour
    const minExpiry = 60; // 1 minute
    const signedUrlExpiry = Math.min(Math.max(Number(expiresIn) || 300, minExpiry), maxExpiry);

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: objectKey,
      ContentType: uploadContentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: signedUrlExpiry,
    });

    res.status(200).json({
      success: true,
      uploadUrl,
      fileUrl: getPublicUrl(objectKey),
      key: objectKey,
      expiresIn: signedUrlExpiry,
      uploadHeaders: {
        "Content-Type": uploadContentType,
      },
    });
  } catch (error) {
    next(error);
  }
};


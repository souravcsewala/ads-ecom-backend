const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const crypto = require("crypto");

const REGION = process.env.AWS_REGION || "us-east-1";

// Initialize S3 Client
const s3Client = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME;

// Generate unique file name
const generateFileName = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString("hex");
};

const buildFileUrl = (key) => {
  if (!key) return "";
  return `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${key}`;
};

const extractKeyFromUrl = (urlOrKey) => {
  if (!urlOrKey) return "";

  if (urlOrKey.startsWith("http")) {
    const parts = urlOrKey.split(".amazonaws.com/");
    return parts[1] || "";
  }

  return urlOrKey;
};

const fs = require("fs");

exports.s3Client = s3Client;
exports.generateFileName = generateFileName;
exports.getPublicUrl = buildFileUrl;
exports.extractKeyFromUrl = extractKeyFromUrl;

const getSignedDownloadUrl = async (keyOrUrl, expiresIn = 3600) => {
  try {
    const key = extractKeyFromUrl(keyOrUrl);

    if (!key) {
      return "";
    }

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn,
    });

    return signedUrl;
  } catch (error) {
    console.error("S3 Signed Download URL Error:", error);
    return "";
  }
};

exports.getSignedDownloadUrl = getSignedDownloadUrl;

// Upload file to S3
exports.uploadToS3 = async (file, folder = "uploads") => {
  try {
    if (!file) {
      throw new Error("No file provided");
    }

    // Generate unique file name
    const fileName = `${folder}/${generateFileName()}-${file.name}`;

    // Determine content type
    const contentType = file.mimetype || "application/octet-stream";

    // Read file data - express-fileupload stores in file.tempFilePath when useTempFiles is true
    let fileData;
    if (file.tempFilePath) {
      // File is stored in temp folder, read it
      fileData = fs.readFileSync(file.tempFilePath);
    } else if (file.data) {
      // File is in memory
      fileData = file.data;
    } else {
      throw new Error("No file data found");
    }

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: fileData,
      ContentType: contentType,
    });

    await s3Client.send(command);

    // Clean up temp file if it exists
    if (file.tempFilePath && fs.existsSync(file.tempFilePath)) {
      fs.unlinkSync(file.tempFilePath);
    }

    // Return file URL
    const fileUrl = buildFileUrl(fileName);

    return {
      success: true,
      url: fileUrl,
      key: fileName, // Store this for deletion later
      fileName: file.name,
      size: file.size,
      contentType: contentType,
    };
  } catch (error) {
    // Clean up temp file on error
    if (file && file.tempFilePath && fs.existsSync(file.tempFilePath)) {
      try {
        fs.unlinkSync(file.tempFilePath);
      } catch (cleanupError) {
        console.error("Error cleaning up temp file:", cleanupError);
      }
    }
    console.error("S3 Upload Error:", error);
    throw new Error(`Failed to upload file to S3: ${error.message}`);
  }
};

// Upload multiple files to S3
exports.uploadMultipleToS3 = async (files, folder = "uploads") => {
  try {
    if (!files || files.length === 0) {
      throw new Error("No files provided");
    }

    const uploadPromises = files.map((file) => exports.uploadToS3(file, folder));
    const results = await Promise.all(uploadPromises);

    return {
      success: true,
      files: results,
    };
  } catch (error) {
    // Clean up any remaining temp files on error
    if (files && Array.isArray(files)) {
      files.forEach((file) => {
        if (file && file.tempFilePath && fs.existsSync(file.tempFilePath)) {
          try {
            fs.unlinkSync(file.tempFilePath);
          } catch (cleanupError) {
            console.error("Error cleaning up temp file:", cleanupError);
          }
        }
      });
    }
    console.error("S3 Multiple Upload Error:", error);
    throw new Error(`Failed to upload files to S3: ${error.message}`);
  }
};

// Delete file from S3
exports.deleteFromS3 = async (fileKey) => {
  try {
    if (!fileKey) {
      throw new Error("No file key provided");
    }

    // Extract key from URL if full URL is provided
    let key = fileKey;
    if (fileKey.includes("amazonaws.com/")) {
      key = fileKey.split("amazonaws.com/")[1];
    }

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);

    return {
      success: true,
      message: "File deleted successfully",
    };
  } catch (error) {
    console.error("S3 Delete Error:", error);
    throw new Error(`Failed to delete file from S3: ${error.message}`);
  }
};

// Get signed URL for private file access (if needed)
exports.getSignedUrl = async (fileKey, expiresIn = 3600) => {
  try {
    // Extract key from URL if full URL is provided
    let key = fileKey;
    if (fileKey.includes("amazonaws.com/")) {
      key = fileKey.split("amazonaws.com/")[1];
    }

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });

    return {
      success: true,
      url: signedUrl,
    };
  } catch (error) {
    console.error("S3 Signed URL Error:", error);
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }
};

// Validate file type
exports.validateFileType = (file, allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/gif", "image/webp", "video/mp4", "video/quicktime", "video/x-msvideo"]) => {
  if (!file || !file.mimetype) {
    return false;
  }
  return allowedTypes.includes(file.mimetype);
};

// Validate file size (in bytes)
exports.validateFileSize = (file, maxSize = 50 * 1024 * 1024) => { // Default 50MB
  if (!file || !file.size) {
    return false;
  }
  return file.size <= maxSize;
};


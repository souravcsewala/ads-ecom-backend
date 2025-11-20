const TeamModel = require("../Models/teamModel");
const ErrorHandler = require("../special/errorHandelar");
const { getSignedDownloadUrl, uploadToS3 } = require("../utils/s3Upload");

const signTeamMemberMedia = async (memberDoc) => {
  if (!memberDoc) return memberDoc;

  const member = memberDoc.toObject ? memberDoc.toObject() : { ...memberDoc };

  // Use longer expiration (2 hours) for team images to prevent 403 errors on initial page load
  const TEAM_IMAGE_EXPIRATION = 7200; // 2 hours in seconds

  if (member.image && member.image.url) {
    member.image.url = await getSignedDownloadUrl(member.image.url, TEAM_IMAGE_EXPIRATION);
  }

  return member;
};

// Get All Team Members (Public - for frontend)
exports.getAllTeamMembers = async (req, res, next) => {
  try {
    const teamMembers = await TeamModel.find({ isActive: true }).sort({
      displayOrder: 1,
    });

    const signedMembers = await Promise.all(teamMembers.map(signTeamMemberMedia));

    res.status(200).json({
      success: true,
      count: signedMembers.length,
      teamMembers: signedMembers,
    });
  } catch (error) {
    next(error);
  }
};

// Get Single Team Member (Public)
exports.getTeamMemberById = async (req, res, next) => {
  try {
    const teamMember = await TeamModel.findById(req.params.id);

    if (!teamMember) {
      return next(new ErrorHandler("Team member not found", 404));
    }

    const signedMember = await signTeamMemberMedia(teamMember);

    res.status(200).json({
      success: true,
      teamMember: signedMember,
    });
  } catch (error) {
    next(error);
  }
};

// Create Team Member (Admin only) - with file upload support
exports.createTeamMember = async (req, res, next) => {
  try {
    const { name, role, bio, displayOrder, isActive } = req.body;

    if (!name || !role) {
      return next(new ErrorHandler("Name and role are required", 400));
    }

    // Handle file upload
    const uploadedFiles = req.files || {};
    let imageData = { url: "", key: "" };

    if (uploadedFiles.imageFile) {
      const uploadResult = await uploadToS3(uploadedFiles.imageFile, "team/images");
      imageData = { url: uploadResult.url, key: uploadResult.key };
    } else {
      return next(new ErrorHandler("Image file is required", 400));
    }

    // Parse social links from FormData
    let socialLinks = {};
    if (req.body['socialLinks[linkedin]']) {
      socialLinks.linkedin = req.body['socialLinks[linkedin]'];
    }
    if (req.body['socialLinks[twitter]']) {
      socialLinks.twitter = req.body['socialLinks[twitter]'];
    }
    if (req.body['socialLinks[github]']) {
      socialLinks.github = req.body['socialLinks[github]'];
    }
    if (req.body['socialLinks[portfolio]']) {
      socialLinks.portfolio = req.body['socialLinks[portfolio]'];
    }

    let teamMember = await TeamModel.create({
      name,
      role,
      bio: bio || "",
      image: {
        url: imageData.url,
        public_id: imageData.key,
      },
      socialLinks: socialLinks,
      displayOrder: displayOrder ? parseInt(displayOrder) : 0,
      isActive: isActive !== undefined ? (isActive === 'true' || isActive === true) : true,
    });

    teamMember = await signTeamMemberMedia(teamMember);

    res.status(201).json({
      success: true,
      message: "Team member created successfully",
      teamMember,
    });
  } catch (error) {
    next(error);
  }
};

// Update Team Member (Admin only) - with file upload support
exports.updateTeamMember = async (req, res, next) => {
  try {
    const teamMember = await TeamModel.findById(req.params.id);

    if (!teamMember) {
      return next(new ErrorHandler("Team member not found", 404));
    }

    const updates = {
      name: req.body.name ?? teamMember.name,
      role: req.body.role ?? teamMember.role,
      bio: req.body.bio !== undefined ? req.body.bio : teamMember.bio,
      displayOrder: req.body.displayOrder !== undefined
        ? parseInt(req.body.displayOrder)
        : teamMember.displayOrder,
      isActive: req.body.isActive !== undefined
        ? (req.body.isActive === 'true' || req.body.isActive === true)
        : teamMember.isActive,
    };

    // Handle file upload if new image is provided
    const uploadedFiles = req.files || {};
    if (uploadedFiles.imageFile) {
      const uploadResult = await uploadToS3(uploadedFiles.imageFile, "team/images");
      updates.image = {
        url: uploadResult.url,
        public_id: uploadResult.key,
      };
    }

    // Parse social links from FormData
    if (req.body['socialLinks[linkedin]'] !== undefined || 
        req.body['socialLinks[twitter]'] !== undefined ||
        req.body['socialLinks[github]'] !== undefined ||
        req.body['socialLinks[portfolio]'] !== undefined) {
      updates.socialLinks = { ...teamMember.socialLinks };
      
      if (req.body['socialLinks[linkedin]'] !== undefined) {
        updates.socialLinks.linkedin = req.body['socialLinks[linkedin]'];
      }
      if (req.body['socialLinks[twitter]'] !== undefined) {
        updates.socialLinks.twitter = req.body['socialLinks[twitter]'];
      }
      if (req.body['socialLinks[github]'] !== undefined) {
        updates.socialLinks.github = req.body['socialLinks[github]'];
      }
      if (req.body['socialLinks[portfolio]'] !== undefined) {
        updates.socialLinks.portfolio = req.body['socialLinks[portfolio]'];
      }
    }

    const updatedMember = await TeamModel.findByIdAndUpdate(
      req.params.id,
      updates,
      {
        new: true,
        runValidators: true,
      }
    );

    const signedMember = await signTeamMemberMedia(updatedMember);

    res.status(200).json({
      success: true,
      message: "Team member updated successfully",
      teamMember: signedMember,
    });
  } catch (error) {
    next(error);
  }
};

// Delete Team Member (Admin only)
exports.deleteTeamMember = async (req, res, next) => {
  try {
    const teamMember = await TeamModel.findById(req.params.id);

    if (!teamMember) {
      return next(new ErrorHandler("Team member not found", 404));
    }

    teamMember.isActive = false;
    await teamMember.save();

    res.status(200).json({
      success: true,
      message: "Team member deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};


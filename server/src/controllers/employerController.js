const EmployerProfile = require("../models/EmployerProfile");
const Joi = require("joi");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");

const getMyProfile = async (req, res) => {
  try {
    const profile = await EmployerProfile.findOne({ user: req.user._id }).populate("user", "email isEmailVerified role");
    if (!profile) {
      return res.status(404).json({ message: "Employer profile not found" });
    }
    return res.status(200).json(profile);
  } catch (error) {
    console.error("Get My Employer Profile Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const updateProfileSchema = Joi.object({
  companyName: Joi.string().required(),
  companyWebsite: Joi.string().uri().allow("").optional(),
  industry: Joi.string().allow("").optional(),
  companySize: Joi.string().allow("").optional(),
  aboutCompany: Joi.string().allow("").optional(),
  companyLogoUrl: Joi.string().uri().allow("").optional()
});

const updateMyProfile = async (req, res) => {
  try {
    const { error, value } = updateProfileSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({ message: "Validation error", errors: error.details.map(d => d.message) });
    }

    const updatedProfile = await EmployerProfile.findOneAndUpdate(
      { user: req.user._id },
      { $set: value },
      { new: true, runValidators: true }
    );

    if (!updatedProfile) {
      return res.status(404).json({ message: "Employer profile not found" });
    }

    // Reset status to PENDING if they were REJECTED and they resubmitted their profile updates
    if (updatedProfile.verificationStatus === "REJECTED") {
      updatedProfile.verificationStatus = "PENDING";
      updatedProfile.rejectionReason = "";
      await updatedProfile.save();
    }

    return res.status(200).json(updatedProfile);
  } catch (error) {
    console.error("Update Employer Profile Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getVerificationStatus = async (req, res) => {
  try {
    const profile = await EmployerProfile.findOne({ user: req.user._id }).select("verificationStatus rejectionReason");
    if (!profile) {
      return res.status(404).json({ message: "Employer profile not found" });
    }
    return res.status(200).json({
      verificationStatus: profile.verificationStatus,
      rejectionReason: profile.rejectionReason
    });
  } catch (error) {
    console.error("Get Verification Status Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded. Please provide a JPG, PNG, or WebP file." });
    }

    const uploadStream = (buffer) => {
      return new Promise((resolve, reject) => {
        const cld_upload_stream = cloudinary.uploader.upload_stream(
          { folder: "internsync_logos", resource_type: "image" },
          (error, result) => {
            if (result) {
              resolve(result);
            } else {
              reject(error);
            }
          }
        );
        streamifier.createReadStream(buffer).pipe(cld_upload_stream);
      });
    };

    const result = await uploadStream(req.file.buffer);

    const updatedProfile = await EmployerProfile.findOneAndUpdate(
      { user: req.user._id },
      { $set: { companyLogoUrl: result.secure_url } },
      { new: true }
    );

    if (!updatedProfile) {
      return res.status(404).json({ message: "Employer profile not found" });
    }

    return res.status(200).json({ 
      message: "Logo uploaded successfully", 
      companyLogoUrl: result.secure_url 
    });

  } catch (error) {
    console.error("Upload Logo Error:", error);
    return res.status(500).json({ message: "Internal server error during upload." });
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  getVerificationStatus,
  uploadLogo
};

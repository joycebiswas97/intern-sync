const StudentProfile = require("../models/StudentProfile");
const EmployerProfile = require("../models/EmployerProfile");
const Application = require("../models/Application");
const Listing = require("../models/Listing");
const Joi = require("joi");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");

const getMyProfile = async (req, res) => {
  try {
    const profile = await StudentProfile.findOne({ user: req.user._id }).populate("user", "email isEmailVerified role");
    if (!profile) {
      return res.status(404).json({ message: "Student profile not found" });
    }
    return res.status(200).json(profile);
  } catch (error) {
    console.error("Get My Profile Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const updateProfileSchema = Joi.object({
  fullName: Joi.string().required(),
  headline: Joi.string().allow("").optional(),
  bio: Joi.string().allow("").optional(),
  phone: Joi.string().allow("").optional(),
  college: Joi.string().allow("").optional(),
  degree: Joi.string().allow("").optional(),
  graduationYear: Joi.number().integer().allow(null).optional(),
  skills: Joi.array().items(Joi.string().allow("")).optional(),
  resumeUrl: Joi.string().uri().allow("").optional(),
  profilePicUrl: Joi.string().uri().allow("").optional(),
  portfolioUrl: Joi.string().uri().allow("").optional(),
  linkedinUrl: Joi.string().uri().allow("").optional(),
  location: Joi.string().allow("").optional()
});

const updateMyProfile = async (req, res) => {
  try {
    const { error, value } = updateProfileSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: error.details.map(d => d.message) 
      });
    }

    const updatedProfile = await StudentProfile.findOneAndUpdate(
      { user: req.user._id },
      { $set: value },
      { new: true, runValidators: true }
    );

    if (!updatedProfile) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    return res.status(200).json(updatedProfile);
  } catch (error) {
    console.error("Update My Profile Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getStudentProfileById = async (req, res) => {
  try {
    const studentUserId = req.params.id; 
    const profile = await StudentProfile.findOne({ user: studentUserId }).populate("user", "email");
    
    if (!profile) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    let isFullyVisible = false;

    if (req.user) {
      if (req.user.role === "ADMIN" || req.user._id.toString() === studentUserId) {
        isFullyVisible = true;
      } else if (req.user.role === "EMPLOYER") {
        const employerProfile = await EmployerProfile.findOne({ user: req.user._id });
        if (employerProfile) {
          // Check if student applied to any listing of this employer
          const employerListings = await Listing.find({ employer: employerProfile._id }).select("_id");
          const listingIds = employerListings.map(l => l._id);
          
          const application = await Application.findOne({
            student: studentUserId,
            listing: { $in: listingIds }
          });
          
          if (application) {
            isFullyVisible = true;
          }
        }
      }
    }

    if (isFullyVisible) {
      return res.status(200).json(profile);
    } else {
      // Strip sensitive fields (phone, resumeUrl, portfolioUrl, linkedinUrl, exact email) for public view
      const limitedProfile = {
        _id: profile._id,
        user: { _id: profile.user._id }, 
        fullName: profile.fullName,
        headline: profile.headline,
        bio: profile.bio,
        college: profile.college,
        degree: profile.degree,
        graduationYear: profile.graduationYear,
        skills: profile.skills,
        location: profile.location,
        profilePicUrl: profile.profilePicUrl
      };
      return res.status(200).json(limitedProfile);
    }
  } catch (error) {
    console.error("Get Student Profile Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded. Please provide a PDF, DOC, or DOCX file." });
    }

    // Wrap Cloudinary upload in a Promise
    const uploadStream = (buffer) => {
      return new Promise((resolve, reject) => {
        const cld_upload_stream = cloudinary.uploader.upload_stream(
          { folder: "internsync_resumes", resource_type: "auto" },
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

    const updatedProfile = await StudentProfile.findOneAndUpdate(
      { user: req.user._id },
      { $set: { resumeUrl: result.secure_url } },
      { new: true }
    );

    if (!updatedProfile) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    return res.status(200).json({ 
      message: "Resume uploaded successfully", 
      resumeUrl: result.secure_url 
    });

  } catch (error) {
    console.error("Upload Resume Error:", error);
    return res.status(500).json({ message: "Internal server error during upload." });
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  getStudentProfileById,
  uploadResume
};

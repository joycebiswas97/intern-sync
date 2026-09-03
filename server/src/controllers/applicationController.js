const Application = require("../models/Application");
const Listing = require("../models/Listing");
const StudentProfile = require("../models/StudentProfile");
const EmployerProfile = require("../models/EmployerProfile");
const Joi = require("joi");

const applySchema = Joi.object({
  listingId: Joi.string().required(),
  coverLetter: Joi.string().allow("").optional()
});

const applyForListing = async (req, res) => {
  try {
    // 1. Require verified email
    if (!req.user.isEmailVerified) {
      return res.status(403).json({ message: "You must verify your email before applying." });
    }

    const { error, value } = applySchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: "Validation error", errors: error.details.map(d => d.message) });
    }

    const studentUserId = req.user._id;

    // 2. Fetch student profile and require uploaded resume
    const studentProfile = await StudentProfile.findOne({ user: studentUserId });
    if (!studentProfile || !studentProfile.resumeUrl) {
      return res.status(400).json({ message: "You must upload a resume to your profile before applying." });
    }

    // 3. Verify listing is ACTIVE
    const listing = await Listing.findById(value.listingId);
    if (!listing) {
      return res.status(404).json({ message: "Listing not found." });
    }
    if (listing.status !== "ACTIVE") {
      return res.status(400).json({ message: "This listing is no longer open for new applications." });
    }

    // 4. Handle duplicate apply as 409 Conflict
    const existingApp = await Application.findOne({ student: studentUserId, listing: value.listingId });
    if (existingApp) {
      return res.status(409).json({ message: "You have already applied to this listing." });
    }

    // 5. Create application and snapshot resume URL
    const application = new Application({
      student: studentUserId,
      listing: value.listingId,
      employer: listing.employer,
      coverLetter: value.coverLetter || "",
      resumeSnapshotUrl: studentProfile.resumeUrl,
      status: "APPLIED"
    });

    await application.save();

    return res.status(201).json(application);
  } catch (error) {
    console.error("Apply for Listing Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const withdrawApplication = async (req, res) => {
  try {
    const applicationId = req.params.id;
    const studentUserId = req.user._id;

    const application = await Application.findOne({ _id: applicationId, student: studentUserId });
    
    if (!application) {
      return res.status(404).json({ message: "Application not found or not owned by you." });
    }

    if (["OFFERED", "REJECTED", "WITHDRAWN"].includes(application.status)) {
      return res.status(400).json({ message: `Cannot withdraw an application that is already ${application.status}.` });
    }

    application.status = "WITHDRAWN";
    await application.save();

    return res.status(200).json({ message: "Application successfully withdrawn.", application });
  } catch (error) {
    console.error("Withdraw Application Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getApplicationById = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate("listing")
      .populate("student", "email");
      
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    let isAuthorized = false;
    
    if (req.user.role === "ADMIN") {
      isAuthorized = true;
    } else if (req.user.role === "STUDENT") {
      if (application.student._id.toString() === req.user._id.toString()) {
        isAuthorized = true;
      }
    } else if (req.user.role === "EMPLOYER") {
      const employerProfile = await EmployerProfile.findOne({ user: req.user._id });
      if (employerProfile && application.employer.toString() === employerProfile._id.toString()) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ message: "Not authorized to view this application." });
    }

    const appObj = application.toObject();
    const profile = await StudentProfile.findOne({ user: application.student._id });
    appObj.studentProfile = profile;

    return res.status(200).json(appObj);
  } catch (error) {
    console.error("Get Application By Id Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const updateApplicationStatusSchema = Joi.object({
  status: Joi.string().valid("IN_REVIEW", "INTERVIEWING", "OFFERED", "REJECTED").required()
});

const updateApplicationStatus = async (req, res) => {
  try {
    const { error, value } = updateApplicationStatusSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: "Validation error", errors: error.details.map(d => d.message) });
    }

    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    let isAuthorized = false;
    if (req.user.role === "ADMIN") {
      isAuthorized = true;
    } else if (req.user.role === "EMPLOYER") {
      const employerProfile = await EmployerProfile.findOne({ user: req.user._id });
      if (employerProfile && application.employer.toString() === employerProfile._id.toString()) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ message: "Not authorized to update this application." });
    }

    // Append to status history if it changed
    if (application.status !== value.status) {
      application.status = value.status;
      application.statusHistory.push({
        status: value.status,
        date: new Date()
      });
      await application.save();
    }

    return res.status(200).json(application);
  } catch (error) {
    console.error("Update Application Status Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  applyForListing,
  withdrawApplication,
  getApplicationById,
  updateApplicationStatus
};

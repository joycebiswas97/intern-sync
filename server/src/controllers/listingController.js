const Listing = require("../models/Listing");
const EmployerProfile = require("../models/EmployerProfile");
const SavedListing = require("../models/SavedListing");
const Joi = require("joi");

const listingSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().required(),
  type: Joi.string().valid("INTERNSHIP", "FULL_TIME", "CONTRACT").required(),
  locationType: Joi.string().valid("REMOTE", "ONSITE", "HYBRID").required(),
  location: Joi.string().allow("").optional(),
  stipend: Joi.object({
    amount: Joi.number().allow(null).optional(),
    currency: Joi.string().default("INR"),
    type: Joi.string().valid("FIXED", "RANGE", "UNPAID").default("UNPAID")
  }).optional(),
  skillsRequired: Joi.array().items(Joi.string()).default([]),
  experienceLevel: Joi.string().valid("BEGINNER", "INTERMEDIATE", "EXPERT").default("BEGINNER"),
  duration: Joi.string().allow("").optional(),
  deadline: Joi.date().required()
});

const createListing = async (req, res) => {
  try {
    const employerProfile = await EmployerProfile.findOne({ user: req.user._id });
    if (!employerProfile) {
      return res.status(404).json({ message: "Employer profile not found" });
    }

    if (employerProfile.verificationStatus !== "APPROVED") {
      return res.status(403).json({ message: "Only APPROVED employers can create listings. Please wait for admin approval." });
    }

    const { error, value } = listingSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({ message: "Validation error", errors: error.details.map(d => d.message) });
    }

    const newListing = new Listing({
      ...value,
      employer: employerProfile._id
    });

    await newListing.save();

    return res.status(201).json(newListing);
  } catch (error) {
    console.error("Create Listing Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getMyListings = async (req, res) => {
  try {
    const employerProfile = await EmployerProfile.findOne({ user: req.user._id });
    if (!employerProfile) {
      return res.status(404).json({ message: "Employer profile not found" });
    }

    const listings = await Listing.find({ employer: employerProfile._id }).sort({ createdAt: -1 });
    return res.status(200).json(listings);
  } catch (error) {
    console.error("Get My Listings Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getListingById = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).populate("employer", "companyName companyLogoUrl industry location companyWebsite");
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }
    return res.status(200).json(listing);
  } catch (error) {
    console.error("Get Listing By Id Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const updateListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    let isAuthorized = false;
    if (req.user.role === "ADMIN") {
      isAuthorized = true;
    } else if (req.user.role === "EMPLOYER") {
      const employerProfile = await EmployerProfile.findOne({ user: req.user._id });
      if (employerProfile && listing.employer.toString() === employerProfile._id.toString()) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ message: "Not authorized to edit this listing" });
    }

    const { error, value } = listingSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({ message: "Validation error", errors: error.details.map(d => d.message) });
    }

    Object.assign(listing, value);
    await listing.save();

    return res.status(200).json(listing);
  } catch (error) {
    console.error("Update Listing Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const deleteListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    let isAuthorized = false;
    if (req.user.role === "ADMIN") {
      isAuthorized = true;
    } else if (req.user.role === "EMPLOYER") {
      const employerProfile = await EmployerProfile.findOne({ user: req.user._id });
      if (employerProfile && listing.employer.toString() === employerProfile._id.toString()) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ message: "Not authorized to delete this listing" });
    }

    await Listing.deleteOne({ _id: req.params.id });
    return res.status(200).json({ message: "Listing deleted successfully" });
  } catch (error) {
    console.error("Delete Listing Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const closeListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    let isAuthorized = false;
    if (req.user.role === "ADMIN") {
      isAuthorized = true;
    } else if (req.user.role === "EMPLOYER") {
      const employerProfile = await EmployerProfile.findOne({ user: req.user._id });
      if (employerProfile && listing.employer.toString() === employerProfile._id.toString()) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ message: "Not authorized to close this listing" });
    }

    listing.status = "CLOSED";
    await listing.save();

    return res.status(200).json(listing);
  } catch (error) {
    console.error("Close Listing Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getAllListings = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, type, locationType, experienceLevel, skills } = req.query;

    const query = { status: "OPEN" }; // Only show OPEN listings by default

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    // Exact matches
    if (type) query.type = type;
    if (locationType) query.locationType = locationType;
    if (experienceLevel) query.experienceLevel = experienceLevel;

    // Skills (array intersection)
    if (skills) {
      const skillsArray = skills.split(',').map(s => s.trim());
      query.skillsRequired = { $in: skillsArray };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // If searching, sort by text score, else by newest
    const sort = search ? { score: { $meta: "textScore" } } : { createdAt: -1 };

    const listings = await Listing.find(query)
      .populate("employer", "companyName companyLogoUrl location") 
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Listing.countDocuments(query);

    return res.status(200).json({
      listings,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error("Get All Listings Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const saveListing = async (req, res) => {
  try {
    const listingId = req.params.id;
    const studentUserId = req.user._id;

    // Verify listing exists
    const listing = await Listing.findById(listingId);
    if (!listing) return res.status(404).json({ message: "Listing not found" });

    // Check if already saved
    const existing = await SavedListing.findOne({ student: studentUserId, listing: listingId });
    if (existing) return res.status(400).json({ message: "Listing already saved" });

    const savedListing = new SavedListing({
      student: studentUserId,
      listing: listingId
    });
    await savedListing.save();

    return res.status(201).json({ message: "Listing saved successfully" });
  } catch (error) {
    console.error("Save Listing Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const unsaveListing = async (req, res) => {
  try {
    const listingId = req.params.id;
    const studentUserId = req.user._id;

    const deleted = await SavedListing.findOneAndDelete({ student: studentUserId, listing: listingId });
    if (!deleted) {
      return res.status(404).json({ message: "Saved listing not found" });
    }

    return res.status(200).json({ message: "Listing unsaved successfully" });
  } catch (error) {
    console.error("Unsave Listing Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  createListing,
  getMyListings,
  getListingById,
  updateListing,
  deleteListing,
  closeListing,
  getAllListings,
  saveListing,
  unsaveListing
};

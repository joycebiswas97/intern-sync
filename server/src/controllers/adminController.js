const User = require("../models/User");
const EmployerProfile = require("../models/EmployerProfile");
const Listing = require("../models/Listing");
const Application = require("../models/Application");

// --- Employer Verification ---
const getPendingEmployers = async (req, res) => {
  try {
    const pendingEmployers = await EmployerProfile.find({ verificationStatus: "PENDING" })
      .populate("user", "email createdAt");
    return res.status(200).json(pendingEmployers);
  } catch (error) {
    console.error("Get Pending Employers Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const verifyEmployer = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body; // status: APPROVED or REJECTED

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({ message: "Status must be APPROVED or REJECTED" });
    }

    const employer = await EmployerProfile.findById(req.params.id);
    if (!employer) return res.status(404).json({ message: "Employer profile not found" });

    employer.verificationStatus = status;
    if (status === "REJECTED") {
      employer.rejectionReason = rejectionReason || "Your profile does not meet our guidelines.";
    } else {
      employer.rejectionReason = ""; // Clear reason if approved
    }

    await employer.save();
    return res.status(200).json(employer);
  } catch (error) {
    console.error("Verify Employer Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// --- Listing Review ---
const getPendingListings = async (req, res) => {
  try {
    const pendingListings = await Listing.find({ status: "PENDING_REVIEW" })
      .populate("employer", "companyName companyWebsite");
    return res.status(200).json(pendingListings);
  } catch (error) {
    console.error("Get Pending Listings Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const reviewListing = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body; // status: ACTIVE or REJECTED

    if (!["ACTIVE", "REJECTED"].includes(status)) {
      return res.status(400).json({ message: "Status must be ACTIVE or REJECTED" });
    }

    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: "Listing not found" });

    listing.status = status;
    if (status === "REJECTED") {
      listing.rejectionReason = rejectionReason || "Your listing does not meet our guidelines.";
    } else {
      listing.rejectionReason = "";
    }

    await listing.save();
    return res.status(200).json(listing);
  } catch (error) {
    console.error("Review Listing Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// --- User Management ---
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-passwordHash").sort({ createdAt: -1 });
    return res.status(200).json(users);
  } catch (error) {
    console.error("Get All Users Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const toggleUserBan = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role === "ADMIN") {
      return res.status(403).json({ message: "Cannot ban an admin." });
    }

    user.isBanned = !user.isBanned;
    await user.save();

    return res.status(200).json({ message: `User has been ${user.isBanned ? 'banned' : 'unbanned'}.`, isBanned: user.isBanned });
  } catch (error) {
    console.error("Toggle User Ban Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// --- Analytics ---
const getAnalytics = async (req, res) => {
  try {
    // 1. Summary Counts
    const totalStudents = await User.countDocuments({ role: "STUDENT" });
    const totalEmployers = await User.countDocuments({ role: "EMPLOYER" });
    const totalListings = await Listing.countDocuments();
    const totalApplications = await Application.countDocuments();

    const summary = {
      totalStudents,
      totalEmployers,
      totalListings,
      totalApplications
    };

    // 2. Signups Over Time (last 30 days, grouped by day)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const signupsOverTime = await User.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 3. Applications by Status
    const applicationsByStatus = await Application.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    // 4. Top 5 Listings (by number of applications)
    const topListings = await Application.aggregate([
      {
        $group: {
          _id: "$listing",
          applicationCount: { $sum: 1 }
        }
      },
      { $sort: { applicationCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "listings",
          localField: "_id",
          foreignField: "_id",
          as: "listingDetails"
        }
      },
      { $unwind: "$listingDetails" },
      {
        $lookup: {
          from: "employerprofiles",
          localField: "listingDetails.employer",
          foreignField: "_id",
          as: "employerDetails"
        }
      },
      { $unwind: { path: "$employerDetails", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          listingId: "$_id",
          title: "$listingDetails.title",
          companyName: "$employerDetails.companyName",
          applicationCount: 1,
          _id: 0
        }
      }
    ]);

    return res.status(200).json({
      summary,
      signupsOverTime,
      applicationsByStatus,
      topListings
    });
  } catch (error) {
    console.error("Get Analytics Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  getPendingEmployers,
  verifyEmployer,
  getPendingListings,
  reviewListing,
  getAllUsers,
  toggleUserBan,
  getAnalytics
};

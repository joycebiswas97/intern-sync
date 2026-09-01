const mongoose = require("mongoose");

const employerProfileSchema = new mongoose.Schema(
  {
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true, 
      unique: true 
    },
    companyName: { 
      type: String, 
      required: true 
    },
    companyLogoUrl: {
      type: String
    },
    companyWebsite: {
      type: String
    },
    industry: {
      type: String
    },
    companySize: {
      type: String
    },
    aboutCompany: {
      type: String
    },
    verificationStatus: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },
    rejectionReason: {
      type: String
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("EmployerProfile", employerProfileSchema);

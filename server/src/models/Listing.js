const mongoose = require("mongoose");

const listingSchema = new mongoose.Schema(
  {
    employer: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "EmployerProfile", 
      required: true 
    },
    title: { 
      type: String, 
      required: true 
    },
    type: { 
      type: String, 
      enum: ["INTERNSHIP", "JOB"], 
      required: true 
    },
    description: { 
      type: String, 
      required: true 
    },
    responsibilities: [{
      type: String
    }],
    skillsRequired: [{
      type: String
    }],
    workMode: { 
      type: String, 
      enum: ["REMOTE", "ONSITE", "HYBRID"], 
      required: true 
    },
    location: {
      type: String
    },
    stipendOrSalaryMin: {
      type: Number
    },
    stipendOrSalaryMax: {
      type: Number
    },
    currency: { 
      type: String, 
      default: "INR" 
    },
    durationMonths: {
      type: Number
    },
    openings: { 
      type: Number, 
      default: 1 
    },
    applicationDeadline: {
      type: Date
    },
    perks: [{
      type: String
    }],
    status: {
      type: String,
      enum: ["DRAFT", "PENDING_REVIEW", "ACTIVE", "REJECTED", "CLOSED", "EXPIRED"],
      default: "PENDING_REVIEW",
    },
    rejectionReason: {
      type: String
    },
  },
  { timestamps: true }
);

// Text index for search; compound index for common filters
listingSchema.index({ title: "text", description: "text" });
listingSchema.index({ status: 1, type: 1, workMode: 1 });

module.exports = mongoose.model("Listing", listingSchema);

const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    listing: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Listing", 
      required: true 
    },
    student: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    coverLetter: {
      type: String
    },
    resumeUrlSnapshot: {
      type: String // resume used at time of application
    },
    status: {
      type: String,
      enum: ["APPLIED", "SHORTLISTED", "INTERVIEW", "OFFERED", "REJECTED", "WITHDRAWN"],
      default: "APPLIED",
    },
    statusHistory: [{
      status: {
        type: String
      },
      changedAt: { 
        type: Date, 
        default: Date.now 
      },
      changedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User" 
      },
    }],
    appliedAt: { 
      type: Date, 
      default: Date.now 
    },
  },
  { timestamps: true }
);

// One application per student per listing
applicationSchema.index({ listing: 1, student: 1 }, { unique: true });

module.exports = mongoose.model("Application", applicationSchema);

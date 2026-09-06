const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    reporter: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    listing: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Listing" 
    },
    reportedUser: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User" 
    },
    reason: { 
      type: String, 
      required: true 
    },
    details: {
      type: String
    },
    status: { 
      type: String, 
      enum: ["OPEN", "RESOLVED", "DISMISSED"], 
      default: "OPEN" 
    },
    resolutionNote: {
      type: String
    },
    resolvedAt: {
      type: Date
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Report", reportSchema);

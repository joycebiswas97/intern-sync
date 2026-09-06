const mongoose = require("mongoose");

const studentProfileSchema = new mongoose.Schema(
  {
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true, 
      unique: true 
    },
    fullName: { 
      type: String, 
      required: true 
    },
    headline: {
      type: String
    },
    bio: {
      type: String
    },
    phone: {
      type: String
    },
    college: {
      type: String
    },
    degree: {
      type: String
    },
    graduationYear: {
      type: Number
    },
    skills: [{
      type: String
    }],
    resumeUrl: {
      type: String
    },
    profilePicUrl: {
      type: String
    },
    portfolioUrl: {
      type: String
    },
    linkedinUrl: {
      type: String
    },
    location: {
      type: String
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StudentProfile", studentProfileSchema);

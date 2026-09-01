const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: { 
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true 
    },
    passwordHash: {
      type: String,
      required: true
    },
    role: { 
      type: String, 
      enum: ["STUDENT", "EMPLOYER", "ADMIN"], 
      required: true 
    },
    isEmailVerified: { 
      type: Boolean, 
      default: false 
    },
    isBanned: { 
      type: Boolean, 
      default: false 
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);

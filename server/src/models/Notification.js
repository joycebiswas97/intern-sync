const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    type: { 
      type: String, 
      required: true 
    }, // e.g. APPLICATION_STATUS_CHANGED, LISTING_APPROVED
    title: { 
      type: String, 
      required: true 
    },
    body: {
      type: String
    },
    isRead: { 
      type: Boolean, 
      default: false 
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);

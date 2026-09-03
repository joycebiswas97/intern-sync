const Notification = require("../models/Notification");

const createNotification = async (userId, type, title, body) => {
  try {
    const notification = new Notification({
      user: userId,
      type,
      title,
      body
    });
    await notification.save();
    return notification;
  } catch (error) {
    console.error("Create Notification Error:", error);
    // Suppress error so it doesn't break main workflows (like applying/updating)
  }
};

module.exports = {
  createNotification
};

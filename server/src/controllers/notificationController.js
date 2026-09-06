const Notification = require("../models/Notification");

const getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    return res.status(200).json(notifications);
  } catch (error) {
    console.error("Get Notifications Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({ _id: req.params.id, user: req.user._id });
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    notification.isRead = true;
    await notification.save();

    return res.status(200).json(notification);
  } catch (error) {
    console.error("Mark Notification Read Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );
    return res.status(200).json({ message: "All notifications marked as read." });
  } catch (error) {
    console.error("Mark All Notifications Read Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  getMyNotifications,
  markAsRead,
  markAllAsRead
};

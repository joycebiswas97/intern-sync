const express = require('express');
const router = express.Router();
const { getMyNotifications, markAsRead, markAllAsRead } = require('../controllers/notificationController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth); // All notification routes require authentication

router.get('/', getMyNotifications);
router.patch('/mark-all-read', markAllAsRead);
router.patch('/:id/read', markAsRead);

module.exports = router;

const express = require('express');
const router = express.Router();
const { 
  register, 
  verifyEmail, 
  login, 
  refresh, 
  logout, 
  forgotPassword, 
  resetPassword,
  getMe
} = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

router.post('/register', register);
router.post('/verify-email', verifyEmail);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

router.get('/me', requireAuth, getMe);

module.exports = router;

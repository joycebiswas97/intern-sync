const express = require('express');
const router = express.Router();
const { getMyProfile, updateMyProfile, getVerificationStatus, uploadLogo } = require('../controllers/employerController');
const { requireAuth, requireRole } = require('../middleware/auth');
const uploadImage = require('../middleware/uploadImage');

const handleImageUpload = (req, res, next) => {
  const singleUpload = uploadImage.single('logo');
  singleUpload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

router.get('/me/profile', requireAuth, requireRole('EMPLOYER'), getMyProfile);
router.put('/me/profile', requireAuth, requireRole('EMPLOYER'), updateMyProfile);
router.get('/me/verification-status', requireAuth, requireRole('EMPLOYER'), getVerificationStatus);
router.post('/me/logo', requireAuth, requireRole('EMPLOYER'), handleImageUpload, uploadLogo);

module.exports = router;

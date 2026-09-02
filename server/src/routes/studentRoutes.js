const express = require('express');
const router = express.Router();
const { getMyProfile, updateMyProfile, getStudentProfileById, uploadResume } = require('../controllers/studentController');
const { requireAuth, requireRole, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Wrapper to catch multer errors nicely
const handleResumeUpload = (req, res, next) => {
  const singleUpload = upload.single('resume');
  singleUpload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

router.get('/me/profile', requireAuth, requireRole('STUDENT'), getMyProfile);
router.put('/me/profile', requireAuth, requireRole('STUDENT'), updateMyProfile);
router.post('/me/resume', requireAuth, requireRole('STUDENT'), handleResumeUpload, uploadResume);
router.get('/:id/profile', optionalAuth, getStudentProfileById);

module.exports = router;

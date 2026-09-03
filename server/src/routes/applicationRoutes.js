const express = require('express');
const router = express.Router();
const { 
  applyForListing, 
  withdrawApplication, 
  getApplicationById, 
  updateApplicationStatus 
} = require('../controllers/applicationController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.post('/', requireAuth, requireRole('STUDENT'), applyForListing);
router.post('/:id/withdraw', requireAuth, requireRole('STUDENT'), withdrawApplication);
router.get('/:id', requireAuth, getApplicationById); // Controller handles checking employer vs student ownership
router.patch('/:id/status', requireAuth, updateApplicationStatus); // Controller handles checking employer ownership

module.exports = router;

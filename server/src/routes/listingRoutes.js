const express = require('express');
const router = express.Router();
const { 
  createListing, 
  getMyListings, 
  getListingById, 
  updateListing, 
  deleteListing, 
  closeListing,
  getAllListings,
  saveListing,
  unsaveListing,
  getListingApplications
} = require('../controllers/listingController');
const { requireAuth, requireRole, optionalAuth } = require('../middleware/auth');

const rateLimit = require('express-rate-limit');

const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per minute for searches
  message: { message: "Too many search requests, please try again later." }
});

// Note: Order matters. Put explicit non-id routes before /:id routes
router.get('/', optionalAuth, searchLimiter, getAllListings);
router.get('/mine', requireAuth, requireRole('EMPLOYER'), getMyListings);

router.post('/', requireAuth, requireRole('EMPLOYER'), createListing);
router.get('/:id', optionalAuth, getListingById);
router.get('/:id/applications', requireAuth, getListingApplications); // Auth check handled in controller
router.put('/:id', requireAuth, updateListing); // Authorization checks (admin vs owner) are handled in the controller
router.delete('/:id', requireAuth, deleteListing);
router.patch('/:id/close', requireAuth, closeListing);

router.post('/:id/save', requireAuth, requireRole('STUDENT'), saveListing);
router.delete('/:id/save', requireAuth, requireRole('STUDENT'), unsaveListing);

module.exports = router;

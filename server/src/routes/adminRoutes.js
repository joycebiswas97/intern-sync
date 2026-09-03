const express = require('express');
const router = express.Router();
const { 
  getPendingEmployers, 
  verifyEmployer, 
  getPendingListings, 
  reviewListing, 
  getAllUsers, 
  toggleUserBan,
  getAnalytics
} = require('../controllers/adminController');
const { requireAuth, requireRole } = require('../middleware/auth');

// Protect all admin routes with isAdmin equivalent middleware
router.use(requireAuth, requireRole('ADMIN'));

// Employers
router.get('/employers/pending', getPendingEmployers);
router.patch('/employers/:id/verify', verifyEmployer);

// Listings
router.get('/listings/pending', getPendingListings);
router.patch('/listings/:id/review', reviewListing);

// Users
router.get('/users', getAllUsers);
router.patch('/users/:id/ban', toggleUserBan);

// Analytics
router.get('/analytics', getAnalytics);

module.exports = router;

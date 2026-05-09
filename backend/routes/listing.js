const express = require('express');
const router = express.Router();
const listingController = require('../controllers/listingController');
const { protect, restrictTo } = require('../middleware/auth');
const upload = require('../middleware/upload');

// ── IMPORTANT: specific routes must come before /:id ──────

// My listings (protected, specific path first)
router.get('/my/listings', protect, listingController.getMyListings);

// Public browse
router.get('/', listingController.getListings);

// Create listing (seller only)
router.post(
  '/',
  protect,
  restrictTo('seller', 'admin'),
  upload.single('image'),
  listingController.createListing
);

// Single listing by id (public)
router.get('/:id', listingController.getListing);

// Update / delete (seller only)
router.put('/:id', protect, restrictTo('seller', 'admin'), upload.single('image'), listingController.updateListing);
router.patch('/:id/status', protect, restrictTo('seller', 'admin'), listingController.updateStatus);
router.delete('/:id', protect, restrictTo('seller', 'admin'), listingController.deleteListing);

module.exports = router;
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/auth');

// Protected routes
router.put('/me', protect, userController.updateProfile);
router.put('/me/upgrade-to-seller', protect, userController.upgradeToSeller);

// Public routes
router.get('/:id', userController.getUserProfile);

module.exports = router;
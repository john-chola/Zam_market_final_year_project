const express = require('express');
const router  = express.Router();
const { getTrustChain, rateSeller, verifySellerChain, checkConversationWithSeller } = require('../controllers/trustController');
const { protect } = require('../middleware/auth');

// Specific routes FIRST (before wildcard)
router.get('/check-conversation/:sellerId', protect, checkConversationWithSeller); // check if buyer has conversation with seller
router.post('/rate',                      protect, rateSeller);    // buyer only
router.post('/verify-chain',              protect, verifySellerChain);

// Wildcard routes LAST
router.get('/:sellerId',                  getTrustChain);          // public

module.exports = router;

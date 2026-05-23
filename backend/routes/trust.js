const express = require('express');
const router  = express.Router();
const { getTrustChain, rateSeller, verifySellerChain, checkConversationWithSeller } = require('../controllers/trustController');
const { protect } = require('../middleware/auth');

router.get('/:sellerId',                  getTrustChain);          // public
router.get('/check-conversation/:sellerId', protect, checkConversationWithSeller); // check if buyer has conversation with seller
router.post('/rate',                      protect, rateSeller);    // buyer only
router.post('/verify-chain',              protect, verifySellerChain);

module.exports = router;

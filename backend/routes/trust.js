const express = require('express');
const router  = express.Router();
const { getTrustChain, rateSeller, verifySellerChain } = require('../controllers/trustController');
const { protect } = require('../middleware/auth');

router.get('/:sellerId',       getTrustChain);          // public
router.post('/rate',           protect, rateSeller);    // buyer only
router.post('/verify-chain',   protect, verifySellerChain);

module.exports = router;
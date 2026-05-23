const TrustChain = require('../models/TrustChain');
const User       = require('../models/User');
const Listing    = require('../models/Listing');
const Conversation = require('../models/Conversation');
const { createBlock, verifyChain, calculateScore } = require('../utils/blockchain');

// ── Internal: add event to a seller's chain ───────────────
const addTrustEvent = async (sellerId, eventType, eventData = {}) => {
  try {
    const lastBlock  = await TrustChain.findOne({ seller: sellerId }).sort({ blockIndex: -1 });
    const previousHash = lastBlock ? lastBlock.hash : '0'.repeat(64);
    const blockIndex   = lastBlock ? lastBlock.blockIndex + 1 : 0;

    const block = createBlock(
      { type: eventType, sellerId: sellerId.toString(), data: eventData },
      previousHash
    );

    await TrustChain.create({
      seller: sellerId, blockIndex,
      timestamp: block.timestamp, event: block.event,
      previousHash: block.previousHash, hash: block.hash,
    });

    const allBlocks = await TrustChain.find({ seller: sellerId }).sort({ blockIndex: 1 });
    const newScore  = calculateScore(allBlocks);

    await User.findByIdAndUpdate(sellerId, {
      'trustScore.score':     newScore,
      'trustScore.chainHash': block.hash,
    });

    return { success: true, score: newScore, block };
  } catch (err) {
    console.error('addTrustEvent error:', err.message);
    return { success: false };
  }
};

// ── GET /api/trust/:sellerId ──────────────────────────────
const getTrustChain = async (req, res, next) => {
  try {
    const { sellerId } = req.params;
    if (!sellerId || sellerId === 'undefined') {
      return res.status(400).json({ status: 'error', message: 'Invalid seller ID' });
    }

    const seller = await User.findById(sellerId)
      .select('name trustScore sellerProfile neighbourhood');
    if (!seller) return res.status(404).json({ status: 'error', message: 'Seller not found' });

    const blocks  = await TrustChain.find({ seller: sellerId }).sort({ blockIndex: 1 });
    const isValid = verifyChain(blocks);

    // Auto-backfill: if seller has listings but no trust events, create them now
    if (blocks.length === 0) {
      const listings = await Listing.find({ seller: sellerId });
      for (const listing of listings) {
        await addTrustEvent(sellerId, 'LISTING_CREATED', {
          listingId: listing._id, title: listing.title,
        });
      }
      // Reload after backfill
      if (listings.length > 0) {
        const freshBlocks = await TrustChain.find({ seller: sellerId }).sort({ blockIndex: 1 });
        const freshSeller = await User.findById(sellerId).select('name trustScore sellerProfile neighbourhood');
        return res.json({
          status: 'success',
          seller: { id: freshSeller._id, name: freshSeller.name,
            neighbourhood: freshSeller.neighbourhood,
            trustScore: freshSeller.trustScore, isVerified: freshSeller.sellerProfile?.isVerified },
          chain: { blocks: freshBlocks, length: freshBlocks.length,
            isValid: verifyChain(freshBlocks), score: freshSeller.trustScore?.score || 50 },
        });
      }
    }

    res.json({
      status: 'success',
      seller: { id: seller._id, name: seller.name, neighbourhood: seller.neighbourhood,
        trustScore: seller.trustScore, isVerified: seller.sellerProfile?.isVerified },
      chain: { blocks, length: blocks.length, isValid, score: seller.trustScore?.score || 50 },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/trust/check-conversation/:sellerId ────────────
// Check if current user (buyer) has an active conversation with seller
const checkConversationWithSeller = async (req, res, next) => {
  try {
    const { sellerId } = req.params;
    const buyerId = req.user._id;

    if (!sellerId || sellerId === 'undefined') {
      return res.status(400).json({ status: 'error', message: 'Invalid seller ID' });
    }

    // Prevent self-check
    if (buyerId.toString() === sellerId) {
      return res.status(400).json({ status: 'error', message: 'Cannot check conversation with yourself' });
    }

    // Find any conversation where current user is buyer and seller is the target
    const conversation = await Conversation.findOne({
      buyer: buyerId,
      seller: sellerId,
    });

    const hasConversation = !!conversation;

    res.json({
      status: 'success',
      hasConversation,
      message: hasConversation 
        ? 'You can rate this seller' 
        : 'You must complete a conversation to rate this seller',
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/trust/rate ──────────────────────────────────
const rateSeller = async (req, res, next) => {
  try {
    const { sellerId, rating, conversationId } = req.body;
    const buyerId = req.user._id;

    console.log('rateSeller called — sellerId:', sellerId, 'rating:', rating, 'buyerId:', buyerId);

    if (!sellerId || sellerId === 'undefined') {
      return res.status(400).json({ status: 'error', message: 'sellerId is required' });
    }
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ status: 'error', message: 'Rating must be 1–5' });
    }

    // Prevent rating yourself
    if (buyerId.toString() === sellerId) {
      return res.status(400).json({ status: 'error', message: 'You cannot rate yourself' });
    }

    // ── NEW: Check if buyer has a conversation with this seller ──
    const conversation = await Conversation.findOne({
      buyer: buyerId,
      seller: sellerId,
    });

    if (!conversation) {
      return res.status(403).json({
        status: 'error',
        message: 'You must have an active conversation with this seller to rate them',
      });
    }

    // ── NEW: Check if already rated via this conversation ──
    // (prevent duplicate ratings from same conversation)
    const existingRating = await TrustChain.findOne({
      seller: sellerId,
      'event.type': /^BUYER_RATING/,
      'event.data.buyerId': buyerId,
      'event.data.conversationId': conversation._id,
    });

    if (existingRating) {
      return res.status(400).json({
        status: 'error',
        message: 'You have already rated this seller for this conversation',
      });
    }

    const eventType = `BUYER_RATING_${rating}`;
    const result = await addTrustEvent(sellerId, eventType, {
      rating, buyerId, conversationId: conversation._id,
    });

    if (!result.success) {
      return res.status(500).json({ status: 'error', message: 'Failed to record rating' });
    }

    // Update seller's average rating
    const seller = await User.findById(sellerId);
    if (seller) {
      const oldTotal  = (seller.sellerProfile?.rating || 0) * (seller.sellerProfile?.ratingCount || 0);
      const newCount  = (seller.sellerProfile?.ratingCount || 0) + 1;
      const newRating = (oldTotal + rating) / newCount;
      await User.findByIdAndUpdate(sellerId, {
        'sellerProfile.rating':      Math.round(newRating * 10) / 10,
        'sellerProfile.ratingCount': newCount,
      });
    }

    res.json({ status: 'success', newScore: result.score });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/trust/verify-chain ──────────────────────────
const verifySellerChain = async (req, res, next) => {
  try {
    const { sellerId } = req.body;
    const blocks  = await TrustChain.find({ seller: sellerId }).sort({ blockIndex: 1 });
    const isValid = verifyChain(blocks);
    res.json({ status: 'success', isValid, blockCount: blocks.length });
  } catch (err) { next(err); }
};

module.exports = { addTrustEvent, getTrustChain, rateSeller, verifySellerChain, checkConversationWithSeller };

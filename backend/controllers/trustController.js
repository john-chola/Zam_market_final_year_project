const TrustChain    = require('../models/TrustChain');
const User          = require('../models/User');
const Listing       = require('../models/Listing');
const Conversation  = require('../models/Conversation');
const { createBlock, verifyChain, calculateScore } = require('../utils/blockchain');

// ── Internal: add event to a seller's chain ───────────────
const addTrustEvent = async (sellerId, eventType, eventData = {}) => {
  try {
    const lastBlock    = await TrustChain.findOne({ seller: sellerId }).sort({ blockIndex: -1 });
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
      .select('name trustScore sellerProfile neighbourhood role');
    if (!seller) {
      return res.status(404).json({ status: 'error', message: 'Seller not found' });
    }

    if (seller.role === 'buyer') {
      return res.status(400).json({
        status: 'error',
        message: 'Trust scores are only available for sellers',
      });
    }

    const blocks  = await TrustChain.find({ seller: sellerId }).sort({ blockIndex: 1 });
    const isValid = verifyChain(blocks);

    // Auto-backfill existing listings for sellers who registered before Sprint 3
    if (blocks.length === 0 && seller.role === 'seller') {
      const listings = await Listing.find({ seller: sellerId });
      for (const listing of listings) {
        await addTrustEvent(sellerId, 'LISTING_CREATED', {
          listingId: listing._id,
          title: listing.title,
        });
      }
      if (listings.length > 0) {
        const freshBlocks = await TrustChain.find({ seller: sellerId }).sort({ blockIndex: 1 });
        const freshSeller = await User.findById(sellerId)
          .select('name trustScore sellerProfile neighbourhood role');
        return res.json({
          status: 'success',
          seller: {
            id: freshSeller._id, name: freshSeller.name,
            neighbourhood: freshSeller.neighbourhood,
            trustScore: freshSeller.trustScore,
            isVerified: freshSeller.sellerProfile?.isVerified,
            role: freshSeller.role,
          },
          chain: {
            blocks: freshBlocks, length: freshBlocks.length,
            isValid: verifyChain(freshBlocks),
            score: freshSeller.trustScore?.score || 50,
          },
          canRate: false,
        });
      }
    }

    // Check if requesting user has had a conversation with this seller
    // Used by frontend to show/hide the rating widget
    let canRate = false;
    if (req.headers.authorization) {
      try {
        const jwt     = require('jsonwebtoken');
        const token   = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const buyerId = decoded.id;

        // Can rate if:
        // 1. Not rating yourself
        // 2. You are a buyer (or the seller is a seller)
        // 3. A conversation exists between you and this seller
        if (buyerId !== sellerId) {
          const conversation = await Conversation.findOne({
            buyer: buyerId,
            seller: sellerId,
          });
          canRate = !!conversation;
        }
      } catch {
        canRate = false;
      }
    }

    res.json({
      status: 'success',
      seller: {
        id: seller._id, name: seller.name,
        neighbourhood: seller.neighbourhood,
        trustScore: seller.trustScore,
        isVerified: seller.sellerProfile?.isVerified,
        role: seller.role,
      },
      chain: { blocks, length: blocks.length, isValid, score: seller.trustScore?.score || 50 },
      canRate, // ← tells frontend whether to show rating widget
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/trust/check-conversation/:sellerId ────────────
// Legacy endpoint for explicit conversation checking (if needed)
const checkConversationWithSeller = async (req, res, next) => {
  try {
    const { sellerId } = req.params;
    const buyerId = req.user._id;

    if (!sellerId || sellerId === 'undefined') {
      return res.status(400).json({ status: 'error', message: 'Invalid seller ID' });
    }

    if (buyerId.toString() === sellerId.toString()) {
      return res.status(400).json({ status: 'error', message: 'Cannot check conversation with yourself' });
    }

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

// ── POST /api/trust/rate ──────────���───────────────────────
const rateSeller = async (req, res, next) => {
  try {
    const { sellerId, rating, conversationId } = req.body;

    console.log('rateSeller — sellerId:', sellerId, 'rating:', rating, 'buyer:', req.user._id);

    if (!sellerId || sellerId === 'undefined') {
      return res.status(400).json({ status: 'error', message: 'sellerId is required' });
    }
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ status: 'error', message: 'Rating must be between 1 and 5' });
    }

    // Prevent self-rating
    if (req.user._id.toString() === sellerId.toString()) {
      return res.status(400).json({ status: 'error', message: 'You cannot rate yourself' });
    }

    // VALIDATION: buyer must have had a conversation with this seller
    const conversation = await Conversation.findOne({
      buyer: req.user._id,
      seller: sellerId,
    });

    if (!conversation) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only rate sellers you have had a conversation with',
      });
    }

    // Prevent duplicate ratings per conversation
    const alreadyRated = await TrustChain.findOne({
      seller: sellerId,
      'event.data.buyerId': req.user._id.toString(),
      'event.type': { $regex: /^BUYER_RATING/ },
    });

    if (alreadyRated) {
      return res.status(409).json({
        status: 'error',
        message: 'You have already rated this seller',
      });
    }

    const eventType = `BUYER_RATING_${rating}`;
    const result    = await addTrustEvent(sellerId, eventType, {
      rating,
      buyerId:        req.user._id.toString(),
      conversationId: conversation._id.toString(),
    });

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

    res.json({ status: 'success', newScore: result.score, message: 'Rating recorded on blockchain' });
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
  } catch (err) {
    next(err);
  }
};

module.exports = { addTrustEvent, getTrustChain, rateSeller, verifySellerChain, checkConversationWithSeller };

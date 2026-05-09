const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Listing = require('../models/Listing');

// ── POST /api/chat/conversations ───────────────────────────
// Start or retrieve a conversation for a listing
exports.startConversation = async (req, res, next) => {
  try {
    const { listingId } = req.body;
    if (!listingId) return res.status(400).json({ status: 'error', message: 'listingId is required' });

    const listing = await Listing.findById(listingId).populate('seller', 'name neighbourhood');
    if (!listing) return res.status(404).json({ status: 'error', message: 'Listing not found' });

    // Prevent seller messaging their own listing
    if (listing.seller._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ status: 'error', message: 'You cannot message your own listing' });
    }

    // Find existing or create new conversation
    let conversation = await Conversation.findOne({
      listing: listingId,
      buyer: req.user._id,
    })
      .populate('listing', 'title image neighbourhood pricePerBag unit')
      .populate('buyer', 'name neighbourhood')
      .populate('seller', 'name neighbourhood trustScore');

    if (!conversation) {
      conversation = await Conversation.create({
        listing: listingId,
        buyer: req.user._id,
        seller: listing.seller._id,
      });
      await conversation.populate([
        { path: 'listing', select: 'title image neighbourhood pricePerBag unit' },
        { path: 'buyer', select: 'name neighbourhood' },
        { path: 'seller', select: 'name neighbourhood trustScore' },
      ]);
    }

    res.status(201).json({ status: 'success', conversation });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/chat/conversations ────────────────────────────
// Get all conversations for the logged-in user (inbox)
exports.getConversations = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const isSeller = req.user.role === 'seller' || req.user.role === 'admin';

    const filter = isSeller
      ? { seller: userId }
      : { buyer: userId };

    const conversations = await Conversation.find(filter)
      .populate('listing', 'title image pricePerBag unit neighbourhood')
      .populate('buyer', 'name neighbourhood')
      .populate('seller', 'name neighbourhood trustScore')
      .populate('lastMessage.sentBy', 'name')
      .sort({ updatedAt: -1 });

    res.json({ status: 'success', conversations });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/chat/conversations/:id/messages ───────────────
// Get all messages in a conversation
exports.getMessages = async (req, res, next) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ status: 'error', message: 'Conversation not found' });

    // Ensure user is a participant
    const userId = req.user._id.toString();
    if (
      conversation.buyer.toString() !== userId &&
      conversation.seller.toString() !== userId
    ) {
      return res.status(403).json({ status: 'error', message: 'Not authorised' });
    }

    const messages = await Message.find({ conversation: req.params.id })
      .populate('sender', 'name')
      .sort({ createdAt: 1 });

    // Mark messages as read
    const isBuyer = conversation.buyer.toString() === userId;
    if (isBuyer) {
      await Conversation.findByIdAndUpdate(req.params.id, { unreadBuyer: 0 });
    } else {
      await Conversation.findByIdAndUpdate(req.params.id, { unreadSeller: 0 });
    }

    res.json({ status: 'success', messages, conversation });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/chat/conversations/:id/messages ──────────────
// Send a message (REST fallback — Socket.io is primary)
exports.sendMessage = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ status: 'error', message: 'Message text is required' });

    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ status: 'error', message: 'Conversation not found' });

    const userId = req.user._id.toString();
    if (
      conversation.buyer.toString() !== userId &&
      conversation.seller.toString() !== userId
    ) {
      return res.status(403).json({ status: 'error', message: 'Not authorised' });
    }

    const message = await Message.create({
      conversation: conversation._id,
      sender: req.user._id,
      text: text.trim(),
      deliveredOffline: true, // sent via REST = recipient was offline
    });
    await message.populate('sender', 'name');

    // Update conversation preview
    const isBuyer = conversation.buyer.toString() === userId;
    await Conversation.findByIdAndUpdate(req.params.id, {
      lastMessage: { text: text.trim(), sentAt: new Date(), sentBy: req.user._id },
      $inc: isBuyer ? { unreadSeller: 1 } : { unreadBuyer: 1 },
    });

    res.status(201).json({ status: 'success', message });
  } catch (err) {
    next(err);
  }
};
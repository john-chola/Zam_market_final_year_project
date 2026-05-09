const Listing = require('../models/Listing');
const { uploadImage, deleteImage } = require('../utils/cloudinary');

// ── POST /api/listings ─────────────────────────────────────
exports.createListing = async (req, res, next) => {
  try {
    const {
      title, charcoalType, pricePerBag, unit,
      quantityAvailable, neighbourhood, description,
    } = req.body;

    // Validate required fields explicitly for clear error messages
    if (!title) return res.status(400).json({ status: 'error', message: 'Title is required' });
    if (!pricePerBag) return res.status(400).json({ status: 'error', message: 'Price is required' });
    if (!quantityAvailable) return res.status(400).json({ status: 'error', message: 'Quantity is required' });

    const listingData = {
      seller: req.user._id,
      title: title.trim(),
      charcoalType: charcoalType || 'Hardwood (Miombo)',
      pricePerBag: Number(pricePerBag),
      unit: unit || 'bag',
      quantityAvailable: Number(quantityAvailable),
      // Fall back to seller's neighbourhood if not provided
      neighbourhood: neighbourhood || req.user.neighbourhood || 'Other',
      description: description ? description.trim() : '',
    };

    // Only upload image if file was actually sent
    if (req.file) {
      const result = await uploadImage(req.file.buffer);
      listingData.image = { url: result.url, publicId: result.publicId };
    }

    const listing = await Listing.create(listingData);
    await listing.populate('seller', 'name neighbourhood trustScore sellerProfile');

    res.status(201).json({ status: 'success', listing });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ status: 'error', message: messages.join('. ') });
    }
    next(err);
  }
};

// ── GET /api/listings ──────────────────────────────────────
exports.getListings = async (req, res, next) => {
  try {
    const { neighbourhood, page = 1, limit = 12, search } = req.query;

    const filter = { status: 'active' };
    if (neighbourhood && neighbourhood !== 'All') filter.neighbourhood = neighbourhood;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { charcoalType: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Listing.countDocuments(filter);

    const listings = await Listing.find(filter)
      .populate('seller', 'name neighbourhood trustScore sellerProfile phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.json({
      status: 'success',
      listings,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        hasMore: skip + listings.length < total,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/listings/my/listings ─────────────────────────
// Must be defined BEFORE /:id to avoid "my" being treated as an id
exports.getMyListings = async (req, res, next) => {
  try {
    const listings = await Listing.find({ seller: req.user._id }).sort({ createdAt: -1 });
    res.json({ status: 'success', listings });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/listings/:id ──────────────────────────────────
exports.getListing = async (req, res, next) => {
  try {
    const listing = await Listing.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    ).populate('seller', 'name neighbourhood trustScore sellerProfile phone createdAt');

    if (!listing) return res.status(404).json({ status: 'error', message: 'Listing not found' });
    res.json({ status: 'success', listing });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/listings/:id ──────────────────────────────────
exports.updateListing = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ status: 'error', message: 'Listing not found' });
    if (listing.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ status: 'error', message: 'Not authorised to edit this listing' });
    }

    const allowed = ['title', 'charcoalType', 'pricePerBag', 'unit', 'quantityAvailable', 'description', 'status', 'neighbourhood'];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) listing[field] = req.body[field];
    });

    if (req.file) {
      await deleteImage(listing.image?.publicId);
      const result = await uploadImage(req.file.buffer);
      listing.image = { url: result.url, publicId: result.publicId };
    }

    await listing.save();
    await listing.populate('seller', 'name neighbourhood trustScore sellerProfile');
    res.json({ status: 'success', listing });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/listings/:id ───────────────────────────────
exports.deleteListing = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ status: 'error', message: 'Listing not found' });
    if (listing.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ status: 'error', message: 'Not authorised to delete this listing' });
    }
    await deleteImage(listing.image?.publicId);
    await listing.deleteOne();
    res.json({ status: 'success', message: 'Listing deleted' });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/listings/:id/status ────────────────────────
exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['active', 'sold', 'paused'].includes(status)) {
      return res.status(400).json({ status: 'error', message: 'Invalid status value' });
    }
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ status: 'error', message: 'Listing not found' });
    if (listing.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ status: 'error', message: 'Not authorised' });
    }
    listing.status = status;
    await listing.save();
    res.json({ status: 'success', listing });
  } catch (err) {
    next(err);
  }
};
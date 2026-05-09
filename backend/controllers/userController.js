const User = require('../models/User');

// ── GET /api/users/:id ─────────────────────────────────────
// Public profile (used by buyers viewing a seller)
exports.getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || !user.isActive) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }
    res.json({ status: 'success', user: user.publicProfile });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/users/me ──────────────────────────────────────
// Update own profile (authenticated)
exports.updateProfile = async (req, res, next) => {
  try {
    const allowed = ['name', 'neighbourhood', 'sellerProfile'];
    const updates = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    // Prevent role escalation through this endpoint
    if (req.body.role) {
      return res.status(403).json({ status: 'error', message: 'Role cannot be changed here' });
    }

    const user = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
      runValidators: true,
    });

    res.json({ status: 'success', user: user.publicProfile });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ status: 'error', message: messages.join('. ') });
    }
    next(err);
  }
};

// ── PUT /api/users/me/upgrade-to-seller ───────────────────
// Buyer upgrades themselves to seller role
exports.upgradeToSeller = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ status: 'error', message: 'User not found' });

    if (user.role === 'seller') {
      return res.status(400).json({ status: 'error', message: 'Already a seller' });
    }

    user.role = 'seller';
    if (req.body.businessName) user.sellerProfile.businessName = req.body.businessName;
    if (req.body.description) user.sellerProfile.description = req.body.description;
    await user.save();

    res.json({ status: 'success', message: 'Account upgraded to seller', user: user.publicProfile });
  } catch (err) {
    next(err);
  }
};
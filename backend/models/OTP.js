const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    index: true,
  },
  code: {
    type: String,
    required: true,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  expiresAt: {
    type: Date,
    required: true,
    // MongoDB TTL index: document auto-deleted after expiry
    index: { expires: 0 },
  },
  verified: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model('OTP', otpSchema);
const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    // The listing this conversation is about
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
    },

    // The two participants
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Last message preview for inbox display
    lastMessage: {
      text: { type: String, default: '' },
      sentAt: { type: Date, default: Date.now },
      sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },

    // Unread counts per participant
    unreadBuyer: { type: Number, default: 0 },
    unreadSeller: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// One conversation per buyer+listing combination
conversationSchema.index({ listing: 1, buyer: 1 }, { unique: true });
conversationSchema.index({ buyer: 1, updatedAt: -1 });
conversationSchema.index({ seller: 1, updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
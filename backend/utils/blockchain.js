const crypto = require('crypto');

// ── Simple SHA-256 hash chain ──────────────────────────────
// Not a distributed ledger — a tamper-evident linked chain
// Each block contains: event data + hash of previous block
// If any block is modified, all subsequent hashes become invalid

const sha256 = (data) =>
  crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');

// Create a new block for the chain
const createBlock = (event, previousHash = '0'.repeat(64)) => {
  const block = {
    timestamp: new Date().toISOString(),
    event,          // { type, sellerId, data }
    previousHash,
  };
  block.hash = sha256(block);
  return block;
};

// Verify the entire chain is intact (tamper detection)
const verifyChain = (blocks) => {
  if (!blocks || blocks.length === 0) return true;

  for (let i = 1; i < blocks.length; i++) {
    const current  = blocks[i];
    const previous = blocks[i - 1];

    // Recompute hash to check it hasn't been modified
    const { hash, ...blockWithoutHash } = current;
    const recomputed = sha256(blockWithoutHash);

    if (recomputed !== current.hash) {
      return false; // block was tampered with
    }
    if (current.previousHash !== previous.hash) {
      return false; // chain link broken
    }
  }
  return true;
};

// Calculate trust score from a chain of events
const calculateScore = (blocks) => {
  if (!blocks || blocks.length === 0) return 50; // default score

  let score = 50;
  for (const block of blocks) {
    switch (block.event?.type) {
      case 'LISTING_CREATED':    score += 2;  break; // +2 per listing
      case 'CONVERSATION_DONE':  score += 5;  break; // +5 per completed chat
      case 'BUYER_RATING_5':     score += 8;  break; // +8 for 5-star rating
      case 'BUYER_RATING_4':     score += 5;  break;
      case 'BUYER_RATING_3':     score += 2;  break;
      case 'BUYER_RATING_1':     score -= 5;  break; // -5 for bad rating
      case 'ADMIN_VERIFIED':     score += 15; break; // +15 for admin verification
      default: break;
    }
  }
  // Clamp between 0 and 100
  return Math.max(0, Math.min(100, score));
};

module.exports = { createBlock, verifyChain, calculateScore, sha256 };
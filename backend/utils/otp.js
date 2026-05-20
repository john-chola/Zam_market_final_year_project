const OTP = require('../models/OTP');

// Generate a 6-digit OTP code
const generateCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// "Send" OTP — in dev mode logs to console; swap this for real SMS later
const sendOTP = async (phone) => {
  // Delete any existing OTP for this phone
  await OTP.deleteMany({ phone });

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await OTP.create({ phone, code, expiresAt });

  if (process.env.NODE_ENV === 'development') {
    // ─────────────────────────────────────────────────────────
    // SIMULATED OTP — printed to server console
    // In production: replace this block with Africa's Talking
    // or Twilio SMS API call.
    // ─────────────────────────────────────────────────────────
    console.log('\n──────────────────────────────────────');
    console.log(`SIMULATED OTP for ${phone}: ${code}`);
    console.log('──────────────────────────────────────\n');
  }

  return { success: true, expiresAt };
  // TODO (Sprint 4): return { success: true, messageId } from real SMS
};

// Verify an OTP code
const verifyOTP = async (phone, code) => {
  const otpDoc = await OTP.findOne({ phone, verified: false });

  if (!otpDoc) {
    return { valid: false, reason: 'No OTP found. Request a new code.' };
  }

  if (new Date() > otpDoc.expiresAt) {
    await OTP.deleteOne({ _id: otpDoc._id });
    return { valid: false, reason: 'OTP has expired. Request a new code.' };
  }

  if (otpDoc.attempts >= 3) {
    await OTP.deleteOne({ _id: otpDoc._id });
    return { valid: false, reason: 'Too many attempts. Request a new code.' };
  }

  if (otpDoc.code !== code) {
    otpDoc.attempts += 1;
    await otpDoc.save();
    const remaining = 3 - otpDoc.attempts;
    return { valid: false, reason: `Incorrect code. ${remaining} attempt(s) remaining.` };
  }

  // Mark as verified and remove
  await OTP.deleteOne({ _id: otpDoc._id });
  return { valid: true };
};

module.exports = { sendOTP, verifyOTP };
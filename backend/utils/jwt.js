const jwt = require('jsonwebtoken');

const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const verifyToken = (token) =>
  jwt.verify(token, process.env.JWT_SECRET);

// Build the standard auth response sent to client
const createAuthResponse = (user, res, statusCode = 200) => {
  const token = signToken(user._id);

  res.status(statusCode).json({
    status: 'success',
    token,
    user: {
      _id: user._id,
      id: user._id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      neighbourhood: user.neighbourhood,
      sellerProfile: user.sellerProfile,
      trustScore: user.trustScore,
    },
  });
};

module.exports = { signToken, verifyToken, createAuthResponse };
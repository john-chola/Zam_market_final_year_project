const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    console.log('protect middleware — Authorization header:', authHeader ? 'present' : 'MISSING');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'Not authenticated. Please log in.',
      });
    }

    const token = authHeader.split(' ')[1];
    console.log('protect — token length:', token?.length);

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtErr) {
      console.error('JWT verify failed:', jwtErr.message);
      if (jwtErr.name === 'TokenExpiredError') {
        return res.status(401).json({ status: 'error', message: 'Session expired. Please log in again.' });
      }
      return res.status(401).json({ status: 'error', message: 'Invalid token.' });
    }

    console.log('protect — decoded user id:', decoded.id);

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ status: 'error', message: 'User no longer exists.' });
    }

    console.log('protect — user found:', user.name, user.role);
    req.user = user;
    next();
  } catch (err) {
    console.error('protect middleware error:', err.message);
    next(err);
  }
};

exports.restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      status: 'error',
      message: `Access denied. Required role: ${roles.join(' or ')}.`,
    });
  }
  next();
};
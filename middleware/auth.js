const User = require('../models/User');

// Check if user is authenticated
const requireAuth = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  } else {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
  }
};

// Check if user is not authenticated (for login/register pages)
const requireGuest = (req, res, next) => {
  if (req.session && req.session.userId) {
    return res.status(400).json({ 
      success: false, 
      message: 'Already logged in' 
    });
  } else {
    return next();
  }
};

// Get current user info
const getCurrentUser = async (req, res, next) => {
  if (req.session && req.session.userId) {
    try {
      const user = await User.findById(req.session.userId).select('-password');
      req.user = user;
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  }
  next();
};

module.exports = {
  requireAuth,
  requireGuest,
  getCurrentUser
};

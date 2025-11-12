import { getSession } from '../../../lib/session';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const User = require('../../../models/User');
    
    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    
    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ success: false, message: 'Email already in use' });
      }
      return res.status(400).json({ success: false, message: 'Username already taken' });
    }

    // Create new user
    const user = new User({
      username,
      email,
      password, // Will be hashed by the pre-save hook
      coins: 100, // Starting coins
      ownedGames: []
    });

    await user.save();

    // Set session
    const session = await getSession(req, res);
    session.userId = user._id.toString();
    await session.save();

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        coins: user.coins,
        ownedGames: user.ownedGames,
        role: user.role,
        isAdmin: user.role === 'admin',
        creatorProfile: user.creatorProfile,
        creatorStats: user.creatorStats,
        creatorSince: user.creatorSince,
        freeGames: user.freeGames
      }
    });
  } catch (error) {
    console.error('Error in /api/auth/register:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}


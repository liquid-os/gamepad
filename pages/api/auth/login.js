import { getSession } from '../../../lib/session';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const User = require('../../../models/User');
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Set session
    const session = await getSession(req, res);
    session.userId = user._id.toString();
    await session.save();

    return res.status(200).json({
      success: true,
      message: 'Login successful',
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
    console.error('Error in /api/auth/login:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}


import { getSession } from '../../../lib/session';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getSession(req, res);
    const userId = session.userId;

    if (!userId) {
      return res.status(200).json({ success: false, message: 'Not authenticated' });
    }

    const User = require('../../../models/User');
    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(200).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
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
    console.error('Error in /api/auth/me:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}


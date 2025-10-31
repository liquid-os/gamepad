import { getSession } from '../../../../lib/session';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getSession(req, res);
    const userId = session.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { gameId } = req.query;

    const User = require('../../../../models/User');
    const Game = require('../../../../models/Game');
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const game = await Game.findOne({ gameId });
    if (!game) {
      return res.status(404).json({ success: false, message: 'Game not found' });
    }

    // Check if user already owns the game
    const alreadyOwned = user.ownedGames.some(owned => owned.gameId === gameId);
    if (alreadyOwned) {
      return res.status(400).json({ success: false, message: 'You already own this game' });
    }

    // Check if user can afford the game
    if (user.coins < game.price) {
      return res.status(400).json({ success: false, message: 'Insufficient coins' });
    }

    // Deduct coins and add game to owned games
    user.coins -= game.price;
    user.ownedGames.push({
      gameId: gameId,
      purchasedAt: new Date()
    });

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Game purchased successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        coins: user.coins,
        ownedGames: user.ownedGames
      }
    });
  } catch (error) {
    console.error('Error in /api/games/purchase:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}


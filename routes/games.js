const express = require('express');
const User = require('../models/User');
const Game = require('../models/Game');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// Get all available games
router.get('/store', requireAuth, async (req, res) => {
  try {
    const games = await Game.find({ isActive: true }).select('-__v');
    const user = await User.findById(req.session.userId);
    
    // Add ownership status to each game
    const gamesWithOwnership = games.map(game => {
      const isOwned = user.ownedGames.some(owned => owned.gameId === game.id);
      const isFree = user.freeGames.some(free => free.gameId === game.id);
      const isAccessible = isOwned || isFree;
      
      return {
        ...game.toObject(),
        owned: isOwned,
        free: isFree,
        accessible: isAccessible,
        canAfford: user.coins >= game.price
      };
    });

    res.json({
      success: true,
      games: gamesWithOwnership,
      userCoins: user.coins
    });
  } catch (error) {
    console.error('Get games error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get games'
    });
  }
});

// Purchase a game
router.post('/purchase/:gameId', requireAuth, async (req, res) => {
  try {
    const { gameId } = req.params;
    const userId = req.session.userId;

    // Get game details
    const game = await Game.findOne({ id: gameId, isActive: true });
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if already owned
    if (user.ownedGames.some(owned => owned.gameId === gameId)) {
      return res.status(400).json({
        success: false,
        message: 'You already own this game'
      });
    }

    // Check if user has enough coins
    if (user.coins < game.price) {
      return res.status(400).json({
        success: false,
        message: 'Not enough coins to purchase this game'
      });
    }

    // Purchase the game
    user.coins -= game.price;
    user.ownedGames.push({
      gameId: gameId,
      purchasedAt: new Date()
    });

    await user.save();

    res.json({
      success: true,
      message: 'Game purchased successfully',
      user: {
        coins: user.coins,
        ownedGames: user.ownedGames
      }
    });

  } catch (error) {
    console.error('Purchase game error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to purchase game'
    });
  }
});

// Get user's owned games
router.get('/owned', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).populate('ownedGames.gameId');
    
    res.json({
      success: true,
      ownedGames: user.ownedGames,
      coins: user.coins
    });
  } catch (error) {
    console.error('Get owned games error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get owned games'
    });
  }
});

// Get games available for a lobby (owned by ANY player)
router.post('/lobby-available', requireAuth, async (req, res) => {
  try {
    const { playerIds } = req.body;
    
    if (!playerIds || !Array.isArray(playerIds)) {
      return res.status(400).json({
        success: false,
        message: 'Player IDs are required'
      });
    }

    // Get all players and their owned games
    const players = await User.find({ 
      _id: { $in: playerIds } 
    }).select('ownedGames');

    if (players.length === 0) {
      return res.json({
        success: true,
        availableGames: []
      });
    }

    // Find games owned by ANY player
    const allOwnedGames = players.flatMap(player => 
      player.ownedGames.map(owned => owned.gameId)
    );

    // Get unique games owned by any player
    const availableGames = [...new Set(allOwnedGames)];

    // Get full game details for available games
    const gameDetails = await Game.find({ 
      id: { $in: availableGames },
      isActive: true 
    }).select('-__v');

    res.json({
      success: true,
      availableGames: gameDetails
    });

  } catch (error) {
    console.error('Get lobby games error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get lobby games'
    });
  }
});

module.exports = router;

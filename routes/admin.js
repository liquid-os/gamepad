const express = require('express');
const Game = require('../models/Game');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const gameLoader = require('../utils/DynamicGameLoader');
const router = express.Router();

// Middleware to check admin permissions
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin permissions required'
    });
  }
  next();
};

// Get all pending games
router.get('/pending-games', requireAuth, requireAdmin, async (req, res) => {
  try {
    const games = await Game.find({ status: 'pending' })
      .populate('creatorId', 'username creatorProfile.studioName')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      games: games
    });
  } catch (error) {
    console.error('Get pending games error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pending games'
    });
  }
});

// Approve a game
router.post('/approve-game/:gameId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { gameId } = req.params;
    
    const game = await Game.findOne({ id: gameId, status: 'pending' });
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found or already processed'
      });
    }
    
    // Update game status
    game.status = 'approved';
    await game.save();
    
    // Load the game dynamically
    await gameLoader.reloadGame(gameId);
    
    // Update creator stats
    const creator = await User.findById(game.creatorId);
    if (creator) {
      await creator.updateCreatorStats({
        gamesPublished: creator.creatorStats.gamesPublished + 1
      });
    }
    
    res.json({
      success: true,
      message: 'Game approved successfully'
    });
    
  } catch (error) {
    console.error('Approve game error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve game'
    });
  }
});

// Reject a game
router.post('/reject-game/:gameId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { gameId } = req.params;
    const { reason } = req.body;
    
    const game = await Game.findOne({ id: gameId, status: 'pending' });
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found or already processed'
      });
    }
    
    // Update game status
    game.status = 'rejected';
    if (reason) {
      game.validationErrors = [reason];
    }
    await game.save();
    
    res.json({
      success: true,
      message: 'Game rejected successfully'
    });
    
  } catch (error) {
    console.error('Reject game error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject game'
    });
  }
});

// Get all games (admin view)
router.get('/all-games', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    
    const query = {};
    if (status) {
      query.status = status;
    }
    
    const games = await Game.find(query)
      .populate('creatorId', 'username creatorProfile.studioName')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      games: games
    });
    
  } catch (error) {
    console.error('Get all games error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get games'
    });
  }
});

// Get platform statistics
router.get('/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [
      totalGames,
      approvedGames,
      pendingGames,
      rejectedGames,
      totalUsers,
      totalCreators,
      totalRevenue
    ] = await Promise.all([
      Game.countDocuments(),
      Game.countDocuments({ status: 'approved' }),
      Game.countDocuments({ status: 'pending' }),
      Game.countDocuments({ status: 'rejected' }),
      User.countDocuments(),
      User.countDocuments({ role: 'creator' }),
      Game.aggregate([
        { $group: { _id: null, total: { $sum: '$downloadCount' } } }
      ])
    ]);
    
    const stats = {
      totalGames,
      approvedGames,
      pendingGames,
      rejectedGames,
      totalUsers,
      totalCreators,
      totalDownloads: totalRevenue[0]?.total || 0
    };
    
    res.json({
      success: true,
      stats: stats
    });
    
  } catch (error) {
    console.error('Get platform stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get platform stats'
    });
  }
});

module.exports = router;

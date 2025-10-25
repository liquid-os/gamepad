const express = require('express');
const User = require('../models/User');
const Game = require('../models/Game');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// Get all available games with search, filter, and sort
router.get('/store', requireAuth, async (req, res) => {
  try {
    const { search, category, sortBy, showOwned } = req.query;
    const user = await User.findById(req.session.userId);
    
    // Use the searchGames static method
    const games = await Game.searchGames(search, category, sortBy);
    
    // Add ownership status to each game (no coin affordability check)
    let gamesWithOwnership = games.map(game => {
      const isOwned = user.ownedGames.some(owned => owned.gameId === game.id);
      const isFree = user.freeGames.some(free => free.gameId === game.id);
      const isAccessible = isOwned || isFree;
      
      return {
        ...game.toObject(),
        owned: isOwned,
        free: isFree,
        accessible: isAccessible
      };
    });

    // Filter out owned games if showOwned is not true
    if (showOwned !== 'true') {
      gamesWithOwnership = gamesWithOwnership.filter(game => !game.owned);
    }

    res.json({
      success: true,
      games: gamesWithOwnership
    });
  } catch (error) {
    console.error('Get games error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get games'
    });
  }
});

// Purchase a game (deprecated - use Stripe checkout instead)
router.post('/purchase/:gameId', requireAuth, async (req, res) => {
  res.status(410).json({
    success: false,
    message: 'Coin purchases are no longer supported. Please use Stripe checkout.'
  });
});

// Get user's library (owned + free games)
router.get('/library', requireAuth, async (req, res) => {
  try {
    const { search, category, sortBy } = req.query;
    const user = await User.findById(req.session.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get all accessible game IDs (owned + free)
    const accessibleGameIds = user.getAllAccessibleGames();
    
    if (accessibleGameIds.length === 0) {
      return res.json({
        success: true,
        games: []
      });
    }

    // Build query for accessible games
    let query = { 
      id: { $in: accessibleGameIds },
      isActive: true 
    };

    // Add search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { searchKeywords: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Add category filter
    if (category && category !== 'all') {
      query.category = category;
    }

    // Get games with filters
    let games = await Game.find(query);

    // Add ownership status to each game
    const gamesWithOwnership = games.map(game => {
      const isOwned = user.ownedGames.some(owned => owned.gameId === game.id);
      const isFree = user.freeGames.some(free => free.gameId === game.id);
      
      return {
        ...game.toObject(),
        owned: isOwned,
        free: isFree,
        accessible: true // All games in library are accessible
      };
    });

    // Sort games
    if (sortBy) {
      switch (sortBy) {
        case 'name':
          gamesWithOwnership.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case 'newest':
          gamesWithOwnership.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          break;
        case 'rating':
          gamesWithOwnership.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
          break;
        case 'category':
          gamesWithOwnership.sort((a, b) => a.category.localeCompare(b.category));
          break;
        default:
          gamesWithOwnership.sort((a, b) => a.name.localeCompare(b.name));
      }
    }

    res.json({
      success: true,
      games: gamesWithOwnership
    });
  } catch (error) {
    console.error('Get library games error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get library games'
    });
  }
});

// Get user's owned games (legacy endpoint)
router.get('/owned', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).populate('ownedGames.gameId');
    
    res.json({
      success: true,
      ownedGames: user.ownedGames
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

// Rate a game
router.post('/rate/:gameId', requireAuth, async (req, res) => {
  try {
    const { gameId } = req.params;
    const { rating, review } = req.body;
    const userId = req.session.userId;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    // Find the game
    const game = await Game.findOne({ id: gameId, isActive: true });
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    // Add or update rating
    await game.addRating(userId, rating, review || '');

    res.json({
      success: true,
      message: 'Rating submitted successfully',
      game: {
        id: game.id,
        name: game.name,
        averageRating: game.averageRating,
        totalRatings: game.totalRatings
      }
    });

  } catch (error) {
    console.error('Rate game error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to rate game'
    });
  }
});

// Get game ratings
router.get('/ratings/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    
    const game = await Game.findOne({ id: gameId, isActive: true })
      .populate('ratings.userId', 'username')
      .select('ratings averageRating totalRatings');
    
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    res.json({
      success: true,
      ratings: game.ratings,
      averageRating: game.averageRating,
      totalRatings: game.totalRatings
    });

  } catch (error) {
    console.error('Get ratings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get ratings'
    });
  }
});

// Get categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Game.distinct('category', { isActive: true });
    res.json({
      success: true,
      categories: ['all', ...categories]
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get categories'
    });
  }
});

module.exports = router;

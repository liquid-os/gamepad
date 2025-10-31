import { getSession } from '../../../lib/session';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getSession(req, res);
    const userId = session.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const User = require('../../../models/User');
    const Game = require('../../../models/Game');
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { search, category, sortBy } = req.query;

    // Build query
    let query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (category && category !== 'all') {
      query.category = category;
    }

    // Build sort
    let sort = {};
    switch (sortBy) {
      case 'averageRating':
        sort = { averageRating: -1 };
        break;
      case 'newest':
        sort = { createdAt: -1 };
        break;
      case 'price_low':
        sort = { price: 1 };
        break;
      case 'price_high':
        sort = { price: -1 };
        break;
      case 'name':
        sort = { name: 1 };
        break;
      default:
        sort = { averageRating: -1 };
    }

    const games = await Game.find(query).sort(sort);

    const config = require('../../../config');
    const freeGames = config.FREE_GAMES || [];

    // Process games to include ownership and affordability info
    const processedGames = games.map(game => {
      const owned = user.ownedGames.some(owned => owned.gameId === game.gameId);
      const free = freeGames.includes(game.gameId);
      const accessible = owned || free;
      const canAfford = user.coins >= game.price;

      return {
        id: game.gameId,
        name: game.name,
        description: game.description,
        price: game.price,
        minPlayers: game.minPlayers,
        maxPlayers: game.maxPlayers,
        category: game.category,
        thumbnail: game.thumbnail,
        images: game.images,
        averageRating: game.averageRating,
        totalRatings: game.totalRatings,
        owned,
        free,
        accessible,
        canAfford
      };
    });

    return res.status(200).json({
      success: true,
      games: processedGames,
      userCoins: user.coins
    });
  } catch (error) {
    console.error('Error in /api/games/store:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}


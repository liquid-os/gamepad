const config = require('../config');
const Game = require('../models/Game');

/**
 * Retrieve the list of core game IDs that should be freely available to all users.
 * Combines the static configuration with games flagged in the database.
 * @returns {Promise<string[]>}
 */
async function getCoreGameIds() {
  const baseCoreGames = Array.isArray(config.FREE_GAMES) ? config.FREE_GAMES : [];
  try {
    const dynamicCoreGames = await Game.find({ isCoreGame: true }).select('id').lean();
    const combined = new Set([
      ...baseCoreGames,
      ...dynamicCoreGames.map(game => game.id)
    ]);
    return Array.from(combined);
  } catch (error) {
    console.error('[CoreGames] Failed to load dynamic core games:', error);
    return Array.from(new Set(baseCoreGames));
  }
}

module.exports = {
  getCoreGameIds
};


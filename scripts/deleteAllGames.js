const mongoose = require('mongoose');
const Game = require('../models/Game');
const config = require('../config');

async function deleteAllGames() {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('[DeleteGames] Connected to MongoDB');

    const result = await Game.deleteMany({});
    console.log(`[DeleteGames] Deleted ${result.deletedCount} games from database`);

    await mongoose.disconnect();
    console.log('[DeleteGames] Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('[DeleteGames] Error deleting games:', error);
    process.exit(1);
  }
}

deleteAllGames();


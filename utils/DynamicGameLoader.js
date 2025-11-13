const Game = require('../models/Game');
const fs = require('fs');
const path = require('path');
const config = require('../config');

class DynamicGameLoader {
  constructor() {
    this.games = new Map();
    this.isLoading = false;
  }

  async initialize() {
    if (this.isLoading) return;
    
    this.isLoading = true;
    console.log('[DynamicLoader] Initializing...');
    
    try {
      await this.loadAllGames();
      console.log(`[DynamicLoader] Loaded ${this.games.size} games`);
    } catch (error) {
      console.error('[DynamicLoader] Initialization failed:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async loadAllGames() {
    try {
      // Load only approved games from database
      const approvedGames = await Game.getApprovedGames();
      
      console.log(`[DynamicLoader] Found ${approvedGames.length} approved games in database`);
      
      for (const gameData of approvedGames) {
        await this.loadGame(gameData);
      }
    } catch (error) {
      console.error('[DynamicLoader] Failed to load games from database:', error);
    }
  }


  async loadGame(gameData) {
    try {
      // Create game metadata only (no execution)
      const game = this.createGameMetadata(gameData);
      this.games.set(gameData.id, game);
      console.log(`[DynamicLoader] Loaded metadata for ${gameData.name} (${gameData.id})`);
    } catch (error) {
      console.error(`[DynamicLoader] Failed to load ${gameData.id}:`, error);
    }
  }


  async reloadGame(gameId) {
    try {
      const Game = require('../models/Game');
      const gameData = await Game.findOne({ id: gameId, approved: true });
      
      if (gameData) {
        await this.loadGame(gameData);
        console.log(`[DynamicLoader] Reloaded ${gameId}`);
      } else {
        this.games.delete(gameId);
        console.log(`[DynamicLoader] Unloaded ${gameId} (not approved)`);
      }
    } catch (error) {
      console.error(`[DynamicLoader] Failed to reload ${gameId}:`, error);
    }
  }

  createGameMetadata(gameData) {
    // Create simple metadata object - no execution
    return {
      meta: {
        id: gameData.id,
        name: gameData.name,
        description: gameData.description,
        minPlayers: gameData.minPlayers,
        maxPlayers: gameData.maxPlayers,
        category: gameData.category,
        price: gameData.price,
        creatorId: gameData.creatorId,
        creatorName: gameData.creatorId?.username || gameData.creatorId?.creatorProfile?.studioName || 'Unknown',
        version: gameData.version,
        downloadCount: gameData.downloadCount,
        deployedAt: gameData.deployedAt,
        folderPath: gameData.folderPath
      },
      
      // Game will be executed in separate process
      isDeployed: () => {
        if (!gameData.folderPath) return false;
        const serverPath = path.join(config.GAMES_DIR, gameData.id, 'server.js');
        return fs.existsSync(serverPath);
      }
    };
  }

  // Get game by ID
  getGame(gameId) {
    return this.games.get(gameId);
  }

  // Get all loaded games
  getAllGames() {
    return Array.from(this.games.values());
  }

  // Get game metadata for all loaded games
  getAllGameMetadata() {
    return Array.from(this.games.values()).map(game => game.meta);
  }

  // Check if game is loaded
  hasGame(gameId) {
    return this.games.has(gameId);
  }

  // Get loaded games count
  getLoadedGamesCount() {
    return this.games.size;
  }
}

// Create singleton instance
const gameLoader = new DynamicGameLoader();

module.exports = gameLoader;

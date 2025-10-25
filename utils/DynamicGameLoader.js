const Game = require('../models/Game');
const fs = require('fs');
const path = require('path');

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
        const serverPath = path.join(__dirname, '..', 'games', gameData.id, 'server.js');
        return fs.existsSync(serverPath);
      }
    };
  }

  // Get game by ID
  getGame(gameId) {
    return this.games.get(gameId);
  }

  // Load test game from custom path
  async loadTestGame(gameId, testGamePath) {
    try {
      const fs = require('fs');
      const path = require('path');
      
      const testPath = path.join(__dirname, '..', 'games', testGamePath);
      const serverPath = path.join(testPath, 'server.js');
      
      if (!fs.existsSync(serverPath)) {
        throw new Error(`Test game ${gameId} not found at ${serverPath}`);
      }

      // Clear require cache to ensure fresh load
      delete require.cache[require.resolve(serverPath)];
      
      // Load game module
      const gameModule = require(serverPath);
      
      if (!gameModule || typeof gameModule !== 'object') {
        throw new Error('Game module must export an object');
      }

      if (!gameModule.meta) {
        throw new Error('Game module missing meta information');
      }

      // Create game metadata with test path info
      const gameData = {
        id: gameId,
        name: gameModule.meta.name || 'Test Game',
        description: gameModule.meta.description || 'Test game for development',
        minPlayers: gameModule.meta.minPlayers || 2,
        maxPlayers: gameModule.meta.maxPlayers || 8,
        category: gameModule.meta.category || 'test',
        price: 0,
        creatorId: null,
        version: gameModule.meta.version || '1.0.0',
        downloadCount: 0,
        deployedAt: new Date(),
        folderPath: testPath
      };

      const game = this.createGameMetadata(gameData);
      this.games.set(gameId, game);

      console.log(`[DynamicLoader] Loaded test game ${gameId} from ${testGamePath}`);
      return game;

    } catch (error) {
      console.error(`[DynamicLoader] Failed to load test game ${gameId}:`, error);
      throw error;
    }
  }

  // Get all loaded games
  getAllGames() {
    return Array.from(this.games.values());
  }

  // Load creator's unapproved game for testing
  async loadCreatorGame(gameId, creatorId) {
    try {
      const Game = require('../models/Game');
      const gameData = await Game.findOne({ id: gameId, creatorId: creatorId });
      
      if (gameData) {
        const game = this.createGameMetadata(gameData);
        this.games.set(gameId, game);
        console.log(`[DynamicLoader] Loaded creator's game ${gameId} for testing`);
        return game;
      }
      return null;
    } catch (error) {
      console.error(`[DynamicLoader] Failed to load creator's game ${gameId}:`, error);
      return null;
    }
  }

  // Check if game is accessible to creator
  getGameForCreator(gameId, creatorId) {
    const game = this.games.get(gameId);
    if (game) {
      return game;
    }
    
    // Check if this is a creator's unapproved game
    // This will be handled by the server when needed
    return null;
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

const vm = require('vm');
const crypto = require('crypto');
const Game = require('../models/Game');

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
      // Load games from database first
      const approvedGames = await Game.getApprovedGames();
      
      for (const gameData of approvedGames) {
        await this.loadGame(gameData);
      }
      
      // Also load existing games from file system as fallback
      await this.loadFileSystemGames();
    } catch (error) {
      console.error('[DynamicLoader] Failed to load games from database:', error);
      // Fallback to file system only
      await this.loadFileSystemGames();
    }
  }

  async loadFileSystemGames() {
    try {
      const path = require('path');
      const fs = require('fs');
      
      const gamesDir = path.join(__dirname, '..', 'games');
      if (!fs.existsSync(gamesDir)) {
        console.log('[DynamicLoader] Games directory not found');
        return;
      }

      const folders = fs.readdirSync(gamesDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);

      for (const id of folders) {
        // Skip if already loaded from database
        if (this.games.has(id)) {
          continue;
        }
        
        const serverPath = path.join(gamesDir, id, 'server.js');
        if (!fs.existsSync(serverPath)) continue;

        try {
          // Create a mock game data object for file system games
          const gameData = {
            id: id,
            name: id.charAt(0).toUpperCase() + id.slice(1),
            description: `The classic ${id} game`,
            minPlayers: 2,
            maxPlayers: 8,
            category: 'strategy',
            price: 0,
            serverCode: null // Will trigger file system loading
          };
          
          await this.loadGame(gameData);
        } catch (err) {
          console.error(`[DynamicLoader] Failed to load ${id} from file system:`, err);
        }
      }
    } catch (error) {
      console.error('[DynamicLoader] Failed to load file system games:', error);
    }
  }

  async loadGame(gameData) {
    try {
      // For existing games without serverCode, load from file system
      if (!gameData.serverCode) {
        await this.loadFromFileSystem(gameData);
        return;
      }

      // Create sandboxed game module
      const gameModule = this.createSandboxedModule(gameData.serverCode, gameData.id);
      const game = this.wrapGameModule(gameModule, gameData);
      
      this.games.set(gameData.id, game);
      console.log(`[DynamicLoader] Loaded ${gameData.name} (${gameData.id})`);
    } catch (error) {
      console.error(`[DynamicLoader] Failed to load ${gameData.id}:`, error);
    }
  }

  async loadFromFileSystem(gameData) {
    // Fallback to file system for existing games
    const path = require('path');
    const fs = require('fs');
    
    const serverPath = path.join(__dirname, '..', 'games', gameData.id, 'server.js');
    
    if (fs.existsSync(serverPath)) {
      try {
        // Clear require cache to ensure fresh load
        delete require.cache[require.resolve(serverPath)];
        const rawModule = require(serverPath);
        const game = this.wrapGameModule(rawModule, gameData);
        
        this.games.set(gameData.id, game);
        console.log(`[DynamicLoader] Loaded ${gameData.name} (${gameData.id}) from file system`);
      } catch (error) {
        console.error(`[DynamicLoader] Failed to load ${gameData.id} from file system:`, error);
      }
    }
  }

  async reloadGame(gameId) {
    try {
      const Game = require('../models/Game');
      const gameData = await Game.findOne({ id: gameId, status: 'approved' });
      
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

  createSandboxedModule(code, gameId) {
    // Create isolated execution context for security
    const sandbox = {
      module: { exports: {} },
      require: this.createSafeRequire(),
      console: {
        log: (...args) => console.log(`[Game:${gameId}]`, ...args),
        error: (...args) => console.error(`[Game:${gameId}]`, ...args),
        warn: (...args) => console.warn(`[Game:${gameId}]`, ...args)
      },
      // Add safe globals
      Math: Math,
      Date: Date,
      JSON: JSON,
      setTimeout: setTimeout,
      clearTimeout: clearTimeout,
      setInterval: setInterval,
      clearInterval: clearInterval
    };
    
    const context = vm.createContext(sandbox);
    
    try {
      vm.runInContext(code, context, {
        timeout: 5000, // 5 second timeout
        breakOnSigint: true
      });
      
      return sandbox.module.exports;
    } catch (error) {
      throw new Error(`Game code execution failed: ${error.message}`);
    }
  }

  createSafeRequire() {
    // Create a safe require function that only allows certain modules
    const allowedModules = [
      'crypto',
      'util',
      'path'
    ];
    
    return (moduleName) => {
      if (allowedModules.includes(moduleName)) {
        return require(moduleName);
      }
      
      // Block dangerous modules
      if (['fs', 'child_process', 'os', 'net', 'http', 'https'].includes(moduleName)) {
        throw new Error(`Module '${moduleName}' is not allowed in game code`);
      }
      
      throw new Error(`Module '${moduleName}' is not allowed`);
    };
  }

  wrapGameModule(gameModule, gameData) {
    // Ensure the game module has the required structure
    if (!gameModule || typeof gameModule !== 'object') {
      throw new Error('Game module must export an object');
    }

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
        downloadCount: gameData.downloadCount
      },
      
      // Game lifecycle methods with error handling
      onInit: (lobby, api) => {
        try {
          if (typeof gameModule.onInit === 'function') {
            return gameModule.onInit(lobby, api);
          }
        } catch (error) {
          console.error(`[Game:${gameData.id}] onInit error:`, error);
        }
      },
      
      onPlayerJoin: (lobby, api, player) => {
        try {
          if (typeof gameModule.onPlayerJoin === 'function') {
            return gameModule.onPlayerJoin(lobby, api, player);
          }
        } catch (error) {
          console.error(`[Game:${gameData.id}] onPlayerJoin error:`, error);
        }
      },
      
      onAction: (lobby, api, player, data) => {
        try {
          if (typeof gameModule.onAction === 'function') {
            return gameModule.onAction(lobby, api, player, data);
          }
        } catch (error) {
          console.error(`[Game:${gameData.id}] onAction error:`, error);
        }
      },
      
      onEnd: (lobby, api) => {
        try {
          if (typeof gameModule.onEnd === 'function') {
            return gameModule.onEnd(lobby, api);
          }
        } catch (error) {
          console.error(`[Game:${gameData.id}] onEnd error:`, error);
        }
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

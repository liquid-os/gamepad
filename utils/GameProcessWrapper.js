#!/usr/bin/env node

/**
 * GameProcessWrapper - Runs game code in container with WebSocket communication
 * 
 * Usage: node GameProcessWrapper.js <processId> <gameId>
 */

const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const http = require('http');

class GameProcessWrapper {
  constructor() {
    this.processId = process.argv[2];
    this.gameId = process.argv[3];
    this.gameModule = null;
    this.lobbyData = null;
    this.isReady = false;
    this.wss = null;
    this.server = null;
    this.useWebSocket = process.env.USE_WEBSOCKET === 'true';

    // Validate arguments
    if (!this.processId || !this.gameId) {
      console.error('[GameProcessWrapper] Missing required arguments: processId, gameId');
      process.exit(1);
    }

    this.setupErrorHandling();
    
    if (this.useWebSocket) {
      this.setupWebSocketServer();
    } else {
      this.setupIPC();
    }
    
    this.loadGameModule();
  }

  /**
   * Setup error handling for the process
   */
  setupErrorHandling() {
    process.on('uncaughtException', (error) => {
      console.error(`[GameProcessWrapper:${this.processId}] Uncaught exception:`, error);
      this.sendToMainServer('ERROR', { error: error.message, stack: error.stack });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error(`[GameProcessWrapper:${this.processId}] Unhandled rejection:`, reason);
      this.sendToMainServer('ERROR', { error: reason.toString() });
    });

    process.on('SIGTERM', () => {
      console.log(`[GameProcessWrapper:${this.processId}] Received SIGTERM, shutting down gracefully`);
      this.shutdown();
    });

    process.on('SIGINT', () => {
      console.log(`[GameProcessWrapper:${this.processId}] Received SIGINT, shutting down gracefully`);
      this.shutdown();
    });
  }

  /**
   * Setup IPC communication with main server
   */
  setupIPC() {
    console.log(`[GameProcessWrapper:${this.processId}] Setting up IPC communication`);
    
    // Listen for messages from main server
    process.on('message', (message) => {
      try {
        this.handleMainServerMessage(message);
      } catch (error) {
        console.error(`[GameProcessWrapper:${this.processId}] Error handling message:`, error);
        this.sendToMainServer('ERROR', { error: error.message });
      }
    });

    // Send ready signal
    this.sendToMainServer('READY', { processId: this.processId });
  }

  /**
   * Setup WebSocket server for communication with main server
   */
  setupWebSocketServer() {
    // Create HTTP server
    this.server = http.createServer();
    
    // Create WebSocket server
    this.wss = new WebSocket.Server({ 
      server: this.server
    });

    this.wss.on('connection', (ws) => {
      console.log(`[GameProcessWrapper:${this.processId}] WebSocket client connected`);
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMainServerMessage(message);
        } catch (error) {
          console.error(`[GameProcessWrapper:${this.processId}] Error parsing message:`, error);
        }
      });

      ws.on('close', () => {
        console.log(`[GameProcessWrapper:${this.processId}] WebSocket client disconnected`);
      });

      ws.on('error', (error) => {
        console.error(`[GameProcessWrapper:${this.processId}] WebSocket error:`, error);
      });

      // Store WebSocket connection
      this.ws = ws;
    });

    this.server.listen(3000, () => {
      console.log(`[GameProcessWrapper:${this.processId}] WebSocket server listening on port 3000`);
    });
  }

  /**
   * Load game module from file system
   */
  loadGameModule() {
    try {
      const gamePath = path.join(__dirname, '..', 'games', this.gameId);
      const serverPath = path.join(gamePath, 'server.js');

      if (!fs.existsSync(serverPath)) {
        throw new Error(`Game server file not found: ${serverPath}`);
      }

      // Clear require cache to ensure fresh load
      delete require.cache[require.resolve(serverPath)];
      
      // Load game module
      this.gameModule = require(serverPath);

      // Validate game module structure
      if (!this.gameModule || typeof this.gameModule !== 'object') {
        throw new Error('Game module must export an object');
      }

      if (!this.gameModule.meta) {
        throw new Error('Game module missing meta information');
      }

      // SECURITY: Apply sandboxing to the loaded game module
      this.applySandboxToGameModule();

      console.log(`[GameProcessWrapper:${this.processId}] Loaded game module for ${this.gameId}`);
      
    } catch (error) {
      console.error(`[GameProcessWrapper:${this.processId}] Failed to load game module:`, error);
      this.sendToMainServer('ERROR', { error: error.message });
      process.exit(1);
    }
  }

  /**
   * Apply sandboxing to the loaded game module
   */
  applySandboxToGameModule() {
    if (!this.gameModule) return;

    // Create a sandboxed version of the game module
    const sandboxedModule = {};

    // Copy meta information (safe)
    if (this.gameModule.meta) {
      sandboxedModule.meta = this.gameModule.meta;
    }

    // Sandbox each game function
    const gameFunctions = ['onInit', 'onPlayerJoin', 'onAction', 'onPlayerDisconnect', 'onEnd'];
    
    gameFunctions.forEach(funcName => {
      if (typeof this.gameModule[funcName] === 'function') {
        sandboxedModule[funcName] = (...args) => {
          try {
            // Create a sandboxed context for the game function
            const sandboxedContext = this.createSandboxedContext();
            
            // Execute the game function in the sandboxed context
            return this.gameModule[funcName].apply(sandboxedContext, args);
          } catch (error) {
            console.error(`[GameProcessWrapper:${this.processId}] Error in game function ${funcName}:`, error);
            throw error;
          }
        };
      }
    });

    // Replace the original module with sandboxed version
    this.gameModule = sandboxedModule;
  }

  /**
   * Create a sandboxed context for game functions
   */
  createSandboxedContext() {
    const context = {};

    // Block dangerous modules
    const blockedModules = [
      'fs', 'child_process', 'os', 'net', 'http', 'https', 'crypto',
      'path', 'util', 'stream', 'cluster', 'worker_threads', 'perf_hooks',
      'v8', 'vm', 'repl', 'readline', 'tty', 'url', 'querystring',
      'zlib', 'events', 'assert', 'buffer', 'timers', 'querystring'
    ];

    context.require = function(moduleName) {
      if (blockedModules.includes(moduleName)) {
        throw new Error(`SECURITY: Module '${moduleName}' is blocked in game sandbox`);
      }
      return require(moduleName);
    };

    // Block dangerous globals
    const dangerousGlobals = [
      'process', 'global', 'globalThis', '__dirname', '__filename',
      'Buffer', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'
    ];

    dangerousGlobals.forEach(globalName => {
      Object.defineProperty(context, globalName, {
        get: () => {
          throw new Error(`SECURITY: Global '${globalName}' is blocked in game sandbox`);
        },
        set: () => {
          throw new Error(`SECURITY: Global '${globalName}' is blocked in game sandbox`);
        },
        configurable: false,
        enumerable: false
      });
    });

    // Block dangerous functions
    const dangerousFunctions = ['eval', 'Function'];
    dangerousFunctions.forEach(funcName => {
      context[funcName] = () => {
        throw new Error(`SECURITY: Function '${funcName}' is blocked in game sandbox`);
      };
    });

    // Provide safe console (silent no-ops)
    context.console = {
      log: () => {}, // Silent no-op
      error: () => {}, // Silent no-op
      warn: () => {}, // Silent no-op
      info: () => {}, // Silent no-op
      debug: () => {}, // Silent no-op
      trace: () => {}, // Silent no-op
      dir: () => {}, // Silent no-op
      table: () => {} // Silent no-op
    };

    return context;
  }

  /**
   * Handle messages from main server
   */
  handleMainServerMessage(message) {
    try {
      switch (message.type) {
        case 'INIT':
          this.handleInit(message.data);
          break;

        case 'PLAYER_JOIN':
          this.handlePlayerJoin(message.data);
          break;

        case 'PLAYER_ACTION':
          this.handlePlayerAction(message.data);
          break;

        case 'PLAYER_DISCONNECT':
          this.handlePlayerDisconnect(message.data);
          break;

        case 'END_GAME':
          this.handleEndGame();
          break;

        default:
          console.warn(`[GameProcessWrapper:${this.processId}] Unknown message type:`, message.type);
      }
    } catch (error) {
      console.error(`[GameProcessWrapper:${this.processId}] Error handling message:`, error);
      this.sendToMainServer('ERROR', { error: error.message });
    }
  }

  /**
   * Handle game initialization
   */
  handleInit(data) {
    try {
      this.lobbyData = data.lobby;
      this.processId = data.processId;

      // Create API object for game module
      const api = this.createApiObject();

      // Initialize game
      if (typeof this.gameModule.onInit === 'function') {
        this.gameModule.onInit(this.lobbyData, api);
      }

      this.isReady = true;
      this.sendToMainServer('READY', { processId: this.processId, gameId: this.gameId });
      
      console.log(`[GameProcessWrapper:${this.processId}] Game initialized for lobby ${this.lobbyData.id}`);
      
    } catch (error) {
      console.error(`[GameProcessWrapper:${this.processId}] Error initializing game:`, error);
      this.sendToMainServer('ERROR', { error: error.message });
    }
  }

  /**
   * Handle player join
   */
  handlePlayerJoin(data) {
    try {
      if (!this.isReady || !this.gameModule) {
        console.warn(`[GameProcessWrapper:${this.processId}] Not ready for player join`);
        return;
      }

      const api = this.createApiObject();
      
      if (typeof this.gameModule.onPlayerJoin === 'function') {
        this.gameModule.onPlayerJoin(this.lobbyData, api, data.player);
      }

    } catch (error) {
      console.error(`[GameProcessWrapper:${this.processId}] Error handling player join:`, error);
      this.sendToMainServer('ERROR', { error: error.message });
    }
  }

  /**
   * Handle player action
   */
  handlePlayerAction(data) {
    try {
      if (!this.isReady || !this.gameModule) {
        console.warn(`[GameProcessWrapper:${this.processId}] Not ready for player action`);
        return;
      }

      const api = this.createApiObject();
      
      if (typeof this.gameModule.onAction === 'function') {
        this.gameModule.onAction(this.lobbyData, api, data.player, data.data);
      }

    } catch (error) {
      console.error(`[GameProcessWrapper:${this.processId}] Error handling player action:`, error);
      this.sendToMainServer('ERROR', { error: error.message });
    }
  }

  /**
   * Handle player disconnect
   */
  handlePlayerDisconnect(data) {
    try {
      if (!this.isReady || !this.gameModule) {
        return;
      }

      // Game modules can implement onPlayerDisconnect if needed
      if (typeof this.gameModule.onPlayerDisconnect === 'function') {
        const api = this.createApiObject();
        this.gameModule.onPlayerDisconnect(this.lobbyData, api, data.playerId);
      }

    } catch (error) {
      console.error(`[GameProcessWrapper:${this.processId}] Error handling player disconnect:`, error);
      this.sendToMainServer('ERROR', { error: error.message });
    }
  }

  /**
   * Handle end game
   */
  handleEndGame() {
    try {
      if (!this.isReady || !this.gameModule) {
        return;
      }

      const api = this.createApiObject();
      
      if (typeof this.gameModule.onEnd === 'function') {
        this.gameModule.onEnd(this.lobbyData, api);
      }

      console.log(`[GameProcessWrapper:${this.processId}] Game ended for lobby ${this.lobbyData.id}`);
      this.shutdown();

    } catch (error) {
      console.error(`[GameProcessWrapper:${this.processId}] Error ending game:`, error);
      this.sendToMainServer('ERROR', { error: error.message });
    }
  }

  /**
   * Create API object for game module
   */
  createApiObject() {
    return {
      sendToAll: (event, data) => {
        this.sendToMainServer('SEND_TO_ALL', { event, data });
      },
      
      sendToPlayer: (playerId, event, data) => {
        this.sendToMainServer('SEND_TO_PLAYER', { playerId, event, data });
      },
      
      sendToHost: (event, data) => {
        this.sendToMainServer('SEND_TO_HOST', { event, data });
      },
      
      setState: (state) => {
        this.lobbyData.state = state;
        this.sendToMainServer('SET_STATE', { state });
      },
      
      getState: () => {
        return this.lobbyData.state;
      }
    };
  }

  /**
   * Send message to main server
   */
  sendToMainServer(type, data) {
    try {
      if (this.useWebSocket) {
        // WebSocket communication
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
            type,
            data: {
              processId: this.processId,
              gameId: this.gameId,
              ...data
            }
          }));
        } else {
          console.warn(`[GameProcessWrapper:${this.processId}] WebSocket not connected, cannot send message`);
        }
      } else {
        // IPC communication
        if (process.send) {
          process.send({
            type,
            data: {
              processId: this.processId,
              gameId: this.gameId,
              ...data
            }
          });
        } else {
          console.warn(`[GameProcessWrapper:${this.processId}] IPC not available, cannot send message`);
        }
      }
    } catch (error) {
      console.error(`[GameProcessWrapper:${this.processId}] Error sending message to main server:`, error);
    }
  }

  /**
   * Graceful shutdown
   */
  shutdown() {
    console.log(`[GameProcessWrapper:${this.processId}] Shutting down gracefully`);
    
    if (this.useWebSocket) {
      // Close WebSocket server
      if (this.wss) {
        this.wss.close();
      }
      
      // Close HTTP server
      if (this.server) {
        this.server.close();
      }
    }
    
    process.exit(0);
  }
}

// Start the wrapper if this file is run directly
if (require.main === module) {
  new GameProcessWrapper();
}

module.exports = GameProcessWrapper;

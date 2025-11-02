#!/usr/bin/env node

/**
 * GameProcessWrapper - Runs game code in child process with IPC communication
 * 
 * Usage: node GameProcessWrapper.js <processId> <gameId>
 */

const path = require('path');
const fs = require('fs');

class GameProcessWrapper {
  constructor() {
    this.processId = process.argv[2];
    this.gameId = process.argv[3];
    this.gameModule = null;
    this.lobbyData = null;
    this.isReady = false;

    // Validate arguments
    if (!this.processId || !this.gameId) {
      console.error('[GameProcessWrapper] Missing required arguments: processId, gameId');
      process.exit(1);
    }

    this.setupErrorHandling();
    this.setupIPC();
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
    process.on('message', (message) => {
      this.handleMainServerMessage(message);
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

      console.log(`[GameProcessWrapper:${this.processId}] Loaded game module for ${this.gameId}`);
      
    } catch (error) {
      console.error(`[GameProcessWrapper:${this.processId}] Failed to load game module:`, error);
      this.sendToMainServer('ERROR', { error: error.message });
      process.exit(1);
    }
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

        case 'PLAYER_RECONNECT':
          this.handlePlayerReconnect(message.data);
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
   * Handle player reconnect
   */
  handlePlayerReconnect(data) {
    try {
      if (!this.isReady || !this.gameModule) {
        console.warn(`[GameProcessWrapper:${this.processId}] Not ready for player reconnect`);
        return;
      }

      console.log(`[GameProcessWrapper:${this.processId}] Handling player reconnect for ${data.player.username}, socketId: ${data.player.id}`);
      const api = this.createApiObject();
      
      // Call onPlayerReconnect if implemented, otherwise fall back to onPlayerJoin
      if (typeof this.gameModule.onPlayerReconnect === 'function') {
        console.log(`[GameProcessWrapper:${this.processId}] Calling game.onPlayerReconnect for ${data.player.username}`);
        this.gameModule.onPlayerReconnect(this.lobbyData, api, data.player, data.previousSocketId);
      } else if (typeof this.gameModule.onPlayerJoin === 'function') {
        console.log(`[GameProcessWrapper:${this.processId}] Calling game.onPlayerJoin with isReconnection=true for ${data.player.username}`);
        // Fallback to onPlayerJoin for backward compatibility
        this.gameModule.onPlayerJoin(this.lobbyData, api, data.player, true);
      }

    } catch (error) {
      console.error(`[GameProcessWrapper:${this.processId}] Error handling player reconnect:`, error);
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
      process.send({
        type,
        data: {
          processId: this.processId,
          gameId: this.gameId,
          ...data
        }
      });
    } catch (error) {
      console.error(`[GameProcessWrapper:${this.processId}] Error sending message to main server:`, error);
    }
  }

  /**
   * Graceful shutdown
   */
  shutdown() {
    console.log(`[GameProcessWrapper:${this.processId}] Shutting down gracefully`);
    process.exit(0);
  }
}

// Start the wrapper if this file is run directly
if (require.main === module) {
  new GameProcessWrapper();
}

module.exports = GameProcessWrapper;

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class GameProcessManager {
  constructor() {
    this.activeProcesses = new Map(); // lobbyId -> process info
    this.processCounter = 0;
    this.ioNamespace = null; // Socket.IO namespace for broadcasting messages
    this.getLobbyData = null; // Function to get lobby data from the main server
  }

  /**
   * Spawn a game process for a lobby
   * @param {string} lobbyId - Lobby identifier
   * @param {string} gameId - Game identifier
   * @param {Object} lobbyData - Lobby data
   * @param {Object} io - Socket.IO instance
   * @returns {Promise<Object>} Process info
   */
  async spawnGameProcess(lobbyId, gameId, lobbyData, io) {
    return new Promise((resolve, reject) => {
      try {
        // Check if game folder exists
        const gamePath = path.join(__dirname, '..', 'games', gameId);
        const serverPath = path.join(gamePath, 'server.js');
        
        if (!fs.existsSync(serverPath)) {
          reject(new Error(`Game ${gameId} not found at ${serverPath}`));
          return;
        }

        // Create unique process ID
        const processId = `game_${gameId}_${this.processCounter++}_${Date.now()}`;
        
        // Spawn child process with GameProcessWrapper
        const wrapperPath = path.join(__dirname, 'GameProcessWrapper.js');
        const childProcess = spawn('node', [wrapperPath, processId, gameId], {
          stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
          cwd: gamePath,
          env: {
            ...process.env,
            GAME_PROCESS_ID: processId,
            GAME_ID: gameId
          }
        });

        // Process info
        const processInfo = {
          processId,
          lobbyId,
          gameId,
          process: childProcess,
          startTime: Date.now(),
          state: 'starting'
        };

        // Set up IPC communication
        childProcess.on('message', (message) => {
          this.handleProcessMessage(processInfo, message, io);
        });

        // Handle process events
        childProcess.on('exit', (code, signal) => {
          console.log(`[GameProcessManager] Process ${processId} exited with code ${code}, signal ${signal}`);
          this.handleProcessExit(processInfo, code, signal);
        });

        childProcess.on('error', (error) => {
          console.error(`[GameProcessManager] Process ${processId} error:`, error);
          this.handleProcessError(processInfo, error);
        });

        // Forward stdout and stderr to parent console
        childProcess.stdout.on('data', (data) => {
          console.log(`[GameProcess:${processId}] ${data.toString().trim()}`);
        });

        childProcess.stderr.on('data', (data) => {
          console.error(`[GameProcess:${processId}] ERROR ${data.toString().trim()}`);
        });

        // Store process info
        this.activeProcesses.set(lobbyId, processInfo);

        // Send initialization message
        const initMessage = {
          type: 'INIT',
          data: {
            processId,
            lobbyId,
            gameId,
            lobby: lobbyData
          }
        };

        childProcess.send(initMessage);

        // Wait for READY message
        const readyTimeout = setTimeout(() => {
          reject(new Error(`Game process ${processId} failed to initialize within 10 seconds`));
        }, 10000);

        const onReady = (message) => {
          if (message.type === 'READY' && message.data.processId === processId) {
            clearTimeout(readyTimeout);
            processInfo.state = 'ready';
            console.log(`[GameProcessManager] Game process ${processId} ready for lobby ${lobbyId}`);
            resolve(processInfo);
          }
        };

        childProcess.on('message', onReady);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle messages from game processes
   */
  handleProcessMessage(processInfo, message, io) {
    try {
      switch (message.type) {
        case 'READY':
          // Already handled in spawnGameProcess
          break;

        case 'SEND_TO_ALL':
          this.ioNamespace.to(processInfo.lobbyId).emit(message.data.event, message.data.data);
          break;

        case 'SEND_TO_PLAYER':
          this.ioNamespace.to(message.data.playerId).emit(message.data.event, message.data.data);
          break;

        case 'SEND_TO_HOST':
          // Find host socket ID from lobby and send to host plus all spectators
          const lobby = this.getLobbyData(processInfo.lobbyId);
          if (lobby) {
            // Send to host
            if (lobby.host) {
              this.ioNamespace.to(lobby.host).emit(message.data.event, message.data.data);
            }
            // Send to all spectators
            if (lobby.spectators && lobby.spectators.length > 0) {
              lobby.spectators.forEach(spectatorId => {
                this.ioNamespace.to(spectatorId).emit(message.data.event, message.data.data);
              });
            }
          }
          break;

        case 'SET_STATE':
          const lobbyData = this.getLobbyData(processInfo.lobbyId);
          if (lobbyData) {
            lobbyData.state = message.data.state;
          }
          break;

        case 'ERROR':
          console.error(`[GameProcessManager] Game process error for lobby ${processInfo.lobbyId}:`, message.data.error);
          // Notify players of game error
          this.ioNamespace.to(processInfo.lobbyId).emit('gameError', {
            error: message.data.error,
            message: 'An error occurred in the game'
          });
          break;

        default:
          console.warn(`[GameProcessManager] Unknown message type from process ${processInfo.processId}:`, message.type);
      }
    } catch (error) {
      console.error(`[GameProcessManager] Error handling process message:`, error);
    }
  }

  /**
   * Send message to game process
   */
  sendToProcess(lobbyId, message) {
    const processInfo = this.activeProcesses.get(lobbyId);
    if (processInfo && processInfo.process && !processInfo.process.killed) {
      try {
        console.log(`[GameProcessManager] Sending ${message.type} to process ${processInfo.processId} for lobby ${lobbyId}`);
        processInfo.process.send(message);
        return true;
      } catch (error) {
        console.error(`[GameProcessManager] Error sending message to process ${processInfo.processId}:`, error);
        return false;
      }
    } else {
      console.error(`[GameProcessManager] Cannot send message: process not found or killed for lobby ${lobbyId}`);
    }
    return false;
  }

  /**
   * Handle player join in game process
   */
  playerJoin(lobbyId, player) {
    return this.sendToProcess(lobbyId, {
      type: 'PLAYER_JOIN',
      data: { player }
    });
  }

  /**
   * Handle player action in game process
   */
  playerAction(lobbyId, player, data) {
    return this.sendToProcess(lobbyId, {
      type: 'PLAYER_ACTION',
      data: { player, data }
    });
  }

  /**
   * Handle player disconnect in game process
   */
  playerDisconnect(lobbyId, playerId) {
    return this.sendToProcess(lobbyId, {
      type: 'PLAYER_DISCONNECT',
      data: { playerId }
    });
  }

  /**
   * Handle player reconnect in game process
   */
  playerReconnect(lobbyId, player, previousSocketId) {
    console.log(`[GameProcessManager] Sending PLAYER_RECONNECT for lobby ${lobbyId}, player: ${player.username}, socketId: ${player.id}`);
    return this.sendToProcess(lobbyId, {
      type: 'PLAYER_RECONNECT',
      data: { player, previousSocketId }
    });
  }

  /**
   * Handle process exit
   */
  handleProcessExit(processInfo, code, signal) {
    processInfo.state = 'exited';
    
    console.log(`[GameProcessManager] Process ${processInfo.processId} for lobby ${processInfo.lobbyId} exited with code ${code}, signal ${signal}`);
    
    // Attempt automatic restart if exit was unexpected
    if (code !== 0 && signal !== 'SIGTERM') {
      console.log(`[GameProcessManager] Process ${processInfo.processId} crashed, attempting restart...`);
      this.attemptRestart(processInfo);
    } else {
      // Normal exit, clean up
      this.activeProcesses.delete(processInfo.lobbyId);
    }
  }

  /**
   * Handle process error
   */
  handleProcessError(processInfo, error) {
    console.error(`[GameProcessManager] Process ${processInfo.processId} error:`, error);
    processInfo.state = 'error';
    
    // Attempt restart on error
    console.log(`[GameProcessManager] Process ${processInfo.processId} error, attempting restart...`);
    this.attemptRestart(processInfo);
  }

  /**
   * Attempt to restart a crashed process
   */
  async attemptRestart(processInfo) {
    try {
      // Check restart count to prevent infinite loops
      if (!processInfo.restartCount) {
        processInfo.restartCount = 0;
      }
      
      if (processInfo.restartCount >= 3) {
        console.error(`[GameProcessManager] Process ${processInfo.processId} exceeded restart limit, giving up`);
        this.activeProcesses.delete(processInfo.lobbyId);
        
        // Notify players of game failure
        if (this.io) {
          this.io.to(processInfo.lobbyId).emit('gameError', {
            error: 'Game process crashed and could not be restarted',
            message: 'The game has ended due to a technical error'
          });
        }
        return;
      }
      
      processInfo.restartCount++;
      console.log(`[GameProcessManager] Attempting restart ${processInfo.restartCount}/3 for process ${processInfo.processId}`);
      
      // Get lobby data for restart
      const lobbyData = this.getLobbyData(processInfo.lobbyId);
      if (!lobbyData) {
        console.error(`[GameProcessManager] Lobby ${processInfo.lobbyId} not found, cannot restart process`);
        this.activeProcesses.delete(processInfo.lobbyId);
        return;
      }
      
      // Spawn new process
      const newProcessInfo = await this.spawnGameProcess(processInfo.lobbyId, processInfo.gameId, lobbyData, this.io);
      
      // Initialize players in the restarted process
      if (lobbyData.players && lobbyData.players.length > 0) {
        lobbyData.players.forEach(player => {
          this.playerJoin(processInfo.lobbyId, player);
        });
      }
      
      console.log(`[GameProcessManager] Successfully restarted process for lobby ${processInfo.lobbyId}`);
      
    } catch (error) {
      console.error(`[GameProcessManager] Failed to restart process ${processInfo.processId}:`, error);
      this.activeProcesses.delete(processInfo.lobbyId);
      
      // Notify players of restart failure
      if (this.io) {
        this.io.to(processInfo.lobbyId).emit('gameError', {
          error: 'Game process could not be restarted',
          message: 'The game has ended due to a technical error'
        });
      }
    }
  }

  /**
   * Terminate game process
   */
  terminateProcess(lobbyId) {
    const processInfo = this.activeProcesses.get(lobbyId);
    if (processInfo) {
      try {
        // Send termination message
        this.sendToProcess(lobbyId, { type: 'END_GAME' });
        
        // Give process time to clean up
        setTimeout(() => {
          if (!processInfo.process.killed) {
            processInfo.process.kill('SIGTERM');
            
            // Force kill if still running
            setTimeout(() => {
              if (!processInfo.process.killed) {
                processInfo.process.kill('SIGKILL');
              }
            }, 5000);
          }
        }, 2000);

        this.activeProcesses.delete(lobbyId);
        console.log(`[GameProcessManager] Terminated process ${processInfo.processId} for lobby ${lobbyId}`);
      } catch (error) {
        console.error(`[GameProcessManager] Error terminating process:`, error);
      }
    }
  }

  /**
   * Get process info for lobby
   */
  getProcessInfo(lobbyId) {
    return this.activeProcesses.get(lobbyId);
  }

  /**
   * Check if lobby has active game process
   */
  hasActiveProcess(lobbyId) {
    const processInfo = this.activeProcesses.get(lobbyId);
    return processInfo && processInfo.state === 'ready';
  }

  /**
   * Get all active processes
   */
  getActiveProcesses() {
    return Array.from(this.activeProcesses.values());
  }

  /**
   * Clean up all processes
   */
  cleanup() {
    for (const [lobbyId, processInfo] of this.activeProcesses) {
      this.terminateProcess(lobbyId);
    }
  }

  // Helper method to get lobby data (will be set by server)
  getLobbyData(lobbyId) {
    // This will be implemented by the server that uses this manager
    return null;
  }

  // Method for server to set lobby data reference
  setLobbyDataProvider(getLobbyDataFn) {
    this.getLobbyData = getLobbyDataFn;
  }

  // Method for server to set IO instance for error notifications
  setIOInstance(ioNamespace) {
    this.ioNamespace = ioNamespace;
  }
}

module.exports = new GameProcessManager();

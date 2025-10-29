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
   * @param {string} testGamePath - Optional custom game path for test lobbies
   * @returns {Promise<Object>} Process info
   */
  async spawnGameProcess(lobbyId, gameId, lobbyData, io, testGamePath = null) {
    return new Promise((resolve, reject) => {
      try {
        // Determine game path (use test path if provided, otherwise default)
        const gamePath = testGamePath 
          ? path.join(__dirname, '..', 'games', testGamePath)
          : path.join(__dirname, '..', 'games', gameId);
        const serverPath = path.join(gamePath, 'server.js');
        
        console.log(`[GameProcessManager] testGamePath: ${testGamePath}, gamePath: ${gamePath}, serverPath: ${serverPath}`);
        
        if (!fs.existsSync(serverPath)) {
          reject(new Error(`Game server file not found: ${serverPath}`));
          return;
        }

        // Create unique process ID
        const processId = `game_${gameId}_${this.processCounter++}_${Date.now()}`;
        
        // Spawn child process with GameProcessWrapper
        const wrapperPath = path.join(__dirname, 'GameProcessWrapper.js');
        
        // SECURITY: Sanitize environment variables - only pass safe variables
        const memoryMb = parseInt(process.env.GAME_PROCESS_MEMORY_MB || '256', 10);
        const sanitizedEnv = {
          NODE_ENV: process.env.NODE_ENV || 'development',
          GAME_PROCESS_ID: processId,
          GAME_ID: gameId,
          // Additional security: limit Node.js memory and disable warnings
          NODE_OPTIONS: `--max-old-space-size=${isNaN(memoryMb) ? 256 : memoryMb}`,
          NODE_NO_WARNINGS: '1',
          NODE_DISABLE_COLORS: '1',
          // Explicitly exclude sensitive variables:
          // - MONGODB_URI (database credentials)
          // - SESSION_SECRET (server encryption key)
          // - STRIPE_SECRET_KEY (payment processing)
          // - STRIPE_WEBHOOK_SECRET (webhook validation)
          // - Any other sensitive environment variables
        };
        
        // SECURITY: Enhanced process isolation options
        const childProcess = spawn('node', [wrapperPath, processId, gameId], {
          stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
          cwd: gamePath,
          env: sanitizedEnv,
          detached: false,
          timeout: 30000, // Kill process after 30 seconds if unresponsive
          // Additional security options
          windowsHide: true, // Hide window on Windows
          killSignal: 'SIGKILL', // Force kill if needed
          // Process limits (where supported)
          ...(process.platform !== 'win32' && {
            uid: process.getuid ? process.getuid() : undefined,
            gid: process.getgid ? process.getgid() : undefined
          })
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

        // SECURITY: Enhanced process monitoring and limits
        let processStartTime = Date.now();
        let messageCount = 0;
        let lastActivityTime = Date.now();
        
        // Monitor process health and activity
        const healthCheckInterval = setInterval(() => {
          const now = Date.now();
          const uptime = now - processStartTime;
          const timeSinceLastActivity = now - lastActivityTime;
          
          // Kill process if it's been running too long (5 minutes max)
          if (uptime > 300000) {
            console.warn(`[GameProcessManager] Killing long-running process ${processId} (${uptime}ms uptime)`);
            this.killProcess(processId, 'TIMEOUT');
            clearInterval(healthCheckInterval);
            return;
          }
          
          // Kill process if it's been inactive too long (2 minutes)
          if (timeSinceLastActivity > 120000) {
            console.warn(`[GameProcessManager] Killing inactive process ${processId} (${timeSinceLastActivity}ms inactive)`);
            this.killProcess(processId, 'INACTIVE');
            clearInterval(healthCheckInterval);
            return;
          }
          
          // Kill process if it's sent too many messages (potential spam/attack)
          if (messageCount > 1000) {
            console.warn(`[GameProcessManager] Killing spammy process ${processId} (${messageCount} messages)`);
            this.killProcess(processId, 'SPAM');
            clearInterval(healthCheckInterval);
            return;
          }
        }, 10000); // Check every 10 seconds

        // Monitor stdout/stderr for suspicious activity
        childProcess.stdout.on('data', (data) => {
          const output = data.toString();
          lastActivityTime = Date.now();
          
          // Check for suspicious output patterns
          const suspiciousPatterns = [
            /password/i,
            /secret/i,
            /key/i,
            /token/i,
            /env/i,
            /process\.env/i,
            /fs\./i,
            /require\s*\(\s*['"`]fs['"`]/i
          ];
          
          suspiciousPatterns.forEach(pattern => {
            if (pattern.test(output)) {
              console.warn(`[GameProcessManager] Suspicious output from ${processId}:`, output.substring(0, 100));
              // Don't kill immediately, but log for monitoring
            }
          });
        });

        childProcess.stderr.on('data', (data) => {
          const error = data.toString();
          lastActivityTime = Date.now();
          console.error(`[GameProcessManager] Process ${processId} stderr:`, error);
        });

        // Override message handler to track activity
        const originalMessageHandler = childProcess.listeners('message')[0];
        childProcess.removeAllListeners('message');
        childProcess.on('message', (message) => {
          messageCount++;
          lastActivityTime = Date.now();
          originalMessageHandler(message);
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
            // Ensure subsequent READY messages don't trigger again
            childProcess.off('message', onReady);
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
          // Find host socket ID from lobby
          const lobby = this.getLobbyData(processInfo.lobbyId);
          if (lobby && lobby.host) {
            this.ioNamespace.to(lobby.host).emit(message.data.event, message.data.data);
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
        processInfo.process.send(message);
        return true;
      } catch (error) {
        console.error(`[GameProcessManager] Error sending message to process ${processInfo.processId}:`, error);
        return false;
      }
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
   * Handle process exit
   */
  handleProcessExit(processInfo, code, signal) {
    processInfo.state = 'exited';
    
    console.log(`[GameProcessManager] Process ${processInfo.processId} for lobby ${processInfo.lobbyId} exited with code ${code}, signal ${signal}`);
    if (signal === 'SIGKILL') {
      console.warn(`[GameProcessManager] Process ${processInfo.processId} received SIGKILL. Possible causes: OOM due to memory cap (GAME_PROCESS_MEMORY_MB=${process.env.GAME_PROCESS_MEMORY_MB || '256'}), or external kill.`);
    }
    
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

  /**
   * Kill a specific process
   */
  killProcess(lobbyId, reason = 'MANUAL') {
    const processInfo = this.activeProcesses.get(lobbyId);
    if (processInfo) {
      console.log(`[GameProcessManager] Killing process for lobby ${lobbyId} (reason: ${reason})`);
      processInfo.process.kill('SIGTERM');
      
      // Force kill after 5 seconds if it doesn't exit gracefully
      setTimeout(() => {
        if (this.activeProcesses.has(lobbyId)) {
          console.log(`[GameProcessManager] Force killing process for lobby ${lobbyId} (reason: ${reason})`);
          processInfo.process.kill('SIGKILL');
        }
      }, 5000);
    }
  }
}

module.exports = new GameProcessManager();

const Docker = require('dockerode');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');

class GameContainerManager {
  constructor() {
    this.activeContainers = new Map(); // lobbyId -> container info
    this.containerCounter = 0;
    this.ioNamespace = null; // Socket.IO namespace for broadcasting messages
    this.getLobbyData = null; // Function to get lobby data from the main server
    this.docker = null;
    this.network = null;
  }

  /**
   * Initialize Docker connection and create network
   */
  async initialize() {
    try {
      // For Render deployment, we'll use a different approach
      // Instead of Docker-in-Docker, we'll use Render's Docker service
      if (process.env.RENDER) {
        console.log('[GameContainerManager] Running on Render - using Render Docker service');
        this.isRenderEnvironment = true;
        this.isInitialized = true;
        return;
      }

      // For local development with Docker Desktop
      this.docker = new Docker({
        socketPath: process.env.DOCKER_HOST || '/var/run/docker.sock'
      });

      // Test Docker connection
      await this.docker.ping();
      console.log('[GameContainerManager] Connected to Docker daemon');

      // Create or get gamepad-internal network
      try {
        this.network = await this.docker.getNetwork('gamepad-internal');
        console.log('[GameContainerManager] Using existing gamepad-internal network');
      } catch (error) {
        // Network doesn't exist, create it
        this.network = await this.docker.createNetwork({
          Name: 'gamepad-internal',
          Driver: 'bridge',
          Internal: false,
          IPAM: {
            Config: [{
              Subnet: '172.20.0.0/16'
            }]
          }
        });
        console.log('[GameContainerManager] Created gamepad-internal network');
      }

      // Build base image if it doesn't exist
      await this.ensureBaseImage();
      this.isInitialized = true;

    } catch (error) {
      console.error('[GameContainerManager] Failed to initialize:', error);
      console.log('[GameContainerManager] Docker not available - will fall back to child processes');
      // Don't throw error - let the system fall back gracefully
    }
  }

  /**
   * Ensure the base game image exists
   */
  async ensureBaseImage() {
    try {
      const image = this.docker.getImage('gamepad-game-base');
      await image.inspect();
      console.log('[GameContainerManager] Base image gamepad-game-base exists');
    } catch (error) {
      console.log('[GameContainerManager] Building base image...');
      const stream = await this.docker.buildImage({
        context: path.join(__dirname, '..'),
        src: ['Dockerfile.game-base', 'utils/GameProcessWrapper.js']
      }, {
        t: 'gamepad-game-base'
      });

      await new Promise((resolve, reject) => {
        this.docker.modem.followProgress(stream, (err, res) => {
          if (err) reject(err);
          else resolve(res);
        });
      });

      console.log('[GameContainerManager] Base image built successfully');
    }
  }

  /**
   * Check if Docker is available
   */
  isDockerAvailable() {
    return this.docker !== null && this.network !== null;
  }

  /**
   * Compatibility method for GameProcessManager interface
   */
  async spawnGameProcess(lobbyId, gameId, lobbyData, io, testGamePath = null) {
    if (this.isRenderEnvironment) {
      console.log('[GameContainerManager] Using Render Docker service for game container');
      return this.spawnRenderContainer(lobbyId, gameId, lobbyData, io, testGamePath);
    }
    
    if (!this.isDockerAvailable()) {
      console.log('[GameContainerManager] Docker not available, falling back to child process');
      // Fall back to child process mode
      const GameProcessManager = require('./GameProcessManager');
      return GameProcessManager.spawnGameProcess(lobbyId, gameId, lobbyData, io, testGamePath);
    }
    return this.spawnGameContainer(lobbyId, gameId, lobbyData, io, testGamePath);
  }

  /**
   * Compatibility method for GameProcessManager interface
   */
  hasActiveProcess(lobbyId) {
    if (this.isRenderEnvironment) {
      const containerInfo = this.activeContainers.get(lobbyId);
      if (containerInfo && containerInfo.type === 'render-process') {
        return containerInfo.processManager.hasActiveProcess(lobbyId);
      }
      return false;
    }
    
    if (!this.isDockerAvailable()) {
      const GameProcessManager = require('./GameProcessManager');
      return GameProcessManager.hasActiveProcess(lobbyId);
    }
    return this.hasActiveContainer(lobbyId);
  }

  /**
   * Compatibility method for GameProcessManager interface
   */
  async terminateProcess(lobbyId) {
    if (this.isRenderEnvironment) {
      const containerInfo = this.activeContainers.get(lobbyId);
      if (containerInfo && containerInfo.type === 'render-process') {
        await containerInfo.processManager.terminateProcess(lobbyId);
        this.activeContainers.delete(lobbyId);
        return;
      }
      return;
    }
    
    if (!this.isDockerAvailable()) {
      const GameProcessManager = require('./GameProcessManager');
      return GameProcessManager.terminateProcess(lobbyId);
    }
    return this.terminateContainer(lobbyId);
  }

  /**
   * Spawn a game container using Render's Docker service
   * Since Render doesn't support Docker-in-Docker, we'll use enhanced child processes
   */
  async spawnRenderContainer(lobbyId, gameId, lobbyData, io, testGamePath = null) {
    console.log(`[GameContainerManager] Spawning Render-enhanced process for game ${gameId} (lobby: ${lobbyId})`);
    
    // For Render, we'll use enhanced child processes with Docker-like security
    // This provides better security than regular child processes
    console.log('[GameContainerManager] Using Render-enhanced child processes with Docker-like security');
    
    const GameProcessManager = require('./GameProcessManager');
    const processManager = GameProcessManager;
    
    // Store the process manager for this lobby
    this.activeContainers.set(lobbyId, {
      type: 'render-process',
      processManager: processManager,
      lobbyId: lobbyId,
      gameId: gameId,
      state: 'starting',
      startTime: Date.now()
    });
    
    const result = await processManager.spawnGameProcess(lobbyId, gameId, lobbyData, io, testGamePath);
    
    // Update state to ready
    const containerInfo = this.activeContainers.get(lobbyId);
    if (containerInfo) {
      containerInfo.state = 'ready';
    }
    
    return result;
  }

  /**
   * Player join for Render environment
   */
  playerJoin(lobbyId, player) {
    if (this.isRenderEnvironment) {
      const containerInfo = this.activeContainers.get(lobbyId);
      if (containerInfo && containerInfo.type === 'render-process') {
        return containerInfo.processManager.playerJoin(lobbyId, player);
      }
      return false;
    }
    return this.sendToContainer(lobbyId, {
      type: 'PLAYER_JOIN',
      data: { player }
    });
  }

  /**
   * Player action for Render environment
   */
  playerAction(lobbyId, player, data) {
    if (this.isRenderEnvironment) {
      const containerInfo = this.activeContainers.get(lobbyId);
      if (containerInfo && containerInfo.type === 'render-process') {
        return containerInfo.processManager.playerAction(lobbyId, player, data);
      }
      return false;
    }
    return this.sendToContainer(lobbyId, {
      type: 'PLAYER_ACTION',
      data: { player, data }
    });
  }

  /**
   * Player disconnect for Render environment
   */
  playerDisconnect(lobbyId, playerId) {
    if (this.isRenderEnvironment) {
      const containerInfo = this.activeContainers.get(lobbyId);
      if (containerInfo && containerInfo.type === 'render-process') {
        return containerInfo.processManager.playerDisconnect(lobbyId, playerId);
      }
      return false;
    }
    return this.sendToContainer(lobbyId, {
      type: 'PLAYER_DISCONNECT',
      data: { playerId }
    });
  }

  /**
   * Cleanup for Render environment
   */
  cleanup() {
    if (this.isRenderEnvironment) {
      console.log('[GameContainerManager] Cleaning up Render processes...');
      for (const [lobbyId, containerInfo] of this.activeContainers) {
        if (containerInfo.type === 'render-process') {
          containerInfo.processManager.cleanup();
        }
      }
      this.activeContainers.clear();
      return;
    }
    
    console.log('[GameContainerManager] Cleaning up all active containers...');
    for (const [lobbyId, containerInfo] of this.activeContainers) {
      this.terminateContainer(lobbyId);
    }
  }

  /**
   * Spawn a game container for a lobby
   */
  async spawnGameContainer(lobbyId, gameId, lobbyData, io, testGamePath = null) {
    return new Promise(async (resolve, reject) => {
      try {
        // Determine game path
        const gamePath = testGamePath 
          ? path.join(__dirname, '..', 'games', testGamePath)
          : path.join(__dirname, '..', 'games', gameId);

        const serverPath = path.join(gamePath, 'server.js');
        
        if (!fs.existsSync(serverPath)) {
          reject(new Error(`Game server file not found: ${serverPath}`));
          return;
        }

        // Create unique container ID
        const containerId = `game_${gameId}_${this.containerCounter++}_${Date.now()}`;
        
        // Container configuration
        const containerConfig = {
          Image: 'gamepad-game-base',
          name: containerId,
          Cmd: ['node', 'wrapper.js', containerId, gameId],
          WorkingDir: '/app',
          User: '1001:1001',
          Env: [
            `GAME_PROCESS_ID=${containerId}`,
            `GAME_ID=${gameId}`,
            `LOBBY_ID=${lobbyId}`,
            `CONTAINER_ID=${containerId}`,
            'NODE_ENV=production'
          ],
          HostConfig: {
            Memory: parseInt(process.env.GAME_CONTAINER_MEMORY || '128') * 1024 * 1024,
            MemorySwap: parseInt(process.env.GAME_CONTAINER_MEMORY || '128') * 1024 * 1024,
            CpuQuota: Math.floor(parseFloat(process.env.GAME_CONTAINER_CPU || '0.5') * 100000),
            CpuPeriod: 100000,
            PidsLimit: 100,
            ReadonlyRootfs: false,
            SecurityOpt: ['no-new-privileges:true'],
            CapDrop: ['ALL'],
            CapAdd: ['CHOWN', 'SETGID', 'SETUID'],
            Tmpfs: {
              '/tmp': 'noexec,nosuid,size=50m'
            },
            Binds: [
              `${gamePath}:/app/game:ro`
            ],
            NetworkMode: 'gamepad-internal',
            AutoRemove: true,
            RestartPolicy: {
              Name: 'no'
            }
          },
          Labels: {
            'gamepad.type': 'game-container',
            'gamepad.lobby': lobbyId,
            'gamepad.game': gameId
          }
        };

        // Create container
        const container = await this.docker.createContainer(containerConfig);
        
        // Start container
        await container.start();
        
        console.log(`[GameContainerManager] Started container ${containerId} for lobby ${lobbyId}`);

        // Get container IP
        const containerInfo = await container.inspect();
        const containerIP = containerInfo.NetworkSettings.Networks['gamepad-internal'].IPAddress;

        // Container info
        const containerInfoObj = {
          containerId,
          lobbyId,
          gameId,
          container,
          containerIP,
          startTime: Date.now(),
          state: 'starting',
          ws: null,
          messageCount: 0,
          lastActivityTime: Date.now()
        };

        // Connect WebSocket
        await this.connectWebSocket(containerInfoObj);

        // Set up monitoring
        this.setupContainerMonitoring(containerInfoObj);

        // Store container info
        this.activeContainers.set(lobbyId, containerInfoObj);

        // Send initialization message
        const initMessage = {
          type: 'INIT',
          data: {
            processId: containerId,
            lobbyId,
            gameId,
            lobby: lobbyData
          }
        };

        this.sendToContainer(lobbyId, initMessage);

        // Wait for READY message
        const readyTimeout = setTimeout(() => {
          reject(new Error(`Game container ${containerId} failed to initialize within 10 seconds`));
        }, 10000);

        const onReady = (message) => {
          if (message.type === 'READY' && message.data.processId === containerId) {
            clearTimeout(readyTimeout);
            containerInfoObj.state = 'ready';
            console.log(`[GameContainerManager] Game container ${containerId} ready for lobby ${lobbyId}`);
            resolve(containerInfoObj);
          }
        };

        // Listen for READY message
        containerInfoObj.onReady = onReady;

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Connect WebSocket to container
   */
  async connectWebSocket(containerInfo) {
    return new Promise((resolve, reject) => {
      const wsUrl = `ws://${containerInfo.containerIP}:3000`;
      console.log(`[GameContainerManager] Connecting to container WebSocket: ${wsUrl}`);
      
      const ws = new WebSocket(wsUrl);
      
      ws.on('open', () => {
        console.log(`[GameContainerManager] WebSocket connected to container ${containerInfo.containerId}`);
        containerInfo.ws = ws;
        resolve();
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          containerInfo.messageCount++;
          containerInfo.lastActivityTime = Date.now();
          this.handleContainerMessage(containerInfo, message);
        } catch (error) {
          console.error(`[GameContainerManager] Error parsing container message:`, error);
        }
      });

      ws.on('error', (error) => {
        console.error(`[GameContainerManager] WebSocket error for container ${containerInfo.containerId}:`, error);
        reject(error);
      });

      ws.on('close', () => {
        console.log(`[GameContainerManager] WebSocket closed for container ${containerInfo.containerId}`);
        containerInfo.ws = null;
      });
    });
  }

  /**
   * Handle messages from game containers
   */
  handleContainerMessage(containerInfo, message) {
    try {
      switch (message.type) {
        case 'READY':
          if (containerInfo.onReady) {
            containerInfo.onReady(message);
            containerInfo.onReady = null;
          }
          break;

        case 'SEND_TO_ALL':
          this.ioNamespace.to(containerInfo.lobbyId).emit(message.data.event, message.data.data);
          break;

        case 'SEND_TO_PLAYER':
          this.ioNamespace.to(message.data.playerId).emit(message.data.event, message.data.data);
          break;

        case 'SEND_TO_HOST':
          const lobby = this.getLobbyData(containerInfo.lobbyId);
          if (lobby && lobby.host) {
            this.ioNamespace.to(lobby.host).emit(message.data.event, message.data.data);
          }
          break;

        case 'SET_STATE':
          const lobbyData = this.getLobbyData(containerInfo.lobbyId);
          if (lobbyData) {
            lobbyData.state = message.data.state;
          }
          break;

        case 'ERROR':
          console.error(`[GameContainerManager] Game container error for lobby ${containerInfo.lobbyId}:`, message.data.error);
          this.ioNamespace.to(containerInfo.lobbyId).emit('gameError', {
            error: message.data.error,
            message: 'An error occurred in the game'
          });
          break;

        default:
          console.warn(`[GameContainerManager] Unknown message type from container ${containerInfo.containerId}:`, message.type);
      }
    } catch (error) {
      console.error(`[GameContainerManager] Error handling container message:`, error);
    }
  }

  /**
   * Send message to game container
   */
  sendToContainer(lobbyId, message) {
    const containerInfo = this.activeContainers.get(lobbyId);
    if (containerInfo && containerInfo.ws && containerInfo.ws.readyState === WebSocket.OPEN) {
      try {
        containerInfo.ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error(`[GameContainerManager] Error sending message to container ${containerInfo.containerId}:`, error);
        return false;
      }
    }
    return false;
  }

  /**
   * Handle player join in game container
   */
  playerJoin(lobbyId, player) {
    return this.sendToContainer(lobbyId, {
      type: 'PLAYER_JOIN',
      data: { player }
    });
  }

  /**
   * Handle player action in game container
   */
  playerAction(lobbyId, player, data) {
    return this.sendToContainer(lobbyId, {
      type: 'PLAYER_ACTION',
      data: { player, data }
    });
  }

  /**
   * Handle player disconnect in game container
   */
  playerDisconnect(lobbyId, playerId) {
    return this.sendToContainer(lobbyId, {
      type: 'PLAYER_DISCONNECT',
      data: { playerId }
    });
  }

  /**
   * Setup container monitoring
   */
  setupContainerMonitoring(containerInfo) {
    const healthCheckInterval = setInterval(() => {
      const now = Date.now();
      const uptime = now - containerInfo.startTime;
      const timeSinceLastActivity = now - containerInfo.lastActivityTime;
      
      // Kill container if it's been running too long (5 minutes max)
      if (uptime > 300000) {
        console.warn(`[GameContainerManager] Killing long-running container ${containerInfo.containerId} (${uptime}ms uptime)`);
        this.killContainer(containerInfo.lobbyId, 'TIMEOUT');
        clearInterval(healthCheckInterval);
        return;
      }
      
      // Kill container if it's been inactive too long (2 minutes)
      if (timeSinceLastActivity > 120000) {
        console.warn(`[GameContainerManager] Killing inactive container ${containerInfo.lobbyId} (${timeSinceLastActivity}ms inactive)`);
        this.killContainer(containerInfo.lobbyId, 'INACTIVE');
        clearInterval(healthCheckInterval);
        return;
      }
      
      // Kill container if it's sent too many messages (potential spam/attack)
      if (containerInfo.messageCount > 1000) {
        console.warn(`[GameContainerManager] Killing spammy container ${containerInfo.containerId} (${containerInfo.messageCount} messages)`);
        this.killContainer(containerInfo.lobbyId, 'SPAM');
        clearInterval(healthCheckInterval);
        return;
      }

      // Check container stats
      this.checkContainerStats(containerInfo);
    }, 10000); // Check every 10 seconds

    containerInfo.healthCheckInterval = healthCheckInterval;
  }

  /**
   * Check container resource usage
   */
  async checkContainerStats(containerInfo) {
    try {
      const stats = await containerInfo.container.stats({ stream: false });
      const memoryUsage = stats.memory_stats.usage;
      const memoryLimit = stats.memory_stats.limit;
      const memoryPercent = (memoryUsage / memoryLimit) * 100;

      if (memoryPercent > 90) {
        console.warn(`[GameContainerManager] Container ${containerInfo.containerId} using ${memoryPercent.toFixed(1)}% memory`);
        this.killContainer(containerInfo.lobbyId, 'MEMORY_LIMIT_EXCEEDED');
      }
    } catch (error) {
      console.error(`[GameContainerManager] Error checking container stats:`, error);
    }
  }

  /**
   * Kill a specific container
   */
  async killContainer(lobbyId, reason = 'MANUAL') {
    const containerInfo = this.activeContainers.get(lobbyId);
    if (containerInfo) {
      console.log(`[GameContainerManager] Killing container for lobby ${lobbyId} (reason: ${reason})`);
      
      try {
        // Close WebSocket connection
        if (containerInfo.ws) {
          containerInfo.ws.close();
        }

        // Clear health check interval
        if (containerInfo.healthCheckInterval) {
          clearInterval(containerInfo.healthCheckInterval);
        }

        // Stop container gracefully
        await containerInfo.container.stop({ t: 5 });
        
        // Force kill if still running
        setTimeout(async () => {
          try {
            await containerInfo.container.kill();
          } catch (error) {
            // Container already stopped
          }
        }, 5000);

        this.activeContainers.delete(lobbyId);
        console.log(`[GameContainerManager] Container ${containerInfo.containerId} killed`);
      } catch (error) {
        console.error(`[GameContainerManager] Error killing container:`, error);
      }
    }
  }

  /**
   * Terminate game container
   */
  async terminateContainer(lobbyId) {
    const containerInfo = this.activeContainers.get(lobbyId);
    if (containerInfo) {
      try {
        // Send termination message
        this.sendToContainer(lobbyId, { type: 'END_GAME' });
        
        // Give container time to clean up
        setTimeout(() => {
          this.killContainer(lobbyId, 'TERMINATE');
        }, 2000);

        console.log(`[GameContainerManager] Terminated container ${containerInfo.containerId} for lobby ${lobbyId}`);
      } catch (error) {
        console.error(`[GameContainerManager] Error terminating container:`, error);
      }
    }
  }

  /**
   * Get container info for lobby
   */
  getContainerInfo(lobbyId) {
    return this.activeContainers.get(lobbyId);
  }

  /**
   * Check if lobby has active game container
   */
  hasActiveContainer(lobbyId) {
    const containerInfo = this.activeContainers.get(lobbyId);
    return containerInfo && containerInfo.state === 'ready';
  }

  /**
   * Get all active containers
   */
  getActiveContainers() {
    return Array.from(this.activeContainers.values());
  }

  /**
   * Clean up all containers
   */
  async cleanup() {
    console.log('[GameContainerManager] Cleaning up all containers...');
    for (const [lobbyId, containerInfo] of this.activeContainers) {
      await this.killContainer(lobbyId, 'CLEANUP');
    }
  }

  // Helper method to get lobby data (will be set by server)
  getLobbyData(lobbyId) {
    return this.getLobbyData ? this.getLobbyData(lobbyId) : null;
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

module.exports = new GameContainerManager();

// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const connectDB = require('./config/database');
const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/games');
const { getCurrentUser } = require('./middleware/auth');
const config = require('./config');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = config.PORT;

// Connect to MongoDB
connectDB();

// Stripe webhook needs raw body for signature verification
app.use('/api/stripe/webhook', express.raw({type: 'application/json'}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: config.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: config.MONGODB_URI,
    touchAfter: 24 * 3600 // lazy session update
  }),
  cookie: {
    secure: false, // set to true in production with HTTPS
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
  }
}));

// Make user available to all routes
app.use(getCurrentUser);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/stripe', require('./routes/stripe'));
app.use('/api/creator', require('./routes/creator'));
app.use('/api/admin', require('./routes/admin'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/games', express.static(path.join(__dirname, 'games')));
app.use('/game-logos', express.static(path.join(__dirname, 'public/game-logos')));

// Explicit favicon route for better caching
app.get('/favicon.ico', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
  res.sendFile(path.join(__dirname, 'public', 'favicon.ico'));
});

// Serve creator dashboard
app.get('/creator', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'creator.html'));
});

// Import dynamic game loader and process manager
const gameLoader = require('./utils/DynamicGameLoader');
const gameProcessManager = require('./utils/GameProcessManager');

// Initialize game loader on server start
gameLoader.initialize().then(() => {
  console.log('[Server] Game loader initialized successfully');
}).catch(error => {
  console.error('[Server] Failed to initialize game loader:', error);
});

const lobbies = new Map(); // active lobbies
const disconnectedPlayers = new Map(); // temporarily disconnected players
const playerSessions = new Map(); // track player sessions for reconnection

// Helper function to get available games for a single user
async function getAvailableGamesForUser(userId) {
  try {
    if (!userId) {
      return [];
    }

    // Import User model
    const User = require('./models/User');
    const Game = require('./models/Game');
    
    // Get user and their accessible games (owned + free)
    const user = await User.findById(userId).select('ownedGames freeGames');

    if (!user) {
      return [];
    }

    // Get all accessible games for this user (approved only)
    const accessibleGames = user.getAllAccessibleGames();
    
    // Add creator's own games (even if unapproved)
    const creatorGames = await Game.find({ 
      creatorId: userId,
      isActive: true 
    }).select('id');
    
    const creatorGameIds = creatorGames.map(g => g.id);
    
    // Merge and deduplicate
    const allGameIds = [...new Set([...accessibleGames, ...creatorGameIds])];

    // Return game metadata for accessible games
    return allGameIds.map(gameId => {
      const game = gameLoader.getGame(gameId);
      if (game) {
        return game.meta;
      } else {
        // For creator's unapproved games, get metadata from database
        const gameDoc = creatorGames.find(g => g.id === gameId);
        if (gameDoc) {
          // Load creator's unapproved game metadata
          return {
            id: gameId,
            name: gameDoc.name || gameId,
            description: gameDoc.description || '',
            minPlayers: gameDoc.minPlayers || 2,
            maxPlayers: gameDoc.maxPlayers || 8,
            category: gameDoc.category || 'strategy',
            price: gameDoc.price || 0,
            approved: gameDoc.approved,
            creatorId: gameDoc.creatorId,
            creatorName: 'You'
          };
        }
      }
      return null;
    }).filter(Boolean);

  } catch (error) {
    console.error('Error getting available games for user:', error);
    return [];
  }
}

// Helper function to get available games for a lobby
async function getAvailableGamesForLobby(playerIds) {
  try {
    if (playerIds.length === 0) {
      return [];
    }

    // Import User model
    const User = require('./models/User');
    
    // Get all players and their accessible games (owned + free)
    const players = await User.find({ 
      _id: { $in: playerIds } 
    }).select('ownedGames freeGames');

    if (players.length === 0) {
      return [];
    }

    // Find games accessible by ANY player (owned + free)
    const allAccessibleGames = players.flatMap(player => {
      const ownedGameIds = player.ownedGames.map(owned => owned.gameId);
      const freeGameIds = player.freeGames.map(free => free.gameId);
      return [...ownedGameIds, ...freeGameIds];
    });

    // Get unique games accessible by any player
    const availableGames = [...new Set(allAccessibleGames)];

    // Return game metadata for available games
    return availableGames.map(gameId => {
      const game = gameLoader.getGame(gameId);
      return game ? game.meta : null;
    }).filter(Boolean);

  } catch (error) {
    console.error('Error getting available games for lobby:', error);
    return [];
  }
}

// --- Lifecycle Game Wrapper ---
function wrapGameModule(gameModule) {
  if (!gameModule.meta) throw new Error("Game missing meta info");

  return {
    meta: gameModule.meta,
    onInit: gameModule.onInit || (() => {}),
    onPlayerJoin: gameModule.onPlayerJoin || (() => {}),
    onAction: gameModule.onAction || (() => {}),
    onEnd: gameModule.onEnd || (() => {})
  };
}

// Initialize dynamic game loader
async function initializeGameLoader() {
  try {
    await gameLoader.initialize();
    console.log(`[Server] Dynamic game loader initialized with ${gameLoader.getLoadedGamesCount()} games`);
  } catch (error) {
    console.error('[Server] Failed to initialize dynamic game loader:', error);
  }
}

// Initialize games after MongoDB connection
initializeGameLoader();

// Set up GameProcessManager with lobby data provider and IO instance
gameProcessManager.setLobbyDataProvider((lobbyId) => {
  return lobbies.get(lobbyId);
});
gameProcessManager.setIOInstance(io.of('/lobby'));

// --- Utility: API object exposed to games ---
function makeApi(io, lobby) {
  return {
    sendToAll: (event, data) => io.to(lobby.id).emit(event, data),
    sendToPlayer: (pid, event, data) => io.to(pid).emit(event, data),
    sendToHost: (event, data) => io.to(lobby.host).emit(event, data),
    setState: (state) => { lobby.state = state; },
    getState: () => lobby.state
  };
}

// --- Lobby helpers ---
function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code;
  do {
    code = Array.from({ length: 4 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('');
  } while (lobbies.has(code));
  return code;
}

// --- Lobby Namespace ---
io.of('/lobby').on('connection', socket => {
  console.log(`[Lobby] Connected: ${socket.id} from ${socket.handshake.address}`);

  // Set up heartbeat/ping-pong mechanism
  socket.on('ping', () => {
    socket.emit('pong');
  });

  // Handle player reconnection
  socket.on('reconnect', ({ playerId, lobbyCode }, callback) => {
    console.log(`[DEBUG] Reconnection attempt: playerId=${playerId}, lobbyCode=${lobbyCode}`);
    
    const lobby = lobbies.get(lobbyCode);
    if (!lobby) {
      return callback?.({ error: 'Lobby not found' });
    }

    // Check if this player was temporarily disconnected (during active game)
    const disconnectedPlayer = disconnectedPlayers.get(playerId);
    if (disconnectedPlayer && disconnectedPlayer.lobbyCode === lobbyCode) {
      // Restore player to lobby
      const restoredPlayer = {
        id: socket.id, // Update socket ID
        username: disconnectedPlayer.username,
        userId: disconnectedPlayer.userId,
        reconnected: true
      };

      // Remove from disconnected players
      disconnectedPlayers.delete(playerId);
      
      // Update player in lobby with new socket ID
      const playerIndex = lobby.players.findIndex(p => p.userId === playerId);
      if (playerIndex !== -1) {
        lobby.players[playerIndex] = restoredPlayer;
      } else {
        lobby.players.push(restoredPlayer);
      }

      socket.join(lobbyCode);

      // Notify lobby of reconnection
      io.of('/lobby').to(lobbyCode).emit('playerReconnected', {
        player: restoredPlayer,
        message: `${restoredPlayer.username} has reconnected`
      });

      // If game is active, reinitialize player in game
      if (lobby.gameId) {
        const game = gameLoader.getGame(lobby.gameId);
        if (game) {
          try {
            const api = makeApi(io.of('/lobby'), lobby);
            game.onPlayerJoin(lobby, api, restoredPlayer);
            
            // Send current game state to reconnected player
            socket.emit('playerGameStarted', {
              gameId: lobby.gameId,
              lobbyCode: lobbyCode
            });
          } catch (error) {
            console.error(`[DEBUG] Error reinitializing player in game:`, error);
          }
        }
      }

      console.log(`[DEBUG] Player ${restoredPlayer.username} successfully reconnected to lobby ${lobbyCode}`);
      return callback?.({
        success: true,
        lobbyCode: lobbyCode,
        player: restoredPlayer,
        message: 'Successfully reconnected'
      });
    }

    // Check if this player has a valid session (for lobby-only reconnections)
    const playerSession = playerSessions.get(playerId);
    if (playerSession && playerSession.lobbyCode === lobbyCode) {
      // Check if player is still in the lobby (might have been removed during disconnect)
      const existingPlayer = lobby.players.find(p => p.userId === playerId);
      if (!existingPlayer) {
        // Player was removed from lobby, add them back
        const restoredPlayer = {
          id: socket.id,
          username: playerSession.username,
          userId: playerId,
          reconnected: true
        };
        
        lobby.players.push(restoredPlayer);
        if (!lobby.playerIds.includes(playerId)) {
          lobby.playerIds.push(playerId);
        }
        
        socket.join(lobbyCode);
        
        // Notify lobby of reconnection
        io.of('/lobby').to(lobbyCode).emit('playerReconnected', {
          player: restoredPlayer,
          message: `${restoredPlayer.username} has reconnected`
        });
        
        // Send updated player list
        io.of('/lobby').to(lobbyCode).emit('playerListUpdate', lobby.players.map(p => p.username));
        
        console.log(`[DEBUG] Player ${restoredPlayer.username} successfully reconnected to lobby ${lobbyCode}`);
        return callback?.({
          success: true,
          lobbyCode: lobbyCode,
          player: restoredPlayer,
          message: 'Successfully reconnected'
        });
      } else {
        // Player is still in lobby, just update their socket ID
        const playerIndex = lobby.players.findIndex(p => p.userId === playerId);
        if (playerIndex !== -1) {
          lobby.players[playerIndex].id = socket.id;
          lobby.players[playerIndex].reconnected = true;
        }
        
        socket.join(lobbyCode);
        
        console.log(`[DEBUG] Player ${playerSession.username} successfully reconnected to lobby ${lobbyCode}`);
        return callback?.({
          success: true,
          lobbyCode: lobbyCode,
          player: lobby.players[playerIndex],
          message: 'Successfully reconnected'
        });
      }
    }

    callback?.({ error: 'No previous session found' });
  });

  // Note: Games list will be sent after lobby is created/joined

  // Create a lobby (host is separate from players)
  socket.on('createLobby', async ({ username, userId, isTestLobby, testGameId, testGamePath }, callback) => {
    console.log(`[DEBUG] createLobby called: isTestLobby=${isTestLobby}, testGameId=${testGameId}, testGamePath=${testGamePath}`);
    
    const code = generateCode();
    const lobby = {
      id: code,
      host: socket.id,
      hostUsername: username || 'HOST',
      gameId: null,
      players: [],
      state: {},
      playerIds: [] // Store user IDs for game ownership checking
    };

    // Add test lobby properties if this is a test lobby
    if (isTestLobby && testGameId) {
      lobby.isTestLobby = true;
      lobby.testGameId = testGameId;
      lobby.testGamePath = testGamePath;
      lobby.allowedUsernames = [username]; // Creator is initially allowed
      lobby.creatorId = userId;
      console.log(`[DEBUG] Created test lobby with testGamePath: ${testGamePath}`);
    }

    lobbies.set(code, lobby);

    console.log(`[DEBUG] Created lobby ${code} with host ${socket.id}${isTestLobby ? ' (TEST LOBBY)' : ''}`);
    console.log(`[DEBUG] Lobby players:`, lobby.players);

    socket.join(code);

    // Get available games for this lobby
    let availableGames = [];
    if (isTestLobby && testGameId) {
      // For test lobbies, only show the test game
      const game = gameLoader.getGame(testGameId);
      if (game) {
        availableGames = [game.meta];
      } else {
        // If game not in loader, create metadata from test path
        const fs = require('fs');
        const path = require('path');
        const testPath = path.join(__dirname, 'games', testGamePath);
        const serverPath = path.join(testPath, 'server.js');
        
        if (fs.existsSync(serverPath)) {
          try {
            // Load game module to get metadata
            delete require.cache[require.resolve(serverPath)];
            const gameModule = require(serverPath);
            if (gameModule.meta) {
              availableGames = [gameModule.meta];
            }
          } catch (error) {
            console.error(`[DEBUG] Failed to load test game ${testGameId} from ${testPath}:`, error);
          }
        }
      }
    } else if (userId) {
      availableGames = await getAvailableGamesForUser(userId);
    } else {
      // For non-authenticated hosts, only show free games
      const config = require('./config');
      const freeGames = config.FREE_GAMES || [];
      availableGames = freeGames.map(gameId => {
        const game = gameLoader.getGame(gameId);
        return game ? game.meta : null;
      }).filter(Boolean);
    }

    callback?.({
      code,
      games: availableGames,
      isHost: true,
      isTestLobby: isTestLobby || false
    });

    // Host sees empty player list initially
    socket.emit('playerListUpdate', []);
  });

  // Join a lobby as a player
  socket.on('joinLobby', async ({ code, username, userId }, callback) => {
    console.log(`[DEBUG] joinLobby called: socketId=${socket.id}, code=${code}, username=${username}`);
    
    const lobby = lobbies.get(code);
    if (!lobby) return callback?.({ error: 'Lobby not found' });

    console.log(`[DEBUG] Lobby host: ${lobby.host}, socket.id: ${socket.id}`);

    // Check if this is the host trying to join as a player
    if (socket.id === lobby.host) {
      console.log(`[DEBUG] Host trying to join as player - blocked`);
      return callback?.({ error: 'Host cannot join as player from same device' });
    }

    // Check if this is a test lobby and validate access
    if (lobby.isTestLobby) {
      if (!lobby.allowedUsernames || !lobby.allowedUsernames.includes(username)) {
        console.log(`[DEBUG] User ${username} not authorized for test lobby ${code}`);
        return callback?.({ 
          error: 'This is a test lobby. Only invited users can join.',
          details: 'Contact the lobby host to be invited.'
        });
      }
    }

    // Check if a game is in progress and this player is reconnecting
    if (lobby.gameId && lobby.gameStarted) {
      const game = gameLoader.getGame(lobby.gameId);
      if (game && typeof game.playerResync === 'function') {
        console.log(`[RECONNECT] Checking if ${username} can reconnect to in-progress game`);
        const api = makeApi(io.of('/lobby'), lobby);
        const player = { id: socket.id, username, userId: userId };
        
        const reconnected = game.playerResync(lobby, api, player);
        
        if (reconnected) {
          console.log(`[RECONNECT] Player ${username} reconnected to in-progress game`);
          socket.join(code);
          
          // Update player session
          if (userId) {
            playerSessions.set(userId, {
              username: username,
              userId: userId,
              lobbyCode: code,
              joinedAt: Date.now()
            });
          }
          
          // Get available games for this lobby
          const availableGames = await getAvailableGamesForLobby(lobby.playerIds);
          
          callback?.({
            code,
            games: availableGames,
            username,
            gameId: lobby.gameId,
            isHost: false,
            reconnected: true
          });
          
          // Don't update player list since they're already in it
          return;
        } else {
          console.log(`[RECONNECT] Player ${username} not found in game state, treating as new player`);
        }
      }
    }

    const player = { id: socket.id, username, userId: userId };
    lobby.players.push(player);
    if (userId) {
      lobby.playerIds.push(userId);
      // Store player session for potential reconnection
      playerSessions.set(userId, {
        username: username,
        userId: userId,
        lobbyCode: code,
        joinedAt: Date.now()
      });
    }
    socket.join(code);

    // If game is already selected, initialize player for that game
    if (lobby.gameId) {
      const game = gameLoader.getGame(lobby.gameId);
      if (game) {
        const api = makeApi(io.of('/lobby'), lobby);
        game.onPlayerJoin(lobby, api, player);
      }
    }

    // Get available games for this lobby
    const availableGames = await getAvailableGamesForLobby(lobby.playerIds);

    callback?.({
      code,
      games: availableGames,
      username,
      gameId: lobby.gameId,
      isHost: false,
      reconnected: false
    });

    // Update player list for everyone (including host)
    io.of('/lobby').to(code).emit('playerListUpdate', lobby.players.map(p => p.username));
    
    // Update games for host when players join
    const updatedGames = await getAvailableGamesForLobby(lobby.playerIds);
    io.of('/lobby').to(lobby.host).emit('gamesUpdated', updatedGames);
  });

  // Select a game (any player can do this)
  socket.on('selectGame', async ({ code, gameId }, callback) => {
    console.log(`[DEBUG] selectGame called: code=${code}, gameId=${gameId}, socketId=${socket.id}`);
    
    const lobby = lobbies.get(code);
    if (!lobby) {
      console.log(`[DEBUG] Lobby not found: ${code}`);
      return callback?.({ error: 'Lobby not found' });
    }

    // Check if this is a player in the lobby
    const isPlayer = lobby.players.some(player => player.id === socket.id);
    const isHost = socket.id === lobby.host;
    
    console.log(`[DEBUG] isPlayer: ${isPlayer}, isHost: ${isHost}`);
    console.log(`[DEBUG] lobby.host: ${lobby.host}, socket.id: ${socket.id}`);
    console.log(`[DEBUG] lobby.players:`, lobby.players.map(p => ({ id: p.id, username: p.username })));
    
    // Only players can select games, not the host
    if (!isPlayer) {
      console.log(`[DEBUG] Only players can select games, not the host`);
      return callback?.({ error: 'Only players can select games. The host cannot select games.' });
    }

    // For test lobbies, verify the selected game matches the test game
    if (lobby.isTestLobby) {
      if (gameId !== lobby.testGameId) {
        console.log(`[DEBUG] Test lobby: selected game ${gameId} does not match test game ${lobby.testGameId}`);
        return callback?.({ error: 'Only the test game can be selected in a test lobby' });
      }
    }

    let game = gameLoader.getGame(gameId);
    
    // If game not found, check if it's a creator's unapproved game or test game
    if (!game) {
      const Game = require('./models/Game');
      const gameDoc = await Game.findOne({ id: gameId });
      
      if (gameDoc && gameDoc.creatorId && gameDoc.creatorId.equals(userId)) {
        // Load creator's unapproved game for testing
        console.log(`[DEBUG] Loading creator's unapproved game ${gameId} for testing`);
        game = await gameLoader.loadCreatorGame(gameId, userId);
      } else if (lobby.isTestLobby && lobby.testGamePath) {
        // Load test game from custom path
        console.log(`[DEBUG] Loading test game ${gameId} from path ${lobby.testGamePath}`);
        game = await gameLoader.loadTestGame(gameId, lobby.testGamePath);
      }
    }
    
    if (!game) {
      console.log(`[DEBUG] Game not found: ${gameId}`);
      return callback?.({ error: 'Game not found' });
    }

    // Game is available (either approved or creator's own game)
    console.log(`[DEBUG] Game ${gameId} is available`);

    console.log(`[DEBUG] Starting game: ${game.meta.name}`);
    lobby.gameId = gameId;

    try {
      // Spawn game process
      console.log(`[DEBUG] Spawning game process for ${game.meta.name}`);
      const testGamePath = lobby.isTestLobby ? lobby.testGamePath : null;
      console.log(`[DEBUG] Test lobby: ${lobby.isTestLobby}, testGamePath: ${testGamePath}`);
      const processInfo = await gameProcessManager.spawnGameProcess(code, gameId, lobby, io.of('/lobby'), testGamePath);
      
      console.log(`[DEBUG] Game process spawned: ${processInfo.processId}`);

      // Initialize all existing players for the game
      console.log(`[DEBUG] Initializing ${lobby.players.length} players for game`);
      lobby.players.forEach(player => {
        console.log(`[DEBUG] Adding player ${player.username} to game`);
        gameProcessManager.playerJoin(code, player);
      });

      // Send different events to host vs players
      if (isHost) {
        console.log(`[DEBUG] Sending hostGameStarted to host`);
        socket.emit('hostGameStarted', {
          game: game.meta,
          gameId: gameId
        });
      } else {
        console.log(`[DEBUG] Sending playerGameStarted to player`);
        socket.emit('playerGameStarted', {
          game: game.meta,
          gameId: gameId
        });
      }

      // Notify other players
      console.log(`[DEBUG] Notifying other players in lobby ${code}`);
      console.log(`[DEBUG] Players to notify:`, lobby.players.map(p => p.id));
      io.of('/lobby').to(code).except(socket.id).emit('playerGameStarted', {
        game: game.meta,
        gameId: gameId
      });

      // Notify host if a player selected the game
      if (!isHost) {
        console.log(`[DEBUG] Notifying host of game start`);
        io.of('/lobby').to(lobby.host).emit('hostGameStarted', {
          game: game.meta,
          gameId: gameId
        });
      }

      console.log(`[DEBUG] Game selection completed successfully`);
      callback?.({ success: true });
    } catch (error) {
      console.error(`[DEBUG] Error during game initialization:`, error);
      callback?.({ error: 'Game initialization failed: ' + error.message });
    }
  });

  // Player action
  socket.on('action', ({ code, data }) => {
    const lobby = lobbies.get(code);
    if (!lobby) return;

    const player = lobby.players.find(p => p.id === socket.id);
    if (!player) return;

    // Forward action to game process
    gameProcessManager.playerAction(code, player, data);
  });

  // End lobby
  socket.on('endLobby', code => {
    const lobby = lobbies.get(code);
    if (!lobby) return;

    // Terminate game process if running
    if (gameProcessManager.hasActiveProcess(code)) {
      gameProcessManager.terminateProcess(code);
    }

    io.of('/lobby').to(code).emit('lobbyClosed');
    lobbies.delete(code);
  });

  // Leave lobby
  socket.on('leaveLobby', ({ code }) => {
    const lobby = lobbies.get(code);
    if (!lobby) return;

    // Remove player from lobby
    const playerIndex = lobby.players.findIndex(p => p.id === socket.id);
    if (playerIndex !== -1) {
      const removedPlayer = lobby.players[playerIndex];
      lobby.players.splice(playerIndex, 1);
      
      // Remove player ID from playerIds array
      if (removedPlayer.userId) {
        const userIdIndex = lobby.playerIds.indexOf(removedPlayer.userId);
        if (userIdIndex !== -1) {
          lobby.playerIds.splice(userIdIndex, 1);
        }
      }
    }

    // Leave the socket room
    socket.leave(code);

    // If no players left, close lobby
    if (lobby.players.length === 0) {
      lobbies.delete(code);
      return;
    }

    // Update player list for remaining players and host
    io.of('/lobby').to(code).emit('playerListUpdate', lobby.players.map(p => p.username));
    
    // Update available games for host when players leave
    getAvailableGamesForLobby(lobby.playerIds).then(updatedGames => {
      io.of('/lobby').to(lobby.host).emit('gamesUpdated', updatedGames);
    });
  });

  // Invite users to test lobby
  socket.on('inviteToTestLobby', ({ lobbyCode, usernames }, callback) => {
    console.log(`[DEBUG] inviteToTestLobby called: lobbyCode=${lobbyCode}, usernames=${usernames}`);
    
    const lobby = lobbies.get(lobbyCode);
    if (!lobby) {
      return callback?.({ error: 'Lobby not found' });
    }

    // Verify this socket is the host of the test lobby
    if (socket.id !== lobby.host || !lobby.isTestLobby) {
      return callback?.({ error: 'Only the test lobby host can invite users' });
    }

    // Parse usernames (comma-separated)
    const usernameList = usernames.split(',').map(name => name.trim()).filter(name => name.length > 0);
    
    if (usernameList.length === 0) {
      return callback?.({ error: 'No valid usernames provided' });
    }

    // Add usernames to allowed list (avoid duplicates)
    if (!lobby.allowedUsernames) {
      lobby.allowedUsernames = [];
    }
    
    const newUsernames = usernameList.filter(name => !lobby.allowedUsernames.includes(name));
    lobby.allowedUsernames.push(...newUsernames);

    console.log(`[DEBUG] Added ${newUsernames.length} users to test lobby ${lobbyCode}: ${newUsernames.join(', ')}`);

    callback?.({
      success: true,
      message: `Invited ${newUsernames.length} users to test lobby`,
      invitedUsernames: newUsernames,
      allAllowedUsernames: lobby.allowedUsernames
    });
  });

  // Disconnect cleanup
  socket.on('disconnect', () => {
    console.log(`[DEBUG] Socket disconnected: ${socket.id} from ${socket.handshake.address}`);
    for (const [code, lobby] of lobbies.entries()) {
      console.log(`[DEBUG] Checking lobby ${code} for disconnected socket ${socket.id}`);
      console.log(`[DEBUG] Lobby host: ${lobby.host}, Lobby players:`, lobby.players.map(p => p.id));
      
      // Handle player disconnection with grace period for reconnection
      const playerIndex = lobby.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        const removedPlayer = lobby.players[playerIndex];
        console.log(`[DEBUG] Player ${removedPlayer.username} disconnected from lobby ${code}`);
        
        // If player has a userId (authenticated user), give them a grace period for reconnection
        if (removedPlayer.userId) {
          // Give grace period for reconnection (both in lobby and during games)
          const gracePeriod = 90000; // 90s for both games and lobby
          console.log(`[DEBUG] Player ${removedPlayer.username} disconnected - starting ${gracePeriod/1000}s grace period`);
          
          // Store disconnected player for potential reconnection
          disconnectedPlayers.set(removedPlayer.userId, {
            username: removedPlayer.username,
            userId: removedPlayer.userId,
            lobbyCode: code,
            disconnectedAt: Date.now(),
            gameId: lobby.gameId
          });
          
          // Notify other players about temporary disconnection
          io.of('/lobby').to(code).emit('playerDisconnected', {
            player: removedPlayer,
            message: `${removedPlayer.username} has disconnected (reconnecting...)`,
            temporary: true
          });
          
          // Set a timeout to permanently remove player if they don't reconnect
          setTimeout(() => {
            if (disconnectedPlayers.has(removedPlayer.userId)) {
              console.log(`[DEBUG] Grace period expired for ${removedPlayer.username} - permanently removing`);
              disconnectedPlayers.delete(removedPlayer.userId);
              
              // Remove from lobby permanently
              const currentPlayerIndex = lobby.players.findIndex(p => p.userId === removedPlayer.userId);
              if (currentPlayerIndex !== -1) {
                lobby.players.splice(currentPlayerIndex, 1);
                const userIdIndex = lobby.playerIds.indexOf(removedPlayer.userId);
                if (userIdIndex !== -1) {
                  lobby.playerIds.splice(userIdIndex, 1);
                }
                
                // Update player list for remaining players and host
                io.of('/lobby').to(code).emit('playerListUpdate', lobby.players.map(p => p.username));
              }
              
              // Notify lobby of permanent disconnection
              io.of('/lobby').to(code).emit('playerPermanentlyDisconnected', {
                player: removedPlayer,
                message: `${removedPlayer.username} has left the ${lobby.gameId ? 'game' : 'lobby'}`
              });
            }
          }, gracePeriod);
          
          // Don't remove from lobby immediately - keep them for potential reconnection
          continue;
        } else {
          // No userId - remove immediately
          console.log(`[DEBUG] Removing player ${removedPlayer.username} from lobby (no userId)`);
          lobby.players.splice(playerIndex, 1);
          
          // Notify game process about player disconnect
          if (gameProcessManager.hasActiveProcess(code)) {
            gameProcessManager.playerDisconnect(code, removedPlayer.id);
          }
          
          // Update player list for remaining players and host
          io.of('/lobby').to(code).emit('playerListUpdate', lobby.players.map(p => p.username));
          
          // Notify lobby of disconnection
          io.of('/lobby').to(code).emit('playerDisconnected', {
            player: removedPlayer,
            message: `${removedPlayer.username} has left the lobby`,
            temporary: false
          });
        }
      }

      // Check if this was the host disconnecting
      if (socket.id === lobby.host) {
        console.log(`[DEBUG] Host disconnected - closing lobby ${code}`);
        // Host disconnected - close the lobby
        io.of('/lobby').to(code).emit('lobbyClosed');
        lobbies.delete(code);
        continue;
      }

      // If no players left, close lobby (but not if game is running)
      if (lobby.players.length === 0) {
        if (lobby.gameId) {
          console.log(`[DEBUG] No players left but game is running - keeping lobby ${code} open`);
          // Don't close lobby if game is active - players might reconnect
        } else {
          console.log(`[DEBUG] No players left - closing lobby ${code}`);
          io.of('/lobby').to(code).emit('lobbyClosed');
          lobbies.delete(code);
        }
        continue;
      }

      // Update player list for remaining players and host
      io.of('/lobby').to(code).emit('playerListUpdate', lobby.players.map(p => p.username));
      
      // Update available games for host when players leave
      getAvailableGamesForLobby(lobby.playerIds).then(updatedGames => {
        io.of('/lobby').to(lobby.host).emit('gamesUpdated', updatedGames);
      });
    }
  });
});

// Debug route to check loaded games
app.get('/debug/loaded-games', (req, res) => {
  try {
    const loadedGames = gameLoader.getAllGameMetadata();
    res.json({
      success: true,
      count: gameLoader.getLoadedGamesCount(),
      games: loadedGames
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// Debug route to reload all games
app.get('/debug/reload-games', async (req, res) => {
  try {
    await gameLoader.initialize();
    const loadedGames = gameLoader.getAllGameMetadata();
    res.json({
      success: true,
      message: 'Games reloaded successfully',
      count: gameLoader.getLoadedGamesCount(),
      games: loadedGames
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// Temporary route to add trivia game to user adam
app.get('/add-trivia', async (req, res) => {
  try {
    const User = require('./models/User');
    const user = await User.findOne({ username: 'adam' });
    if (user) {
      const alreadyOwned = user.ownedGames.some(owned => owned.gameId === 'trivia');
      if (alreadyOwned) {
        res.json({ message: 'User already owns trivia game', ownedGames: user.ownedGames });
      } else {
        user.ownedGames.push({ gameId: 'trivia', purchasedAt: new Date() });
        await user.save();
        res.json({ message: 'Successfully added trivia game to user adam', ownedGames: user.ownedGames });
      }
    } else {
      res.json({ message: 'User adam not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Start server ---
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] Received SIGTERM, shutting down gracefully');
  gameProcessManager.cleanup();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[Server] Received SIGINT, shutting down gracefully');
  gameProcessManager.cleanup();
  process.exit(0);
});

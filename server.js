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

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/games', express.static(path.join(__dirname, 'games')));

const games = new Map();   // all loaded games
const lobbies = new Map(); // active lobbies

// Helper function to get available games for a single user
async function getAvailableGamesForUser(userId) {
  try {
    if (!userId) {
      return [];
    }

    // Import User model
    const User = require('./models/User');
    
    // Get user and their accessible games (owned + free)
    const user = await User.findById(userId).select('ownedGames freeGames');

    if (!user) {
      return [];
    }

    // Get all accessible games for this user
    const accessibleGames = user.getAllAccessibleGames();

    // Return game metadata for accessible games
    return accessibleGames.map(gameId => {
      const game = games.get(gameId);
      return game ? game.meta : null;
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
      const game = games.get(gameId);
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

// --- Load games from /games ---
function loadGames() {
  const gamesDir = path.join(__dirname, 'games');
  if (!fs.existsSync(gamesDir)) {
    console.log('[GameLoader] Games directory not found');
    return;
  }

  const folders = fs.readdirSync(gamesDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  folders.forEach(id => {
    const serverPath = path.join(gamesDir, id, 'server.js');
    if (!fs.existsSync(serverPath)) return;

    try {
      const rawModule = require(serverPath);
      const game = wrapGameModule(rawModule);
      games.set(id, game);
      console.log(`[GameLoader] Loaded ${game.meta.name} (${id})`);
    } catch (err) {
      console.error(`[GameLoader] Failed to load ${id}:`, err);
    }
  });
}

loadGames();

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

  // Note: Games list will be sent after lobby is created/joined

  // Create a lobby (host is separate from players)
  socket.on('createLobby', async ({ username, userId }, callback) => {
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
    lobbies.set(code, lobby);

    console.log(`[DEBUG] Created lobby ${code} with host ${socket.id}`);
    console.log(`[DEBUG] Lobby players:`, lobby.players);

    socket.join(code);

    // Get available games for this lobby
    // If host has userId, use their games; otherwise use free games only
    let availableGames = [];
    if (userId) {
      availableGames = await getAvailableGamesForUser(userId);
    } else {
      // For non-authenticated hosts, only show free games
      const config = require('./config');
      const freeGames = config.FREE_GAMES || [];
      availableGames = freeGames.map(gameId => {
        const game = games.get(gameId);
        return game ? game.meta : null;
      }).filter(Boolean);
    }

    callback?.({
      code,
      games: availableGames,
      isHost: true
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

    const player = { id: socket.id, username, userId: userId };
    lobby.players.push(player);
    if (userId) lobby.playerIds.push(userId);
    socket.join(code);

    // If game is already selected, initialize player for that game
    if (lobby.gameId) {
      const game = games.get(lobby.gameId);
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
      isHost: false
    });

    // Update player list for everyone (including host)
    io.of('/lobby').to(code).emit('playerListUpdate', lobby.players.map(p => p.username));
    
    // Update games for host when players join
    const updatedGames = await getAvailableGamesForLobby(lobby.playerIds);
    io.of('/lobby').to(lobby.host).emit('gamesUpdated', updatedGames);
  });

  // Select a game (any player can do this)
  socket.on('selectGame', ({ code, gameId }, callback) => {
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

    const game = games.get(gameId);
    if (!game) {
      console.log(`[DEBUG] Game not found: ${gameId}`);
      return callback?.({ error: 'Game not found' });
    }

    console.log(`[DEBUG] Starting game: ${game.meta.name}`);
    lobby.gameId = gameId;

    try {
      const api = makeApi(io.of('/lobby'), lobby);
      console.log(`[DEBUG] Calling game.onInit for ${game.meta.name}`);
      game.onInit(lobby, api);

      // Initialize all existing players for the game
      console.log(`[DEBUG] Initializing ${lobby.players.length} players for game`);
      lobby.players.forEach(player => {
        console.log(`[DEBUG] Adding player ${player.username} to game`);
        game.onPlayerJoin(lobby, api, player);
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
      callback?.({ error: 'Game initialization failed' });
    }
  });

  // Player action
  socket.on('action', ({ code, data }) => {
    const lobby = lobbies.get(code);
    if (!lobby) return;

    const game = games.get(lobby.gameId);
    const player = lobby.players.find(p => p.id === socket.id);
    if (!player) return;

    const api = makeApi(io.of('/lobby'), lobby);
    game.onAction(lobby, api, player, data);
  });

  // End lobby
  socket.on('endLobby', code => {
    const lobby = lobbies.get(code);
    if (!lobby) return;

    const game = games.get(lobby.gameId);
    const api = makeApi(io.of('/lobby'), lobby);
    game.onEnd(lobby, api);

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

  // Disconnect cleanup
  socket.on('disconnect', () => {
    console.log(`[DEBUG] Socket disconnected: ${socket.id} from ${socket.handshake.address}`);
    for (const [code, lobby] of lobbies.entries()) {
      console.log(`[DEBUG] Checking lobby ${code} for disconnected socket ${socket.id}`);
      console.log(`[DEBUG] Lobby host: ${lobby.host}, Lobby players:`, lobby.players.map(p => p.id));
      
      // Remove player from lobby
      const playerIndex = lobby.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        const removedPlayer = lobby.players[playerIndex];
        console.log(`[DEBUG] Removing player ${removedPlayer.username} from lobby`);
        lobby.players.splice(playerIndex, 1);
        
        // Remove player ID from playerIds array
        if (removedPlayer.userId) {
          const userIdIndex = lobby.playerIds.indexOf(removedPlayer.userId);
          if (userIdIndex !== -1) {
            lobby.playerIds.splice(userIdIndex, 1);
          }
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

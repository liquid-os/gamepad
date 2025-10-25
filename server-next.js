// server-next.js - Custom Next.js server with Socket.IO
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const connectDB = require('./config/database');
const config = require('./config');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = config.PORT || 3000;

// Prepare Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Socket.IO setup
  const io = new Server(server);

  // Connect to MongoDB
  connectDB();

  // Import dynamic game loader
  const gameLoader = require('./utils/DynamicGameLoader');

  const lobbies = new Map(); // active lobbies
  const disconnectedPlayers = new Map(); // temporarily disconnected players
  const playerSessions = new Map(); // track player sessions for reconnection

  // Helper function to get available games for a single user
  async function getAvailableGamesForUser(userId) {
    try {
      if (!userId) {
        return [];
      }

      const User = require('./models/User');
      const user = await User.findById(userId).select('ownedGames freeGames');

      if (!user) {
        return [];
      }

      const accessibleGames = user.getAllAccessibleGames();

      return accessibleGames.map(gameId => {
        const game = gameLoader.getGame(gameId);
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

      const User = require('./models/User');
      const players = await User.find({ 
        _id: { $in: playerIds } 
      }).select('ownedGames freeGames');

      if (players.length === 0) {
        return [];
      }

      const allAccessibleGames = players.flatMap(player => {
        const ownedGameIds = player.ownedGames.map(owned => owned.gameId);
        const freeGameIds = player.freeGames.map(free => free.gameId);
        return [...ownedGameIds, ...freeGameIds];
      });

      const availableGames = [...new Set(allAccessibleGames)];

      return availableGames.map(gameId => {
        const game = gameLoader.getGame(gameId);
        return game ? game.meta : null;
      }).filter(Boolean);

    } catch (error) {
      console.error('Error getting available games for lobby:', error);
      return [];
    }
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

  initializeGameLoader();

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

      const disconnectedPlayer = disconnectedPlayers.get(playerId);
      if (disconnectedPlayer && disconnectedPlayer.lobbyCode === lobbyCode) {
        const restoredPlayer = {
          id: socket.id,
          username: disconnectedPlayer.username,
          userId: disconnectedPlayer.userId,
          reconnected: true
        };

        disconnectedPlayers.delete(playerId);
        
        const playerIndex = lobby.players.findIndex(p => p.userId === playerId);
        if (playerIndex !== -1) {
          lobby.players[playerIndex] = restoredPlayer;
        } else {
          lobby.players.push(restoredPlayer);
        }

        socket.join(lobbyCode);

        io.of('/lobby').to(lobbyCode).emit('playerReconnected', {
          player: restoredPlayer,
          message: `${restoredPlayer.username} has reconnected`
        });

        if (lobby.gameId) {
          const game = gameLoader.getGame(lobby.gameId);
          if (game) {
            try {
              const api = makeApi(io.of('/lobby'), lobby);
              game.onPlayerJoin(lobby, api, restoredPlayer);
              
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

      const playerSession = playerSessions.get(playerId);
      if (playerSession && playerSession.lobbyCode === lobbyCode) {
        const existingPlayer = lobby.players.find(p => p.userId === playerId);
        if (!existingPlayer) {
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
          
          io.of('/lobby').to(lobbyCode).emit('playerReconnected', {
            player: restoredPlayer,
            message: `${restoredPlayer.username} has reconnected`
          });
          
          io.of('/lobby').to(lobbyCode).emit('playerListUpdate', lobby.players.map(p => p.username));
          
          console.log(`[DEBUG] Player ${restoredPlayer.username} successfully reconnected to lobby ${lobbyCode}`);
          return callback?.({
            success: true,
            lobbyCode: lobbyCode,
            player: restoredPlayer,
            message: 'Successfully reconnected'
          });
        } else {
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
        playerIds: []
      };
      lobbies.set(code, lobby);

      console.log(`[DEBUG] Created lobby ${code} with host ${socket.id}`);

      socket.join(code);

      let availableGames = [];
      if (userId) {
        availableGames = await getAvailableGamesForUser(userId);
      } else {
        const freeGames = config.FREE_GAMES || [];
        availableGames = freeGames.map(gameId => {
          const game = gameLoader.getGame(gameId);
          return game ? game.meta : null;
        }).filter(Boolean);
      }

      callback?.({
        code,
        games: availableGames,
        isHost: true
      });

      socket.emit('playerListUpdate', []);
    });

    // Join a lobby as a player
    socket.on('joinLobby', async ({ code, username, userId }, callback) => {
      console.log(`[DEBUG] joinLobby called: socketId=${socket.id}, code=${code}, username=${username}`);
      
      const lobby = lobbies.get(code);
      if (!lobby) return callback?.({ error: 'Lobby not found' });

      if (socket.id === lobby.host) {
        console.log(`[DEBUG] Host trying to join as player - blocked`);
        return callback?.({ error: 'Host cannot join as player from same device' });
      }

      const player = { id: socket.id, username, userId: userId };
      lobby.players.push(player);
      if (userId) {
        lobby.playerIds.push(userId);
        playerSessions.set(userId, {
          username: username,
          userId: userId,
          lobbyCode: code,
          joinedAt: Date.now()
        });
      }
      socket.join(code);

      if (lobby.gameId) {
        const game = gameLoader.getGame(lobby.gameId);
        if (game) {
          const api = makeApi(io.of('/lobby'), lobby);
          game.onPlayerJoin(lobby, api, player);
        }
      }

      const availableGames = await getAvailableGamesForLobby(lobby.playerIds);

      callback?.({
        code,
        games: availableGames,
        username,
        gameId: lobby.gameId,
        isHost: false
      });

      io.of('/lobby').to(code).emit('playerListUpdate', lobby.players.map(p => p.username));
      
      const updatedGames = await getAvailableGamesForLobby(lobby.playerIds);
      io.of('/lobby').to(lobby.host).emit('gamesUpdated', updatedGames);
    });

    // Select a game
    socket.on('selectGame', ({ code, gameId }, callback) => {
      console.log(`[DEBUG] selectGame called: code=${code}, gameId=${gameId}, socketId=${socket.id}`);
      
      const lobby = lobbies.get(code);
      if (!lobby) {
        return callback?.({ error: 'Lobby not found' });
      }

      const isPlayer = lobby.players.some(player => player.id === socket.id);
      
      if (!isPlayer) {
        return callback?.({ error: 'Only players can select games. The host cannot select games.' });
      }

      const game = gameLoader.getGame(gameId);
      if (!game) {
        return callback?.({ error: 'Game not found' });
      }

      lobby.gameId = gameId;

      try {
        const api = makeApi(io.of('/lobby'), lobby);
        game.onInit(lobby, api);

        lobby.players.forEach(player => {
          game.onPlayerJoin(lobby, api, player);
        });

        socket.emit('playerGameStarted', {
          game: game.meta,
          gameId: gameId
        });

        io.of('/lobby').to(code).except(socket.id).emit('playerGameStarted', {
          game: game.meta,
          gameId: gameId
        });

        io.of('/lobby').to(lobby.host).emit('hostGameStarted', {
          game: game.meta,
          gameId: gameId
        });

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

      const game = gameLoader.getGame(lobby.gameId);
      const player = lobby.players.find(p => p.id === socket.id);
      if (!game || !player) return;

      const api = makeApi(io.of('/lobby'), lobby);
      game.onAction(lobby, api, player, data);
    });

    // End lobby
    socket.on('endLobby', code => {
      const lobby = lobbies.get(code);
      if (!lobby) return;

      const game = gameLoader.getGame(lobby.gameId);
      if (game) {
        const api = makeApi(io.of('/lobby'), lobby);
        game.onEnd(lobby, api);
      }

      io.of('/lobby').to(code).emit('lobbyClosed');
      lobbies.delete(code);
    });

    // Leave lobby
    socket.on('leaveLobby', ({ code }) => {
      const lobby = lobbies.get(code);
      if (!lobby) return;

      const playerIndex = lobby.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        const removedPlayer = lobby.players[playerIndex];
        lobby.players.splice(playerIndex, 1);
        
        if (removedPlayer.userId) {
          const userIdIndex = lobby.playerIds.indexOf(removedPlayer.userId);
          if (userIdIndex !== -1) {
            lobby.playerIds.splice(userIdIndex, 1);
          }
        }
      }

      socket.leave(code);

      if (lobby.players.length === 0) {
        lobbies.delete(code);
        return;
      }

      io.of('/lobby').to(code).emit('playerListUpdate', lobby.players.map(p => p.username));
      
      getAvailableGamesForLobby(lobby.playerIds).then(updatedGames => {
        io.of('/lobby').to(lobby.host).emit('gamesUpdated', updatedGames);
      });
    });

    // Disconnect cleanup
    socket.on('disconnect', () => {
      console.log(`[DEBUG] Socket disconnected: ${socket.id}`);
      for (const [code, lobby] of lobbies.entries()) {
        const playerIndex = lobby.players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
          const removedPlayer = lobby.players[playerIndex];
          
          if (removedPlayer.userId) {
            const gracePeriod = 90000;
            
            disconnectedPlayers.set(removedPlayer.userId, {
              username: removedPlayer.username,
              userId: removedPlayer.userId,
              lobbyCode: code,
              disconnectedAt: Date.now(),
              gameId: lobby.gameId
            });
            
            io.of('/lobby').to(code).emit('playerDisconnected', {
              player: removedPlayer,
              message: `${removedPlayer.username} has disconnected (reconnecting...)`,
              temporary: true
            });
            
            setTimeout(() => {
              if (disconnectedPlayers.has(removedPlayer.userId)) {
                disconnectedPlayers.delete(removedPlayer.userId);
                
                const currentPlayerIndex = lobby.players.findIndex(p => p.userId === removedPlayer.userId);
                if (currentPlayerIndex !== -1) {
                  lobby.players.splice(currentPlayerIndex, 1);
                  const userIdIndex = lobby.playerIds.indexOf(removedPlayer.userId);
                  if (userIdIndex !== -1) {
                    lobby.playerIds.splice(userIdIndex, 1);
                  }
                  
                  io.of('/lobby').to(code).emit('playerListUpdate', lobby.players.map(p => p.username));
                }
                
                io.of('/lobby').to(code).emit('playerPermanentlyDisconnected', {
                  player: removedPlayer,
                  message: `${removedPlayer.username} has left the ${lobby.gameId ? 'game' : 'lobby'}`
                });
              }
            }, gracePeriod);
            
            continue;
          } else {
            lobby.players.splice(playerIndex, 1);
            io.of('/lobby').to(code).emit('playerListUpdate', lobby.players.map(p => p.username));
            io.of('/lobby').to(code).emit('playerDisconnected', {
              player: removedPlayer,
              message: `${removedPlayer.username} has left the lobby`,
              temporary: false
            });
          }
        }

        if (socket.id === lobby.host) {
          io.of('/lobby').to(code).emit('lobbyClosed');
          lobbies.delete(code);
          continue;
        }

        if (lobby.players.length === 0) {
          if (lobby.gameId) {
            // Keep lobby open for potential reconnections
          } else {
            io.of('/lobby').to(code).emit('lobbyClosed');
            lobbies.delete(code);
          }
          continue;
        }

        io.of('/lobby').to(code).emit('playerListUpdate', lobby.players.map(p => p.username));
        
        getAvailableGamesForLobby(lobby.playerIds).then(updatedGames => {
          io.of('/lobby').to(lobby.host).emit('gamesUpdated', updatedGames);
        });
      }
    });
  });

  // Start server
  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});


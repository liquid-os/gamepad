/**
 * Game Template - Server Logic
 * 
 * This is a template for creating games on the BuddyBox.tv platform.
 * Copy this template and modify it to create your own game.
 * 
 * REQUIRED EXPORTS:
 * - meta: Game metadata (id, name, description, minPlayers, maxPlayers)
 * - onInit: Called when game starts (initialize game state)
 * - onPlayerJoin: Called when a player joins the game
 * - onAction: Called when a player performs an action
 * - onPlayerDisconnect: Called when a player leaves (optional)
 * - onEnd: Called when game ends (optional)
 * 
 * API METHODS AVAILABLE:
 * - api.sendToAll(event, data): Send message to all players
 * - api.sendToPlayer(playerId, event, data): Send message to specific player
 * - api.sendToHost(event, data): Send message to host display
 * - api.setState(state): Update game state
 * - api.getState(): Get current game state
 */

// Game constants and configuration
const GAME_CONFIG = {
  // Define your game's constants here
  maxRounds: 10,
  timeLimit: 30000, // 30 seconds per turn
  // Add more game-specific constants as needed
};

// Game state structure - modify this for your game
const INITIAL_STATE = {
  phase: 'waiting', // waiting, playing, finished
  players: {}, // Will store player data
  currentTurn: null,
  round: 0,
  winner: null,
  // Add more state properties as needed
};

module.exports = {
  // REQUIRED: Game metadata
  meta: {
    id: 'your-game-id', // Must match the id in game.json
    name: 'Your Game Name', // Must match the name in game.json
    minPlayers: 2, // Must match minPlayers in game.json
    maxPlayers: 4, // Must match maxPlayers in game.json
    description: 'A brief description of your game', // Must match description in game.json
    category: 'strategy', // Optional: strategy, action, puzzle, trivia, social, other
    version: '1.0.0' // Optional: version number
  },

  // REQUIRED: Called when game starts
  onInit(lobby, api) {
    console.log(`[${this.meta.id}] Game initialized for lobby ${lobby.id}`);
    
    // Initialize game state
    lobby.state = { ...INITIAL_STATE };
    
    // Send initial state to all players
    api.sendToAll('gameState', {
      phase: 'waiting',
      message: 'Waiting for players to join...'
    });
    
    // Send initial state to host
    api.sendToHost('hostGameUpdate', {
      phase: 'waiting',
      players: [],
      message: 'Waiting for players...'
    });
  },

  // REQUIRED: Called when a player joins
  onPlayerJoin(lobby, api, player) {
    console.log(`[${this.meta.id}] Player ${player.username} joined`);
    
    // Add player to game state
    lobby.state.players[player.id] = {
      id: player.id,
      username: player.username,
      userId: player.userId,
      score: 0,
      ready: false,
      // Add more player properties as needed
    };
    
    // Check if we have enough players to start
    const playerCount = Object.keys(lobby.state.players).length;
    
    if (playerCount >= this.meta.minPlayers && lobby.state.phase === 'waiting') {
      lobby.state.phase = 'ready';
      
      api.sendToAll('gameState', {
        phase: 'ready',
        message: `Ready to start! ${playerCount}/${this.meta.maxPlayers} players joined.`
      });
      
      api.sendToHost('hostGameUpdate', {
        phase: 'ready',
        players: Object.values(lobby.state.players),
        message: 'Ready to start!'
      });
    } else {
      // Send updated player list
      api.sendToAll('gameState', {
        phase: lobby.state.phase,
        players: Object.values(lobby.state.players),
        message: `${playerCount}/${this.meta.maxPlayers} players joined`
      });
      
      api.sendToHost('hostGameUpdate', {
        phase: lobby.state.phase,
        players: Object.values(lobby.state.players),
        message: `${playerCount}/${this.meta.maxPlayers} players joined`
      });
    }
  },

  // REQUIRED: Called when a player performs an action
  onAction(lobby, api, player, data) {
    console.log(`[${this.meta.id}] Player ${player.username} action:`, data);
    
    // Handle different action types
    switch (data.type) {
      case 'ready':
        handlePlayerReady(lobby, api, player, data);
        break;
        
      case 'gameAction':
        handleGameAction(lobby, api, player, data);
        break;
        
      case 'reset':
        handleGameReset(lobby, api, player, data);
        break;
        
      default:
        console.warn(`[${this.meta.id}] Unknown action type:`, data.type);
    }
  },

  // OPTIONAL: Called when a player disconnects
  onPlayerDisconnect(lobby, api, playerId) {
    console.log(`[${this.meta.id}] Player ${playerId} disconnected`);
    
    // Remove player from state
    delete lobby.state.players[playerId];
    
    // Check if game should end due to insufficient players
    const playerCount = Object.keys(lobby.state.players).length;
    
    if (playerCount < this.meta.minPlayers && lobby.state.phase === 'playing') {
      lobby.state.phase = 'finished';
      lobby.state.winner = 'Game ended - insufficient players';
      
      api.sendToAll('gameState', {
        phase: 'finished',
        winner: 'Game ended - insufficient players',
        message: 'Game ended due to player disconnect'
      });
      
      api.sendToHost('hostGameUpdate', {
        phase: 'finished',
        winner: 'Game ended - insufficient players',
        message: 'Game ended due to player disconnect'
      });
    } else {
      // Update player list
      api.sendToAll('gameState', {
        phase: lobby.state.phase,
        players: Object.values(lobby.state.players),
        message: `${playerCount}/${this.meta.maxPlayers} players remaining`
      });
      
      api.sendToHost('hostGameUpdate', {
        phase: lobby.state.phase,
        players: Object.values(lobby.state.players),
        message: `${playerCount}/${this.meta.maxPlayers} players remaining`
      });
    }
  },

  // OPTIONAL: Called when game ends
  onEnd(lobby, api) {
    console.log(`[${this.meta.id}] Game ended for lobby ${lobby.id}`);
    
    // Clean up any resources, save final scores, etc.
    // This is called when the lobby is destroyed
  }
};

// Helper functions - implement these for your game logic

function handlePlayerReady(lobby, api, player, data) {
  // Mark player as ready
  if (lobby.state.players[player.id]) {
    lobby.state.players[player.id].ready = true;
    
    // Check if all players are ready
    const allPlayers = Object.values(lobby.state.players);
    const readyPlayers = allPlayers.filter(p => p.ready);
    
    if (readyPlayers.length === allPlayers.length && allPlayers.length >= this.meta.minPlayers) {
      startGame(lobby, api);
    } else {
      api.sendToAll('gameState', {
        phase: 'ready',
        players: allPlayers,
        message: `${readyPlayers.length}/${allPlayers.length} players ready`
      });
      
      api.sendToHost('hostGameUpdate', {
        phase: 'ready',
        players: allPlayers,
        message: `${readyPlayers.length}/${allPlayers.length} players ready`
      });
    }
  }
}

function handleGameAction(lobby, api, player, data) {
  // Implement your game's main action logic here
  // This is where players make moves, attacks, decisions, etc.
  
  if (lobby.state.phase !== 'playing') {
    api.sendToPlayer(player.id, 'error', { message: 'Game is not in playing phase' });
    return;
  }
  
  // Example: Update player score
  if (lobby.state.players[player.id]) {
    lobby.state.players[player.id].score += data.points || 1;
    
    // Send updated state to all players
    api.sendToAll('gameState', {
      phase: 'playing',
      players: Object.values(lobby.state.players),
      message: `${player.username} scored ${data.points || 1} points!`
    });
    
    // Send updated state to host
    api.sendToHost('hostGameUpdate', {
      phase: 'playing',
      players: Object.values(lobby.state.players),
      message: `${player.username} scored ${data.points || 1} points!`
    });
    
    // Check for win condition
    checkWinCondition(lobby, api);
  }
}

function handleGameReset(lobby, api, player, data) {
  // Reset game to initial state
  lobby.state = { ...INITIAL_STATE };
  
  // Reset all players
  Object.keys(lobby.state.players).forEach(playerId => {
    lobby.state.players[playerId].score = 0;
    lobby.state.players[playerId].ready = false;
  });
  
  api.sendToAll('gameState', {
    phase: 'waiting',
    players: Object.values(lobby.state.players),
    message: 'Game reset! Ready to play again.'
  });
  
  api.sendToHost('hostGameUpdate', {
    phase: 'waiting',
    players: Object.values(lobby.state.players),
    message: 'Game reset! Ready to play again.'
  });
}

function startGame(lobby, api) {
  console.log(`[${this.meta.id}] Starting game`);
  
  lobby.state.phase = 'playing';
  lobby.state.round = 1;
  
  api.sendToAll('gameState', {
    phase: 'playing',
    players: Object.values(lobby.state.players),
    message: 'Game started! Good luck!'
  });
  
  api.sendToHost('hostGameUpdate', {
    phase: 'playing',
    players: Object.values(lobby.state.players),
    message: 'Game started!'
  });
}

function checkWinCondition(lobby, api) {
  // Implement your win condition logic here
  // Example: First player to reach 10 points wins
  
  const players = Object.values(lobby.state.players);
  const winner = players.find(p => p.score >= 10);
  
  if (winner) {
    lobby.state.phase = 'finished';
    lobby.state.winner = winner.username;
    
    api.sendToAll('gameState', {
      phase: 'finished',
      winner: winner.username,
      players: players,
      message: `${winner.username} wins!`
    });
    
    api.sendToHost('hostGameUpdate', {
      phase: 'finished',
      winner: winner.username,
      players: players,
      message: `${winner.username} wins!`
    });
  }
}

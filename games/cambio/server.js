// Cambio Game Server Logic
// A 5-card version of the card game Cambio

const gameState = {
  players: {},
  deck: [],
  discardPile: [],
  currentPlayer: 0,
  gamePhase: 'waiting', // waiting, playing, ended
  winner: null,
  turnTimer: null,
  turnTimeLimit: 30000, // 30 seconds per turn
  gameStarted: false,
  lastPlayedCard: null,
  consecutivePasses: 0,
  maxConsecutivePasses: 2 // If all players pass twice, shuffle discard pile
};

// Card suits and ranks for Cambio
const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// Initialize a standard 52-card deck
function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, id: `${rank}_${suit}` });
    }
  }
  return shuffleDeck(deck);
}

// Fisher-Yates shuffle algorithm
function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Deal 5 cards to each player
function dealCards(playerCount) {
  const deck = createDeck();
  const players = {};
  
  for (let i = 0; i < playerCount; i++) {
    players[i] = {
      hand: [],
      hasPassed: false,
      playerId: null
    };
  }
  
  // Deal 5 cards to each player
  for (let cardIndex = 0; cardIndex < 5; cardIndex++) {
    for (let playerIndex = 0; playerIndex < playerCount; playerIndex++) {
      if (deck.length > 0) {
        players[playerIndex].hand.push(deck.pop());
      }
    }
  }
  
  // Put remaining cards in discard pile, flip top card
  gameState.discardPile = deck;
  gameState.lastPlayedCard = gameState.discardPile.pop();
  
  return players;
}

// Check if a card can be played
function canPlayCard(card, lastPlayedCard) {
  if (!lastPlayedCard) return true;
  
  // Can play same rank or same suit
  return card.rank === lastPlayedCard.rank || card.suit === lastPlayedCard.suit;
}

// Get valid moves for a player
function getValidMoves(playerHand, lastPlayedCard) {
  if (!lastPlayedCard) return playerHand;
  
  return playerHand.filter(card => canPlayCard(card, lastPlayedCard));
}

// Check if player has won (no cards left)
function checkWinCondition(playerHand) {
  return playerHand.length === 0;
}

// Get next player
function getNextPlayer(currentPlayer, playerCount) {
  return (currentPlayer + 1) % playerCount;
}

// Start the game
function startGame(api) {
  console.log('[Cambio] Starting game...');
  
  const playerIds = Object.keys(gameState.players);
  const playerCount = playerIds.length;
  
  if (playerCount < 2 || playerCount > 6) {
    api.sendToAll('error', { message: 'Cambio requires 2-6 players' });
    return;
  }
  
  // Deal cards to all players
  const dealtPlayers = dealCards(playerCount);
  
  // Assign player IDs to the dealt players
  playerIds.forEach((playerId, index) => {
    gameState.players[playerId] = {
      ...dealtPlayers[index],
      playerId: playerId
    };
  });
  
  gameState.gamePhase = 'playing';
  gameState.currentPlayer = 0;
  gameState.consecutivePasses = 0;
  gameState.gameStarted = true;
  
  // Send initial game state to all players
  const gameData = {
    players: Object.values(gameState.players).map(player => ({
      playerId: player.playerId,
      handSize: player.hand.length,
      hasPassed: player.hasPassed
    })),
    currentPlayer: gameState.currentPlayer,
    lastPlayedCard: gameState.lastPlayedCard,
    gamePhase: gameState.gamePhase,
    deckSize: gameState.discardPile.length
  };
  
  api.sendToAll('gameStarted', gameData);
  
  // Send each player their own hand
  Object.keys(gameState.players).forEach(playerId => {
    const playerHand = gameState.players[playerId].hand;
    const validMoves = getValidMoves(playerHand, gameState.lastPlayedCard);
    
    api.sendToPlayer(playerId, 'yourHand', {
      hand: playerHand,
      validMoves: validMoves,
      lastPlayedCard: gameState.lastPlayedCard
    });
  });
  
  // Start turn timer
  startTurnTimer(api);
  
  console.log('[Cambio] Game started with', playerCount, 'players');
}

// Start turn timer
function startTurnTimer(api) {
  if (gameState.turnTimer) {
    clearTimeout(gameState.turnTimer);
  }
  
  gameState.turnTimer = setTimeout(() => {
    // Player's turn timed out - auto pass
    const currentPlayerId = Object.keys(gameState.players)[gameState.currentPlayer];
    console.log(`[Cambio] Turn timeout for player ${currentPlayerId}`);
    handlePass(api, currentPlayerId);
  }, gameState.turnTimeLimit);
}

// Handle playing a card
function handlePlayCard(api, playerId, cardId) {
  console.log(`[Cambio] Player ${playerId} trying to play card ${cardId}`);
  
  // Check if it's the player's turn
  const currentPlayerId = Object.keys(gameState.players)[gameState.currentPlayer];
  if (playerId !== currentPlayerId) {
    api.sendToPlayer(playerId, 'error', { message: 'Not your turn!' });
    return;
  }
  
  // Check if game is in playing phase
  if (gameState.gamePhase !== 'playing') {
    api.sendToPlayer(playerId, 'error', { message: 'Game not in playing phase' });
    return;
  }
  
  const player = gameState.players[playerId];
  if (!player) {
    api.sendToPlayer(playerId, 'error', { message: 'Player not found' });
    return;
  }
  
  // Find the card in player's hand
  const cardIndex = player.hand.findIndex(card => card.id === cardId);
  if (cardIndex === -1) {
    api.sendToPlayer(playerId, 'error', { message: 'Card not in hand' });
    return;
  }
  
  const card = player.hand[cardIndex];
  
  // Check if card can be played
  if (!canPlayCard(card, gameState.lastPlayedCard)) {
    api.sendToPlayer(playerId, 'error', { message: 'Cannot play this card' });
    return;
  }
  
  // Play the card
  player.hand.splice(cardIndex, 1);
  gameState.discardPile.push(gameState.lastPlayedCard);
  gameState.lastPlayedCard = card;
  gameState.consecutivePasses = 0;
  player.hasPassed = false;
  
  // Clear turn timer
  if (gameState.turnTimer) {
    clearTimeout(gameState.turnTimer);
  }
  
  // Check for win condition
  if (checkWinCondition(player.hand)) {
    gameState.winner = playerId;
    gameState.gamePhase = 'ended';
    
    api.sendToAll('gameEnded', {
      winner: playerId,
      winnerName: api.getPlayerName(playerId),
      players: Object.values(gameState.players).map(p => ({
        playerId: p.playerId,
        handSize: p.hand.length
      }))
    });
    
    console.log(`[Cambio] Game ended! Winner: ${playerId}`);
    return;
  }
  
  // Move to next player
  gameState.currentPlayer = getNextPlayer(gameState.currentPlayer, Object.keys(gameState.players).length);
  
  // Send updated game state to all players
  const gameData = {
    players: Object.values(gameState.players).map(p => ({
      playerId: p.playerId,
      handSize: p.hand.length,
      hasPassed: p.hasPassed
    })),
    currentPlayer: gameState.currentPlayer,
    lastPlayedCard: gameState.lastPlayedCard,
    gamePhase: gameState.gamePhase,
    deckSize: gameState.discardPile.length,
    playedCard: card
  };
  
  api.sendToAll('cardPlayed', gameData);
  
  // Send updated hands to players
  Object.keys(gameState.players).forEach(pid => {
    const p = gameState.players[pid];
    const validMoves = getValidMoves(p.hand, gameState.lastPlayedCard);
    
    api.sendToPlayer(pid, 'yourHand', {
      hand: p.hand,
      validMoves: validMoves,
      lastPlayedCard: gameState.lastPlayedCard,
      isYourTurn: pid === Object.keys(gameState.players)[gameState.currentPlayer]
    });
  });
  
  // Start next turn timer
  startTurnTimer(api);
  
  console.log(`[Cambio] Card ${cardId} played by ${playerId}`);
}

// Handle passing
function handlePass(api, playerId) {
  console.log(`[Cambio] Player ${playerId} passed`);
  
  // Check if it's the player's turn (or auto-pass due to timeout)
  const currentPlayerId = Object.keys(gameState.players)[gameState.currentPlayer];
  if (playerId !== currentPlayerId) {
    api.sendToPlayer(playerId, 'error', { message: 'Not your turn!' });
    return;
  }
  
  const player = gameState.players[playerId];
  if (!player) {
    api.sendToPlayer(playerId, 'error', { message: 'Player not found' });
    return;
  }
  
  // Mark player as passed
  player.hasPassed = true;
  gameState.consecutivePasses++;
  
  // Clear turn timer
  if (gameState.turnTimer) {
    clearTimeout(gameState.turnTimer);
  }
  
  // Check if all players have passed twice - shuffle discard pile
  if (gameState.consecutivePasses >= gameState.maxConsecutivePasses * Object.keys(gameState.players).length) {
    console.log('[Cambio] All players passed - shuffling discard pile');
    
    // Keep the last played card, shuffle the rest back into deck
    const lastCard = gameState.lastPlayedCard;
    gameState.discardPile = shuffleDeck(gameState.discardPile);
    gameState.discardPile.push(lastCard);
    
    // Reset pass counters
    Object.values(gameState.players).forEach(p => p.hasPassed = false);
    gameState.consecutivePasses = 0;
    
    api.sendToAll('deckShuffled', {
      message: 'All players passed - discard pile shuffled!'
    });
  }
  
  // Move to next player
  gameState.currentPlayer = getNextPlayer(gameState.currentPlayer, Object.keys(gameState.players).length);
  
  // Send updated game state
  const gameData = {
    players: Object.values(gameState.players).map(p => ({
      playerId: p.playerId,
      handSize: p.hand.length,
      hasPassed: p.hasPassed
    })),
    currentPlayer: gameState.currentPlayer,
    lastPlayedCard: gameState.lastPlayedCard,
    gamePhase: gameState.gamePhase,
    deckSize: gameState.discardPile.length,
    passedPlayer: playerId
  };
  
  api.sendToAll('playerPassed', gameData);
  
  // Send updated hands to players
  Object.keys(gameState.players).forEach(pid => {
    const p = gameState.players[pid];
    const validMoves = getValidMoves(p.hand, gameState.lastPlayedCard);
    
    api.sendToPlayer(pid, 'yourHand', {
      hand: p.hand,
      validMoves: validMoves,
      lastPlayedCard: gameState.lastPlayedCard,
      isYourTurn: pid === Object.keys(gameState.players)[gameState.currentPlayer]
    });
  });
  
  // Start next turn timer
  startTurnTimer(api);
}

// Handle drawing a card
function handleDrawCard(api, playerId) {
  console.log(`[Cambio] Player ${playerId} drawing a card`);
  
  // Check if it's the player's turn
  const currentPlayerId = Object.keys(gameState.players)[gameState.currentPlayer];
  if (playerId !== currentPlayerId) {
    api.sendToPlayer(playerId, 'error', { message: 'Not your turn!' });
    return;
  }
  
  const player = gameState.players[playerId];
  if (!player) {
    api.sendToPlayer(playerId, 'error', { message: 'Player not found' });
    return;
  }
  
  // Check if deck has cards
  if (gameState.discardPile.length === 0) {
    api.sendToPlayer(playerId, 'error', { message: 'No cards left to draw' });
    return;
  }
  
  // Draw a card
  const drawnCard = gameState.discardPile.pop();
  player.hand.push(drawnCard);
  
  // Clear turn timer
  if (gameState.turnTimer) {
    clearTimeout(gameState.turnTimer);
  }
  
  // Send updated hand to player
  const validMoves = getValidMoves(player.hand, gameState.lastPlayedCard);
  
  api.sendToPlayer(playerId, 'yourHand', {
    hand: player.hand,
    validMoves: validMoves,
    lastPlayedCard: gameState.lastPlayedCard,
    isYourTurn: true,
    drawnCard: drawnCard
  });
  
  // Send game state update to all players
  const gameData = {
    players: Object.values(gameState.players).map(p => ({
      playerId: p.playerId,
      handSize: p.hand.length,
      hasPassed: p.hasPassed
    })),
    currentPlayer: gameState.currentPlayer,
    lastPlayedCard: gameState.lastPlayedCard,
    gamePhase: gameState.gamePhase,
    deckSize: gameState.discardPile.length
  };
  
  api.sendToAll('cardDrawn', gameData);
  
  console.log(`[Cambio] Player ${playerId} drew a card`);
}

// Initialize game when lobby starts
function initializeGame(api, lobby) {
  console.log('[Cambio] Initializing game for lobby:', lobby.id);
  
  // Reset game state
  Object.assign(gameState, {
    players: {},
    deck: [],
    discardPile: [],
    currentPlayer: 0,
    gamePhase: 'waiting',
    winner: null,
    turnTimer: null,
    gameStarted: false,
    lastPlayedCard: null,
    consecutivePasses: 0
  });
  
  // Set up players
  lobby.players.forEach(player => {
    gameState.players[player.id] = {
      hand: [],
      hasPassed: false,
      playerId: player.id
    };
  });
  
  console.log('[Cambio] Game initialized with', Object.keys(gameState.players).length, 'players');
}

// Handle game actions
function handleAction(api, action, playerId, data) {
  console.log(`[Cambio] Action: ${action} from player ${playerId}`);
  
  switch (action) {
    case 'startGame':
      if (!gameState.gameStarted) {
        startGame(api);
      }
      break;
      
    case 'playCard':
      if (data && data.cardId) {
        handlePlayCard(api, playerId, data.cardId);
      }
      break;
      
    case 'pass':
      handlePass(api, playerId);
      break;
      
    case 'drawCard':
      handleDrawCard(api, playerId);
      break;
      
    default:
      console.log(`[Cambio] Unknown action: ${action}`);
      api.sendToPlayer(playerId, 'error', { message: 'Unknown action' });
  }
}

// Get game state for a specific player
function getGameState(playerId) {
  const player = gameState.players[playerId];
  if (!player) return null;
  
  return {
    players: Object.values(gameState.players).map(p => ({
      playerId: p.playerId,
      handSize: p.hand.length,
      hasPassed: p.hasPassed
    })),
    currentPlayer: gameState.currentPlayer,
    lastPlayedCard: gameState.lastPlayedCard,
    gamePhase: gameState.gamePhase,
    deckSize: gameState.discardPile.length,
    yourHand: player.hand,
    validMoves: getValidMoves(player.hand, gameState.lastPlayedCard),
    isYourTurn: playerId === Object.keys(gameState.players)[gameState.currentPlayer]
  };
}

// Clean up when game ends
function cleanup() {
  if (gameState.turnTimer) {
    clearTimeout(gameState.turnTimer);
    gameState.turnTimer = null;
  }
}

module.exports = {
  initializeGame,
  handleAction,
  getGameState,
  cleanup
};

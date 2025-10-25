// Cambio Game Client Interface
// Handles the UI and interactions for the Cambio card game

class CambioGame {
  constructor() {
    this.gameContainer = null;
    this.playerHand = [];
    this.validMoves = [];
    this.currentPlayer = 0;
    this.lastPlayedCard = null;
    this.gamePhase = 'waiting';
    this.isMyTurn = false;
    this.players = [];
    this.turnTimer = null;
    this.turnTimeLeft = 30;
    
    this.setupUI();
    this.setupEventListeners();
  }
  
  setupUI() {
    // Create game container
    this.gameContainer = document.createElement('div');
    this.gameContainer.className = 'cambio-game';
    this.gameContainer.innerHTML = `
      <div class="cambio-header">
        <h2>🃏 Cambio</h2>
        <div class="game-status">
          <div class="current-player">Current Player: <span id="current-player-name">-</span></div>
          <div class="turn-timer">Time Left: <span id="turn-timer">30s</span></div>
        </div>
      </div>
      
      <div class="cambio-board">
        <div class="players-info">
          <div class="players-list" id="players-list">
            <!-- Players will be populated here -->
          </div>
        </div>
        
        <div class="game-area">
          <div class="discard-pile">
            <div class="pile-label">Discard Pile</div>
            <div class="last-card" id="last-card">
              <div class="card-placeholder">No cards played yet</div>
            </div>
          </div>
          
          <div class="deck-info">
            <div class="deck-size">Deck: <span id="deck-size">52</span> cards</div>
          </div>
        </div>
        
        <div class="player-hand-section">
          <div class="hand-label">Your Hand (<span id="hand-count">0</span> cards)</div>
          <div class="player-hand" id="player-hand">
            <!-- Cards will be populated here -->
          </div>
        </div>
        
        <div class="game-controls">
          <button id="start-game-btn" class="btn btn-primary">Start Game</button>
          <button id="play-card-btn" class="btn btn-success" disabled>Play Selected Card</button>
          <button id="pass-btn" class="btn btn-warning">Pass</button>
          <button id="draw-card-btn" class="btn btn-info">Draw Card</button>
        </div>
        
        <div class="game-messages" id="game-messages">
          <!-- Game messages will appear here -->
        </div>
      </div>
      
      <style>
        .cambio-game {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        .cambio-header {
          text-align: center;
          margin-bottom: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          border-radius: 10px;
        }
        
        .cambio-header h2 {
          margin: 0 0 10px 0;
          font-size: 2.5em;
        }
        
        .game-status {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 1.1em;
        }
        
        .cambio-board {
          background: #f8f9fa;
          border-radius: 10px;
          padding: 20px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .players-info {
          margin-bottom: 20px;
        }
        
        .players-list {
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
        }
        
        .player-info {
          background: white;
          padding: 10px 15px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          border: 2px solid transparent;
          transition: all 0.3s ease;
        }
        
        .player-info.current-player {
          border-color: #28a745;
          background: #d4edda;
        }
        
        .player-info.passed {
          opacity: 0.6;
          background: #f8d7da;
        }
        
        .player-name {
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .player-hand-size {
          color: #666;
          font-size: 0.9em;
        }
        
        .game-area {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 30px 0;
          padding: 20px;
          background: white;
          border-radius: 10px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .discard-pile {
          text-align: center;
        }
        
        .pile-label {
          font-weight: bold;
          margin-bottom: 10px;
          color: #333;
        }
        
        .last-card {
          min-height: 120px;
          min-width: 80px;
          border: 2px dashed #ccc;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
        }
        
        .card-placeholder {
          color: #999;
          font-style: italic;
        }
        
        .deck-info {
          text-align: center;
          color: #666;
        }
        
        .player-hand-section {
          margin: 30px 0;
        }
        
        .hand-label {
          font-weight: bold;
          margin-bottom: 15px;
          font-size: 1.1em;
          color: #333;
        }
        
        .player-hand {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          min-height: 120px;
          padding: 15px;
          background: white;
          border-radius: 10px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .card {
          width: 60px;
          height: 90px;
          border: 2px solid #ddd;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          background: white;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          font-size: 0.8em;
          font-weight: bold;
        }
        
        .card:hover {
          transform: translateY(-5px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }
        
        .card.selected {
          border-color: #007bff;
          background: #e3f2fd;
          transform: translateY(-10px);
        }
        
        .card.invalid {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .card.hearts { color: #e74c3c; }
        .card.diamonds { color: #e74c3c; }
        .card.clubs { color: #2c3e50; }
        .card.spades { color: #2c3e50; }
        
        .card-rank {
          font-size: 1.2em;
          line-height: 1;
        }
        
        .card-suit {
          font-size: 1.5em;
          line-height: 1;
        }
        
        .game-controls {
          display: flex;
          gap: 15px;
          justify-content: center;
          margin: 20px 0;
          flex-wrap: wrap;
        }
        
        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          font-size: 1em;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .btn-primary { background: #007bff; color: white; }
        .btn-success { background: #28a745; color: white; }
        .btn-warning { background: #ffc107; color: #212529; }
        .btn-info { background: #17a2b8; color: white; }
        
        .btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }
        
        .game-messages {
          min-height: 40px;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 8px;
          border-left: 4px solid #007bff;
        }
        
        .message {
          margin: 5px 0;
          padding: 8px 12px;
          border-radius: 4px;
          background: white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .message.success { border-left: 4px solid #28a745; }
        .message.error { border-left: 4px solid #dc3545; }
        .message.info { border-left: 4px solid #17a2b8; }
        
        @media (max-width: 768px) {
          .cambio-game {
            padding: 10px;
          }
          
          .game-area {
            flex-direction: column;
            gap: 20px;
          }
          
          .players-list {
            justify-content: center;
          }
          
          .game-controls {
            flex-direction: column;
            align-items: center;
          }
          
          .card {
            width: 50px;
            height: 75px;
            font-size: 0.7em;
          }
        }
      </style>
    `;
    
    // Append to game container
    const gameArea = document.getElementById('game-area');
    if (gameArea) {
      gameArea.innerHTML = '';
      gameArea.appendChild(this.gameContainer);
    }
  }
  
  setupEventListeners() {
    // Start game button
    const startBtn = document.getElementById('start-game-btn');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        this.startGame();
      });
    }
    
    // Play card button
    const playBtn = document.getElementById('play-card-btn');
    if (playBtn) {
      playBtn.addEventListener('click', () => {
        this.playSelectedCard();
      });
    }
    
    // Pass button
    const passBtn = document.getElementById('pass-btn');
    if (passBtn) {
      passBtn.addEventListener('click', () => {
        this.passTurn();
      });
    }
    
    // Draw card button
    const drawBtn = document.getElementById('draw-card-btn');
    if (drawBtn) {
      drawBtn.addEventListener('click', () => {
        this.drawCard();
      });
    }
  }
  
  startGame() {
    if (window.socket) {
      window.socket.emit('gameAction', { action: 'startGame' });
    }
  }
  
  playSelectedCard() {
    const selectedCard = document.querySelector('.card.selected');
    if (selectedCard && this.isMyTurn) {
      const cardId = selectedCard.dataset.cardId;
      if (window.socket) {
        window.socket.emit('gameAction', { 
          action: 'playCard', 
          data: { cardId: cardId } 
        });
      }
    }
  }
  
  passTurn() {
    if (this.isMyTurn && window.socket) {
      window.socket.emit('gameAction', { action: 'pass' });
    }
  }
  
  drawCard() {
    if (this.isMyTurn && window.socket) {
      window.socket.emit('gameAction', { action: 'drawCard' });
    }
  }
  
  updatePlayers(players) {
    this.players = players;
    const playersList = document.getElementById('players-list');
    if (playersList) {
      playersList.innerHTML = '';
      
      players.forEach(player => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-info';
        
        if (player.playerId === this.currentPlayer) {
          playerDiv.classList.add('current-player');
        }
        
        if (player.hasPassed) {
          playerDiv.classList.add('passed');
        }
        
        playerDiv.innerHTML = `
          <div class="player-name">${this.getPlayerName(player.playerId)}</div>
          <div class="player-hand-size">${player.handSize} cards</div>
        `;
        
        playersList.appendChild(playerDiv);
      });
    }
    
    // Update current player name
    const currentPlayerName = document.getElementById('current-player-name');
    if (currentPlayerName) {
      const currentPlayer = players.find(p => p.playerId === this.currentPlayer);
      if (currentPlayer) {
        currentPlayerName.textContent = this.getPlayerName(currentPlayer.playerId);
      }
    }
  }
  
  updateLastCard(card) {
    this.lastPlayedCard = card;
    const lastCardDiv = document.getElementById('last-card');
    
    if (lastCardDiv && card) {
      lastCardDiv.innerHTML = `
        <div class="card ${card.suit}">
          <div class="card-rank">${card.rank}</div>
          <div class="card-suit">${this.getSuitSymbol(card.suit)}</div>
        </div>
      `;
    } else if (lastCardDiv) {
      lastCardDiv.innerHTML = '<div class="card-placeholder">No cards played yet</div>';
    }
  }
  
  updatePlayerHand(hand, validMoves, isMyTurn) {
    this.playerHand = hand;
    this.validMoves = validMoves;
    this.isMyTurn = isMyTurn;
    
    const handContainer = document.getElementById('player-hand');
    const handCount = document.getElementById('hand-count');
    const playBtn = document.getElementById('play-card-btn');
    const passBtn = document.getElementById('pass-btn');
    const drawBtn = document.getElementById('draw-card-btn');
    
    if (handContainer) {
      handContainer.innerHTML = '';
      
      hand.forEach(card => {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card';
        cardDiv.dataset.cardId = card.id;
        
        const isValidMove = validMoves.some(vm => vm.id === card.id);
        if (!isValidMove && isMyTurn) {
          cardDiv.classList.add('invalid');
        }
        
        cardDiv.innerHTML = `
          <div class="card-rank">${card.rank}</div>
          <div class="card-suit">${this.getSuitSymbol(card.suit)}</div>
        `;
        
        cardDiv.addEventListener('click', () => {
          if (isValidMove && isMyTurn) {
            // Remove previous selection
            document.querySelectorAll('.card.selected').forEach(c => {
              c.classList.remove('selected');
            });
            
            // Select this card
            cardDiv.classList.add('selected');
            
            // Enable play button
            if (playBtn) {
              playBtn.disabled = false;
            }
          }
        });
        
        handContainer.appendChild(cardDiv);
      });
    }
    
    if (handCount) {
      handCount.textContent = hand.length;
    }
    
    // Update button states
    if (playBtn) {
      playBtn.disabled = !isMyTurn || !document.querySelector('.card.selected');
    }
    
    if (passBtn) {
      passBtn.disabled = !isMyTurn;
    }
    
    if (drawBtn) {
      drawBtn.disabled = !isMyTurn;
    }
  }
  
  updateDeckSize(size) {
    const deckSize = document.getElementById('deck-size');
    if (deckSize) {
      deckSize.textContent = size;
    }
  }
  
  updateTurnTimer(timeLeft) {
    this.turnTimeLeft = timeLeft;
    const timerElement = document.getElementById('turn-timer');
    if (timerElement) {
      timerElement.textContent = `${timeLeft}s`;
      
      // Change color based on time left
      if (timeLeft <= 10) {
        timerElement.style.color = '#dc3545';
      } else if (timeLeft <= 20) {
        timerElement.style.color = '#ffc107';
      } else {
        timerElement.style.color = '#28a745';
      }
    }
  }
  
  addMessage(message, type = 'info') {
    const messagesContainer = document.getElementById('game-messages');
    if (messagesContainer) {
      const messageDiv = document.createElement('div');
      messageDiv.className = `message ${type}`;
      messageDiv.textContent = message;
      
      messagesContainer.appendChild(messageDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        if (messageDiv.parentNode) {
          messageDiv.parentNode.removeChild(messageDiv);
        }
      }, 5000);
    }
  }
  
  getSuitSymbol(suit) {
    const symbols = {
      hearts: '♥',
      diamonds: '♦',
      clubs: '♣',
      spades: '♠'
    };
    return symbols[suit] || '?';
  }
  
  getPlayerName(playerId) {
    // Try to get player name from game state or use player ID
    if (window.currentGame && window.currentGame.players) {
      const player = window.currentGame.players.find(p => p.id === playerId);
      if (player) {
        return player.name || player.username || `Player ${playerId}`;
      }
    }
    return `Player ${playerId}`;
  }
  
  handleGameStarted(data) {
    this.gamePhase = 'playing';
    this.updatePlayers(data.players);
    this.updateLastCard(data.lastPlayedCard);
    this.updateDeckSize(data.deckSize);
    
    const startBtn = document.getElementById('start-game-btn');
    if (startBtn) {
      startBtn.style.display = 'none';
    }
    
    this.addMessage('Game started! Good luck!', 'success');
  }
  
  handleCardPlayed(data) {
    this.updatePlayers(data.players);
    this.updateLastCard(data.lastPlayedCard);
    this.updateDeckSize(data.deckSize);
    
    if (data.playedCard) {
      this.addMessage(`Card ${data.playedCard.rank} of ${data.playedCard.suit} was played!`, 'info');
    }
  }
  
  handlePlayerPassed(data) {
    this.updatePlayers(data.players);
    this.updateLastCard(data.lastPlayedCard);
    this.updateDeckSize(data.deckSize);
    
    if (data.passedPlayer) {
      this.addMessage(`${this.getPlayerName(data.passedPlayer)} passed`, 'info');
    }
  }
  
  handleCardDrawn(data) {
    this.updatePlayers(data.players);
    this.updateDeckSize(data.deckSize);
    this.addMessage('You drew a card', 'info');
  }
  
  handleDeckShuffled(data) {
    this.addMessage(data.message, 'info');
  }
  
  handleYourHand(data) {
    this.updatePlayerHand(data.hand, data.validMoves, data.isYourTurn);
    this.updateLastCard(data.lastPlayedCard);
    
    if (data.drawnCard) {
      this.addMessage(`You drew: ${data.drawnCard.rank} of ${data.drawnCard.suit}`, 'info');
    }
  }
  
  handleGameEnded(data) {
    this.gamePhase = 'ended';
    
    // Disable all buttons
    document.querySelectorAll('.btn').forEach(btn => {
      btn.disabled = true;
    });
    
    if (data.winner === window.socket?.id) {
      this.addMessage(`🎉 You won! Congratulations!`, 'success');
    } else {
      this.addMessage(`🏆 ${data.winnerName} won the game!`, 'info');
    }
    
    // Show final scores
    this.addMessage('Final scores:', 'info');
    data.players.forEach(player => {
      this.addMessage(`${this.getPlayerName(player.playerId)}: ${player.handSize} cards remaining`, 'info');
    });
  }
  
  handleError(error) {
    this.addMessage(error.message, 'error');
  }
  
  destroy() {
    if (this.turnTimer) {
      clearInterval(this.turnTimer);
    }
    
    if (this.gameContainer && this.gameContainer.parentNode) {
      this.gameContainer.parentNode.removeChild(this.gameContainer);
    }
  }
}

// Initialize the game when this script loads
let cambioGame = null;

function initCambioGame() {
  if (cambioGame) {
    cambioGame.destroy();
  }
  cambioGame = new CambioGame();
}

// Socket event handlers
function setupCambioSocketHandlers() {
  if (window.socket) {
    window.socket.on('gameStarted', (data) => {
      if (cambioGame) cambioGame.handleGameStarted(data);
    });
    
    window.socket.on('cardPlayed', (data) => {
      if (cambioGame) cambioGame.handleCardPlayed(data);
    });
    
    window.socket.on('playerPassed', (data) => {
      if (cambioGame) cambioGame.handlePlayerPassed(data);
    });
    
    window.socket.on('cardDrawn', (data) => {
      if (cambioGame) cambioGame.handleCardDrawn(data);
    });
    
    window.socket.on('deckShuffled', (data) => {
      if (cambioGame) cambioGame.handleDeckShuffled(data);
    });
    
    window.socket.on('yourHand', (data) => {
      if (cambioGame) cambioGame.handleYourHand(data);
    });
    
    window.socket.on('gameEnded', (data) => {
      if (cambioGame) cambioGame.handleGameEnded(data);
    });
    
    window.socket.on('error', (error) => {
      if (cambioGame) cambioGame.handleError(error);
    });
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCambioGame);
} else {
  initCambioGame();
}

// Set up socket handlers
setupCambioSocketHandlers();

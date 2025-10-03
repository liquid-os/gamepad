// Get lobby code and player name from parent window (since we're in an iframe)
let lobbyCode = null;
let playerName = null;

if (window.parent && window.parent.currentLobbyCode && window.parent.myName) {
  lobbyCode = window.parent.currentLobbyCode;
  playerName = window.parent.myName;
  console.log('Got data from parent window - lobbyCode:', lobbyCode, 'playerName:', playerName);
} else {
  // Fallback to URL params if parent data not available
  const urlParams = new URLSearchParams(window.location.search);
  lobbyCode = urlParams.get('lobbyCode');
  playerName = urlParams.get('playerName');
  console.log('Got data from URL params - lobbyCode:', lobbyCode, 'playerName:', playerName);
}

console.log('Tic Tac Toe client loading...');
console.log('Lobby code:', lobbyCode);
console.log('Player name:', playerName);

const boardEl = document.getElementById('board');
const messageEl = document.getElementById('message');

// Don't create a new socket connection - use the parent window's socket
let socket = null;
let myId = null;
let gameState = null;
let mySymbol = null;

// Try to get socket from parent window
if (window.parent && window.parent.socket) {
  socket = window.parent.socket;
  myId = socket.id;
  console.log('Using parent socket connection:', myId);
} else {
  // Fallback: create new socket connection
  socket = io('/lobby');
  console.log('Created new socket connection');
}

// Create the game board
for (let i = 0; i < 9; i++) {
  const cell = document.createElement('div');
  cell.classList.add('cell');
  cell.dataset.index = i;
  cell.addEventListener('click', () => {
    if (gameState && gameState.gamePhase === 'playing' && gameState.currentTurn === myId) {
      socket.emit('action', { code: lobbyCode, data: { index: i } });
    }
  });
  boardEl.appendChild(cell);
}

socket.on('connect', () => {
  myId = socket.id;
  console.log('Connected with ID:', myId);
  
  // Don't join lobby - we're already connected through parent window
  console.log('Game client connected, waiting for game events...');
});

socket.on('gameMessage', msg => {
  messageEl.textContent = msg.text;
  console.log('Game message:', msg.text);
});

socket.on('updateState', state => {
  gameState = state;
  console.log('Game state updated:', state);
  
  // Update my symbol
  if (state.playerSymbols && state.playerSymbols[myId]) {
    mySymbol = state.playerSymbols[myId];
  }

  // Update board display
  const cells = document.querySelectorAll('.cell');
  cells.forEach((cell, i) => {
    const cellValue = state.board[i];
    if (cellValue) {
      // Find which player owns this cell and get their symbol
      const playerId = cellValue;
      const symbol = state.playerSymbols[playerId] || '?';
      cell.textContent = symbol;
      
      // Color coding
      if (playerId === myId) {
        cell.style.backgroundColor = '#e3f2fd';
        cell.style.color = '#1976d2';
      } else {
        cell.style.backgroundColor = '#fff3e0';
        cell.style.color = '#f57c00';
      }
    } else {
      cell.textContent = '';
      cell.style.backgroundColor = '';
      cell.style.color = '';
    }
    
    // Disable cells that are taken or not my turn
    if (cellValue || state.gamePhase !== 'playing' || state.currentTurn !== myId) {
      cell.style.cursor = 'not-allowed';
      cell.style.opacity = '0.6';
    } else {
      cell.style.cursor = 'pointer';
      cell.style.opacity = '1';
    }
  });
  
  // Update turn indicator
  if (state.gamePhase === 'playing') {
    const currentPlayer = state.currentTurn;
    if (currentPlayer === myId) {
      messageEl.textContent = `Your turn (${mySymbol}) - Click a square!`;
    } else {
      messageEl.textContent = `Waiting for other player...`;
    }
  } else if (state.gamePhase === 'finished') {
    if (state.winner === myId) {
      messageEl.textContent = '🎉 You won!';
    } else if (state.winner) {
      messageEl.textContent = '😔 You lost!';
    } else {
      messageEl.textContent = "It's a tie!";
    }
  }
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});

// Handle connection errors
socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
  messageEl.textContent = 'Connection error. Please refresh the page.';
});

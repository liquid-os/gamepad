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

const messageEl = document.getElementById('message');
const gameAreaEl = document.getElementById('gameArea');
const scoresEl = document.getElementById('scores');

// Don't create a new socket connection - use the parent window's socket
let socket = null;
let myId = null;
let gameState = null;
let submitted = false;

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

socket.on('connect', () => {
  myId = socket.id;
  
  // Don't join lobby - we're already connected through parent window
  console.log('Word game client connected, waiting for game events...');
});

socket.on('gameMessage', msg => {
  messageEl.textContent = msg.text;
});

socket.on('updateState', state => {
  gameState = state;
  renderGame();
});

socket.on('showRoundResults', results => {
  showRoundResults(results);
});

socket.on('finalScores', scores => {
  showFinalScores(scores);
});

function renderGame() {
  if (!gameState) return;

  if (gameState.gamePhase === 'playing' && gameState.currentLetter) {
    renderPlayingState();
  } else if (gameState.gamePhase === 'waiting') {
    gameAreaEl.innerHTML = '<div class="round-info">⏳ Waiting for the game to start...</div>';
  } else if (gameState.gamePhase === 'finished') {
    gameAreaEl.innerHTML = '<div class="round-info">🎉 Game finished!</div>';
  }

  renderScores();
}

function renderPlayingState() {
  const roundInfo = `
    <div class="round-info">
      <h3>Round ${gameState.round} of ${gameState.maxRounds}</h3>
      <div class="letter-display">${gameState.currentLetter}</div>
      <p>Think of a word that starts with the letter <strong>${gameState.currentLetter}</strong>!</p>
    </div>
  `;
  
  const inputForm = `
    <div class="input-group">
      <input type="text" id="wordInput" placeholder="Enter your word..." maxlength="20" />
      <button id="submitWord" ${submitted ? 'disabled' : ''}>
        ${submitted ? 'Submitted!' : 'Submit Word'}
      </button>
    </div>
  `;
  
  gameAreaEl.innerHTML = roundInfo + inputForm;
  
  if (!submitted) {
    const wordInput = document.getElementById('wordInput');
    const submitBtn = document.getElementById('submitWord');
    
    wordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        submitWord();
      }
    });
    
    submitBtn.addEventListener('click', submitWord);
    
    // Auto-focus input
    wordInput.focus();
  }
}

function submitWord() {
  const wordInput = document.getElementById('wordInput');
  const word = wordInput.value.trim();
  
  if (word.length === 0) {
    alert('Please enter a word!');
    return;
  }
  
  if (!word.toLowerCase().startsWith(gameState.currentLetter.toLowerCase())) {
    alert(`Word must start with the letter "${gameState.currentLetter}"!`);
    return;
  }
  
  submitted = true;
  socket.emit('action', { 
    code: lobbyCode, 
    data: { word: word } 
  });
  
  // Update UI
  document.getElementById('submitWord').textContent = 'Submitted!';
  document.getElementById('submitWord').disabled = true;
  wordInput.disabled = true;
}

function showRoundResults(results) {
  const resultsHtml = `
    <div class="results">
      <h3>📊 Round ${gameState.round} Results</h3>
      <p><strong>Letter:</strong> ${results.letter}</p>
      <div class="word-list">
        ${results.words.map(word => `
          <div class="word-item ${word.unique ? 'unique' : 'duplicate'}">
            <div><strong>${word.player}</strong></div>
            <div>${word.word}</div>
            <div>${word.points} pts ${word.unique ? '✨' : '🔄'}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  
  gameAreaEl.innerHTML = resultsHtml;
  submitted = false; // Reset for next round
}

function showFinalScores(scores) {
  const scoresHtml = `
    <div class="results">
      <h3>🏆 Final Scores</h3>
      ${scores.map((score, index) => `
        <div class="score-item ${index === 0 ? 'winner' : ''}">
          <span>${index + 1}. ${score.player}</span>
          <span>${score.score} points</span>
        </div>
      `).join('')}
    </div>
  `;
  
  gameAreaEl.innerHTML = scoresHtml;
}

function renderScores() {
  if (!gameState || !gameState.scores) return;
  
  const scores = Object.keys(gameState.scores)
    .map(playerId => ({
      player: playerName || 'You',
      score: gameState.scores[playerId]
    }))
    .sort((a, b) => b.score - a.score);
  
  const scoresHtml = `
    <h3>📈 Current Scores</h3>
    ${scores.map(score => `
      <div class="score-item">
        <span>${score.player}</span>
        <span>${score.score} pts</span>
      </div>
    `).join('')}
  `;
  
  scoresEl.innerHTML = scoresHtml;
}


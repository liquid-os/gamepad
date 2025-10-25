// Get lobby code and player name from parent window (since we're in an iframe)
let lobbyCode = null;
let playerName = null;

console.log('Checking parent window data...');
console.log('window.parent:', window.parent);
console.log('window.parent.currentLobbyCode:', window.parent?.currentLobbyCode);
console.log('window.parent.myName:', window.parent?.myName);

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

console.log('Trivia client loading...');
console.log('Lobby code:', lobbyCode);
console.log('Player name:', playerName);

const messageEl = document.getElementById('message');
const gameAreaEl = document.getElementById('gameArea');
const scoresEl = document.getElementById('scores');

// Don't create a new socket connection - use the parent window's socket
let socket = null;
let myId = null;
let gameState = null;
let selectedAnswer = null;

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

// Initialize the game area
gameAreaEl.innerHTML = '<div class="question">⏳ Connecting to game...</div>';

socket.on('connect', () => {
  myId = socket.id;
  console.log('Connected to server with ID:', myId);
  
  // Don't join lobby - we're already connected through parent window
  console.log('Trivia game client connected, waiting for game events...');
});

socket.on('gameMessage', msg => {
  messageEl.textContent = msg.text;
});

socket.on('updateState', state => {
  console.log('Received game state update:', state);
  gameState = state;
  renderGame();
});

socket.on('showResults', results => {
  showResults(results);
});

socket.on('finalScores', scores => {
  showFinalScores(scores);
});

function renderGame() {
  if (!gameState) {
    gameAreaEl.innerHTML = '<div class="question">⏳ Loading game...</div>';
    return;
  }

  console.log('Rendering game with state:', gameState);

  if (gameState.gamePhase === 'question' && gameState.currentQuestion) {
    renderQuestion(gameState.currentQuestion);
  } else if (gameState.gamePhase === 'waiting') {
    gameAreaEl.innerHTML = '<div class="question">⏳ Waiting for the game to start...</div>';
  } else if (gameState.gamePhase === 'finished') {
    gameAreaEl.innerHTML = '<div class="question">🎉 Game finished!</div>';
  } else {
    gameAreaEl.innerHTML = '<div class="question">⏳ Loading game...</div>';
  }

  renderScores();
}

function renderQuestion(question) {
  const questionHtml = `
    <div class="question">${question.question}</div>
    <div class="options">
      ${question.options.map((option, index) => `
        <div class="option" data-index="${index}">
          ${String.fromCharCode(65 + index)}. ${option}
        </div>
      `).join('')}
    </div>
  `;
  
  gameAreaEl.innerHTML = questionHtml;
  
  // Add click handlers
  document.querySelectorAll('.option').forEach(option => {
    option.addEventListener('click', () => {
      if (selectedAnswer !== null) return; // Already answered
      
      selectedAnswer = parseInt(option.dataset.index);
      option.classList.add('selected');
      
      // Send answer
      console.log('Submitting answer:', selectedAnswer, 'for lobby:', lobbyCode);
      socket.emit('action', { 
        code: lobbyCode, 
        data: { answer: selectedAnswer } 
      });
    });
  });
}

function showResults(results) {
  const resultsHtml = `
    <div class="results">
      <h3>📊 Results for: ${results.question}</h3>
      <p><strong>Correct Answer:</strong> ${results.correctAnswer}</p>
      <div class="player-answers">
        ${results.playerAnswers.map(answer => `
          <div class="result-item ${answer.correct ? 'correct' : 'incorrect'}">
            <strong>${answer.player}:</strong> ${answer.answer} 
            ${answer.correct ? '✅' : '❌'} 
            (${Math.round(answer.time/1000)}s)
          </div>
        `).join('')}
      </div>
    </div>
  `;
  
  gameAreaEl.innerHTML = resultsHtml;
  selectedAnswer = null; // Reset for next question
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
  if (!gameState || !gameState.scores) {
    scoresEl.innerHTML = '';
    return;
  }
  
  // Simple approach: just show the scores with player IDs for now
  const scores = Object.keys(gameState.scores)
    .map(playerId => ({
      player: `Player ${playerId.slice(-4)}`,
      score: gameState.scores[playerId]
    }))
    .sort((a, b) => b.score - a.score);
  
  if (scores.length === 0) {
    scoresEl.innerHTML = '';
    return;
  }
  
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


/**
 * Game Template - Client Logic
 * 
 * This is the client-side JavaScript for your game.
 * It handles communication with the server and updates the UI.
 * 
 * REQUIRED FUNCTIONS:
 * - initializeGame(): Called when the game loads
 * - handleGameState(data): Called when game state updates
 * - handleGameMessage(data): Called when server sends messages
 * 
 * SOCKET EVENTS TO LISTEN FOR:
 * - gameState: Game state updates
 * - gameMessage: Server messages
 * - error: Error messages
 * 
 * SOCKET EVENTS TO SEND:
 * - playerAction: Send player actions to server
 */

// Game state
let gameState = {
    phase: 'waiting',
    players: [],
    currentPlayer: null,
    gameData: null
};

// DOM elements
let elements = {};

// Initialize the game when page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeGame();
});

function initializeGame() {
    console.log('Initializing game...');
    
    // Get DOM elements
    elements = {
        gamePhase: document.getElementById('gamePhase'),
        playerCount: document.getElementById('playerCount'),
        gameCode: document.getElementById('gameCode'),
        gameContent: document.getElementById('gameContent'),
        gameMessages: document.getElementById('gameMessages'),
        
        // Phase containers
        waitingPhase: document.getElementById('waitingPhase'),
        readyPhase: document.getElementById('readyPhase'),
        playingPhase: document.getElementById('playingPhase'),
        finishedPhase: document.getElementById('finishedPhase'),
        
        // Buttons
        readyBtn: document.getElementById('readyBtn'),
        actionBtn: document.getElementById('actionBtn'),
        resetBtn: document.getElementById('resetBtn'),
        playAgainBtn: document.getElementById('playAgainBtn'),
        
        // Content areas
        playerScores: document.getElementById('playerScores'),
        winner: document.getElementById('winner'),
        finalScores: document.getElementById('finalScores')
    };
    
    // Set up event listeners
    setupEventListeners();
    
    // Get game code from URL or server
    getGameCode();
    
    console.log('Game initialized');
}

function setupEventListeners() {
    // Ready button
    if (elements.readyBtn) {
        elements.readyBtn.addEventListener('click', function() {
            sendAction('ready', { ready: true });
        });
    }
    
    // Action button
    if (elements.actionBtn) {
        elements.actionBtn.addEventListener('click', function() {
            // Example action - modify this for your game
            const points = Math.floor(Math.random() * 5) + 1; // Random 1-5 points
            sendAction('gameAction', { points: points });
        });
    }
    
    // Reset button
    if (elements.resetBtn) {
        elements.resetBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to reset the game?')) {
                sendAction('reset', {});
            }
        });
    }
    
    // Play again button
    if (elements.playAgainBtn) {
        elements.playAgainBtn.addEventListener('click', function() {
            sendAction('reset', {});
        });
    }
}

function getGameCode() {
    // Try to get game code from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
        elements.gameCode.textContent = code;
    } else {
        // If no code in URL, you might want to get it from the server
        elements.gameCode.textContent = 'No game code found';
    }
}

// REQUIRED: Handle game state updates from server
function handleGameState(data) {
    console.log('Game state update:', data);
    
    gameState = { ...gameState, ...data };
    
    // Update UI based on game phase
    updateGamePhase(data.phase);
    
    // Update player count
    if (data.players) {
        elements.playerCount.textContent = `${data.players.length}/4 players`;
        updatePlayerScores(data.players);
    }
    
    // Update game phase indicator
    elements.gamePhase.textContent = data.phase || 'Unknown';
}

// REQUIRED: Handle messages from server
function handleGameMessage(data) {
    console.log('Game message:', data);
    addMessage(data.text || data.message || 'Server message');
}

// REQUIRED: Handle errors from server
function handleError(data) {
    console.error('Game error:', data);
    addMessage(`Error: ${data.message || 'Unknown error'}`, 'error');
}

function updateGamePhase(phase) {
    // Hide all phases
    const phases = ['waitingPhase', 'readyPhase', 'playingPhase', 'finishedPhase'];
    phases.forEach(phaseId => {
        if (elements[phaseId]) {
            elements[phaseId].classList.add('hidden');
        }
    });
    
    // Show current phase
    switch (phase) {
        case 'waiting':
            if (elements.waitingPhase) elements.waitingPhase.classList.remove('hidden');
            break;
        case 'ready':
            if (elements.readyPhase) elements.readyPhase.classList.remove('hidden');
            break;
        case 'playing':
            if (elements.playingPhase) elements.playingPhase.classList.remove('hidden');
            break;
        case 'finished':
            if (elements.finishedPhase) elements.finishedPhase.classList.remove('hidden');
            updateGameResults();
            break;
    }
}

function updatePlayerScores(players) {
    if (!elements.playerScores) return;
    
    elements.playerScores.innerHTML = '';
    
    players.forEach(player => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-score';
        playerDiv.innerHTML = `
            <span class="player-name">${player.username}</span>
            <span class="player-points">${player.score || 0} points</span>
        `;
        elements.playerScores.appendChild(playerDiv);
    });
}

function updateGameResults() {
    if (!gameState.winner) return;
    
    if (elements.winner) {
        elements.winner.textContent = `${gameState.winner} wins!`;
    }
    
    if (elements.finalScores && gameState.players) {
        elements.finalScores.innerHTML = '';
        
        // Sort players by score
        const sortedPlayers = [...gameState.players].sort((a, b) => (b.score || 0) - (a.score || 0));
        
        sortedPlayers.forEach((player, index) => {
            const playerDiv = document.createElement('div');
            playerDiv.className = `final-score ${index === 0 ? 'winner' : ''}`;
            playerDiv.innerHTML = `
                <span class="rank">#${index + 1}</span>
                <span class="name">${player.username}</span>
                <span class="score">${player.score || 0} points</span>
            `;
            elements.finalScores.appendChild(playerDiv);
        });
    }
}

function sendAction(type, data) {
    const actionData = {
        type: type,
        ...data
    };
    
    console.log('Sending action:', actionData);
    
    // Send to server via socket
    if (window.socket && window.socket.connected) {
        window.socket.emit('playerAction', actionData);
    } else {
        console.warn('Socket not connected, cannot send action');
        addMessage('Not connected to server', 'error');
    }
}

function addMessage(text, type = 'info') {
    if (!elements.gameMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = text;
    
    elements.gameMessages.appendChild(messageDiv);
    
    // Auto-scroll to bottom
    elements.gameMessages.scrollTop = elements.gameMessages.scrollHeight;
    
    // Remove old messages (keep last 10)
    const messages = elements.gameMessages.children;
    if (messages.length > 10) {
        elements.gameMessages.removeChild(messages[0]);
    }
}

// Utility functions
function showElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) element.classList.remove('hidden');
}

function hideElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) element.classList.add('hidden');
}

function toggleElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) element.classList.toggle('hidden');
}

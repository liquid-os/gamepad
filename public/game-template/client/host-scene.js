/**
 * Game Template - Host Display Logic
 * 
 * This handles the host display that shows on the TV screen.
 * It receives updates from the server and displays the current game state.
 * 
 * REQUIRED FUNCTIONS:
 * - handleHostGameUpdate(data): Called when game state updates
 * - addHostMessage(text, type): Add messages to host display
 * 
 * SOCKET EVENTS TO LISTEN FOR:
 * - hostGameUpdate: Game state updates for host
 * - hostMessage: Messages for host display
 */

// Host display state
let hostState = {
    phase: 'waiting',
    players: [],
    round: 0,
    messages: []
};

// DOM elements
let hostElements = {};

// Initialize host display when page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeHostDisplay();
});

function initializeHostDisplay() {
    console.log('Initializing host display...');
    
    // Get DOM elements
    hostElements = {
        gamePhase: document.getElementById('gamePhase'),
        playerList: document.getElementById('playerList'),
        statusMessage: document.getElementById('statusMessage'),
        playerCount: document.getElementById('playerCount'),
        gameRound: document.getElementById('gameRound'),
        gameTime: document.getElementById('gameTime'),
        hostMessages: document.getElementById('hostMessages')
    };
    
    // Add initial message
    addHostMessage('Host display ready', 'info');
    
    console.log('Host display initialized');
}

// REQUIRED: Handle game state updates from server
function handleHostGameUpdate(data) {
    console.log('Host game update:', data);
    
    // Update host state
    hostState = { ...hostState, ...data };
    
    // Update game phase
    if (data.phase) {
        hostElements.gamePhase.textContent = data.phase.charAt(0).toUpperCase() + data.phase.slice(1);
    }
    
    // Update status message
    if (data.message) {
        hostElements.statusMessage.textContent = data.message;
    }
    
    // Update player list
    if (data.players) {
        updatePlayerList(data.players);
        hostElements.playerCount.textContent = data.players.length;
    }
    
    // Update game round
    if (data.round !== undefined) {
        hostElements.gameRound.textContent = data.round;
    }
    
    // Add message about the update
    if (data.message) {
        addHostMessage(data.message, 'info');
    }
}

// REQUIRED: Handle messages for host display
function handleHostMessage(data) {
    console.log('Host message:', data);
    addHostMessage(data.text || data.message || 'Host message', 'info');
}

function updatePlayerList(players) {
    if (!hostElements.playerList) return;
    
    hostElements.playerList.innerHTML = '';
    
    if (players.length === 0) {
        hostElements.playerList.innerHTML = '<div class="no-players">No players joined yet</div>';
        return;
    }
    
    players.forEach(player => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-item';
        
        const score = player.score || 0;
        const readyStatus = player.ready ? ' ✓' : '';
        
        playerDiv.innerHTML = `
            <span class="player-name">${player.username}${readyStatus}</span>
            <span class="player-score">${score} pts</span>
        `;
        
        hostElements.playerList.appendChild(playerDiv);
    });
}

function addHostMessage(text, type = 'info') {
    if (!hostElements.hostMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = text;
    
    hostElements.hostMessages.appendChild(messageDiv);
    
    // Auto-scroll to bottom
    hostElements.hostMessages.scrollTop = hostElements.hostMessages.scrollHeight;
    
    // Remove old messages (keep last 20)
    const messages = hostElements.hostMessages.children;
    if (messages.length > 20) {
        hostElements.hostMessages.removeChild(messages[0]);
    }
}

// Update game timer (if needed)
function updateGameTimer() {
    // Implement timer logic if your game needs it
    // This is called periodically to update the time display
}

// Start timer updates (if needed)
setInterval(updateGameTimer, 1000);

// Street Brawler - Player Controller

// Get socket from parent window
const socket = window.parent.socket || io('/lobby');
const lobbyCode = window.parent.currentLobbyCode;
const playerName = window.parent.myName;

// Fighter icons
const FIGHTER_ICONS = {
  ryu: '🥋',
  ken: '🥊'
};

// Game state
let gameState = {
  phase: 'character_select',
  selectedFighter: null,
  availableFighters: [],
  selectedFighters: {}
};

// DOM elements
const characterSelect = document.getElementById('characterSelect');
const fighterList = document.getElementById('fighterList');
const selectedFighter = document.getElementById('selectedFighter');
const yourFighter = document.getElementById('yourFighter');

const controller = document.getElementById('controller');
const playerNameEl = document.getElementById('playerName');
const playerHealthBar = document.getElementById('playerHealthBar');
const playerHealthText = document.getElementById('playerHealthText');

const gameEnd = document.getElementById('gameEnd');
const endTitle = document.getElementById('endTitle');
const endMessage = document.getElementById('endMessage');

// Controller elements
const joystick = document.getElementById('joystick');
const joystickKnob = document.getElementById('joystickKnob');
const btnJump = document.getElementById('btnJump');
const btnA = document.getElementById('btnA');
const btnB = document.getElementById('btnB');
const btnX = document.getElementById('btnX');

// Socket event listeners
socket.on('gameState', (data) => {
  console.log('Game state received:', data);
  gameState.phase = data.phase;
  gameState.availableFighters = data.availableFighters || ['ryu', 'ken'];
  
  if (data.phase === 'character_select') {
    renderFighterSelection();
  }
});

// Request game state on load
socket.emit('getGameState');

socket.on('fighterSelected', (data) => {
  console.log('Fighter selected event received:', data);
  gameState.selectedFighters[data.fighterId] = data.playerName;
  
  console.log('My socket.id:', socket.id, 'Event playerId:', data.playerId);
  
  if (data.playerId === socket.id) {
    console.log('This is my selection!');
    gameState.selectedFighter = data.fighterId;
    showSelectedFighter(data.fighterId);
  } else {
    console.log('Another player selected');
  }
  
  updateFighterAvailability();
});

socket.on('fightStarted', (data) => {
  console.log('Fight started:', data);
  showController();
});

socket.on('healthUpdate', (data) => {
  console.log('Health update:', data);
  
  if (data.playerId === socket.id) {
    updateHealth(data.health, data.maxHealth);
  }
});

socket.on('fightEnded', (data) => {
  console.log('Fight ended:', data);
  
  setTimeout(() => {
    if (data.winnerId === socket.id) {
      showEndScreen('VICTORY!', 'You defeated your opponent!');
    } else {
      showEndScreen('DEFEAT', 'You were defeated...');
    }
  }, 1000);
});

socket.on('error', (data) => {
  console.error('Error:', data);
  alert(data.message);
});

// ========== FIGHTER SELECTION ==========

function renderFighterSelection() {
  characterSelect.style.display = 'flex';
  controller.style.display = 'none';
  gameEnd.style.display = 'none';
  
  fighterList.innerHTML = '';
  
  const fighterData = {
    ryu: { name: 'Ryu', health: 100, icon: FIGHTER_ICONS.ryu },
    ken: { name: 'Ken', health: 100, icon: FIGHTER_ICONS.ken }
  };
  
  gameState.availableFighters.forEach(fighterId => {
    const fighter = fighterData[fighterId];
    const isTaken = gameState.selectedFighters[fighterId];
    
    const card = document.createElement('div');
    card.className = `fighter-card ${isTaken ? 'taken' : ''}`;
    card.innerHTML = `
      <div class="fighter-icon">${fighter.icon}</div>
      <div class="fighter-name">${fighter.name}</div>
      <div class="fighter-health">❤️ ${fighter.health} HP</div>
      ${isTaken ? '<div style="margin-top:10px; color:#ef4444;">Taken</div>' : ''}
    `;
    
    if (!isTaken) {
      card.onclick = () => selectFighter(fighterId);
    }
    
    fighterList.appendChild(card);
  });
}

function selectFighter(fighterId) {
  console.log('Selecting fighter:', fighterId);
  
  // Send via the game action system
  socket.emit('action', {
    code: lobbyCode,
    data: {
      action: 'selectFighter',
      payload: { fighterId: fighterId }
    }
  });
}

function showSelectedFighter(fighterId) {
  const fighterNames = {
    ryu: 'Ryu',
    ken: 'Ken'
  };
  
  yourFighter.textContent = fighterNames[fighterId];
  selectedFighter.style.display = 'block';
  
  // Hide fighter cards
  fighterList.style.display = 'none';
}

function updateFighterAvailability() {
  renderFighterSelection();
}

// ========== CONTROLLER ==========

function showController() {
  characterSelect.style.display = 'none';
  controller.style.display = 'flex';
  gameEnd.style.display = 'none';
  
  playerNameEl.textContent = playerName || 'Player';
  
  setupControllerInputs();
}

function setupControllerInputs() {
  let currentDirection = 'neutral';
  let isJoystickActive = false;
  
  // Digital Joystick
  const joystickRect = joystick.getBoundingClientRect();
  const joystickCenter = {
    x: joystickRect.left + joystickRect.width / 2,
    y: joystickRect.top + joystickRect.height / 2
  };
  
  function updateJoystickDirection(clientX, clientY) {
    const deltaX = clientX - joystickCenter.x;
    const deltaY = clientY - joystickCenter.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxDistance = joystickRect.width / 2;
    
    if (distance > maxDistance) {
      // Clamp to joystick boundary
      const angle = Math.atan2(deltaY, deltaX);
      const clampedX = joystickCenter.x + Math.cos(angle) * maxDistance;
      const clampedY = joystickCenter.y + Math.sin(angle) * maxDistance;
      updateJoystickKnob(clampedX, clampedY);
    } else {
      updateJoystickKnob(clientX, clientY);
    }
    
    // Determine direction based on position
    const threshold = maxDistance * 0.3; // 30% of joystick radius
    let newDirection = 'neutral';
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal movement
      if (deltaX > threshold) {
        newDirection = 'right';
      } else if (deltaX < -threshold) {
        newDirection = 'left';
      }
    } else {
      // Vertical movement (but we don't use up/down for jumping anymore)
      // Keep as neutral since jump is handled by separate button
    }
    
    if (newDirection !== currentDirection) {
      currentDirection = newDirection;
      sendJoystickInput(currentDirection);
    }
  }
  
  function updateJoystickKnob(x, y) {
    const knobX = x - joystickRect.left - joystickRect.width / 2;
    const knobY = y - joystickRect.top - joystickRect.height / 2;
    joystickKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;
  }
  
  function resetJoystick() {
    joystickKnob.style.transform = 'translate(-50%, -50%)';
    joystickKnob.classList.remove('active');
    if (currentDirection !== 'neutral') {
      currentDirection = 'neutral';
      sendJoystickInput('neutral');
    }
    isJoystickActive = false;
  }
  
  // Touch events for joystick
  joystick.addEventListener('touchstart', (e) => {
    e.preventDefault();
    isJoystickActive = true;
    joystickKnob.classList.add('active');
    updateJoystickDirection(e.touches[0].clientX, e.touches[0].clientY);
  });
  
  joystick.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (isJoystickActive) {
      updateJoystickDirection(e.touches[0].clientX, e.touches[0].clientY);
    }
  });
  
  joystick.addEventListener('touchend', (e) => {
    e.preventDefault();
    resetJoystick();
  });
  
  // Mouse events for joystick
  joystick.addEventListener('mousedown', (e) => {
    e.preventDefault();
    isJoystickActive = true;
    joystickKnob.classList.add('active');
    updateJoystickDirection(e.clientX, e.clientY);
  });
  
  joystick.addEventListener('mousemove', (e) => {
    if (isJoystickActive) {
      updateJoystickDirection(e.clientX, e.clientY);
    }
  });
  
  joystick.addEventListener('mouseup', (e) => {
    e.preventDefault();
    resetJoystick();
  });
  
  // Jump button
  btnJump.addEventListener('touchstart', (e) => {
    e.preventDefault();
    sendJoystickInput('up'); // Use 'up' direction for jump
  });
  
  btnJump.addEventListener('mousedown', (e) => {
    e.preventDefault();
    sendJoystickInput('up'); // Use 'up' direction for jump
  });
  
  // Action buttons
  btnA.addEventListener('touchstart', (e) => {
    e.preventDefault();
    sendButtonInput('A');
  });
  
  btnB.addEventListener('touchstart', (e) => {
    e.preventDefault();
    sendButtonInput('B');
  });
  
  btnX.addEventListener('touchstart', (e) => {
    e.preventDefault();
    sendButtonInput('X');
  });
  
  // Mouse events for action buttons
  btnA.addEventListener('click', () => sendButtonInput('A'));
  btnB.addEventListener('click', () => sendButtonInput('B'));
  btnX.addEventListener('click', () => sendButtonInput('X'));
}

function sendJoystickInput(direction) {
  socket.emit('action', {
    code: lobbyCode,
    data: {
      action: 'controllerInput',
      payload: {
        type: 'joystick',
        direction: direction
      }
    }
  });
}

function sendButtonInput(button) {
  socket.emit('action', {
    code: lobbyCode,
    data: {
      action: 'controllerInput',
      payload: {
        type: 'button',
        button: button
      }
    }
  });
}

function updateHealth(health, maxHealth) {
  const percentage = (health / maxHealth) * 100;
  playerHealthBar.style.width = percentage + '%';
  playerHealthText.textContent = `${health}/${maxHealth}`;
}

// ========== END SCREEN ==========

function showEndScreen(title, message) {
  characterSelect.style.display = 'none';
  controller.style.display = 'none';
  gameEnd.style.display = 'flex';
  
  endTitle.textContent = title;
  endMessage.textContent = message;
}

// Initialize - show fighters immediately with defaults
setTimeout(() => {
  if (gameState.availableFighters.length === 0) {
    console.log('No game state received, using defaults');
    gameState.availableFighters = ['ryu', 'ken'];
    renderFighterSelection();
  }
}, 500);


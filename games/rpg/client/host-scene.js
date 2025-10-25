// Co-op RPG Quest - Animated Host Scene

// Get socket from parent window (host.html sets window.socket)
let socket = null;
let lobbyCode = null;

// Try different ways to get socket from parent
if (window.parent && window.parent !== window) {
  socket = window.parent.socket;
  lobbyCode = window.parent.currentCode;
}

// If still no socket, create new connection
if (!socket) {
  console.warn('No parent socket found, creating new connection');
  socket = io('/lobby');
}

// Expose socket globally for child iframes (like loot-screen.html)
window.socket = socket;

console.log('=== RPG Host Scene Debug ===');
console.log('Socket available:', !!socket);
console.log('Socket connected:', socket?.connected);
console.log('Lobby code:', lobbyCode);
console.log('===========================');

// ========== MUSIC SYSTEM ==========

let currentMusic = null;
let currentTrack = null;
let audioUnlocked = false;

// Unlock audio on first user interaction
document.addEventListener('click', unlockAudio, { once: true });
document.addEventListener('touchstart', unlockAudio, { once: true });

function unlockAudio() {
  console.log('Music: Audio unlocked by user interaction');
  audioUnlocked = true;
  
  // If we tried to play music before unlock, play it now
  if (currentTrack && (!currentMusic || currentMusic.paused)) {
    const trackToPlay = currentTrack;
    currentTrack = null; // Reset so playMusic doesn't skip
    playMusic(trackToPlay);
  }
}

function playMusic(track) {
  console.log(`Music: Attempting to play ${track}, audioUnlocked: ${audioUnlocked}`);
  
  // Don't restart if same track is already playing
  if (currentTrack === track && currentMusic && !currentMusic.paused) {
    console.log(`Music: ${track} already playing`);
    return;
  }
  
  // Stop current music
  if (currentMusic) {
    console.log(`Music: Stopping current track (${currentTrack})`);
    currentMusic.pause();
    currentMusic.currentTime = 0;
  }
  
  // Get the music file path
  let musicPath;
  if (track === 'combat') {
    // Randomly select from 1.mp3 to 8.mp3
    const randomNumber = Math.floor(Math.random() * 8) + 1;
    musicPath = `/games/rpg/assets/sounds/combatmusic/${randomNumber}.mp3`;
  } else if (track === 'loot') {
    musicPath = '/games/rpg/assets/loot.mp3';
  } else if (track === 'camp') {
    musicPath = '/games/rpg/assets/camp.mp3';
  } else {
    console.warn(`Music: Unknown track type: ${track}`);
    return;
  }
  
  // Create new audio element
  currentMusic = new Audio(musicPath);
  currentMusic.loop = true;
  currentMusic.volume = track == 'combat' ? 0.185 : 0.3; // 30% volume
  
  console.log(`Music: Created audio element for ${track}, file: ${musicPath}`);
  
  // Add event listeners for debugging
  currentMusic.addEventListener('loadeddata', () => {
    console.log(`Music: ${track} loaded successfully`);
  });
  
  currentMusic.addEventListener('error', (e) => {
    console.error(`Music: Error loading ${track}:`, e);
  });
  
  currentMusic.addEventListener('playing', () => {
    console.log(`Music: ${track} is now playing`);
  });
  
  // Play new track
  currentMusic.play()
    .then(() => {
      console.log(`Music: Successfully started playing ${track}`);
      currentTrack = track;
    })
    .catch(err => {
      console.warn(`Music: Could not play ${track}:`, err.message);
      if (!audioUnlocked) {
        console.warn('Music: Waiting for user interaction to unlock audio');
        currentTrack = track; // Remember what we want to play
      }
    });
}

function stopMusic() {
  if (currentMusic) {
    currentMusic.pause();
    currentMusic.currentTime = 0;
    currentMusic = null;
    currentTrack = null;
    console.log('Music: Stopped');
  }
}

function setRandomCombatBackground() {
  const basePath = '/games/rpg/assets/backgrounds/combat/';
  
  // Randomly select from 1.png to 24.png
  const randomNumber = Math.floor(Math.random() * 24) + 1;
  const randomBackground = `${basePath}${randomNumber}.png`;
  
  battleScene.style.backgroundImage = `url('${randomBackground}')`;
  console.log(`Background: Set to ${randomBackground}`);
}

function playSoundEffect(soundName) {
  if (!soundName) {
    return; // No sound specified
  }
  
  const soundPath = `/games/rpg/assets/sounds/${soundName}.mp3`;
  console.log(`Sound: Attempting to play ${soundName} from ${soundPath}`);
  
  const sound = new Audio(soundPath);
  sound.volume = 0.5; // 50% volume for sound effects
  
  sound.addEventListener('error', (e) => {
    console.warn(`Sound: Could not load ${soundName}:`, e);
  });
  
  sound.play().catch(err => {
    console.warn(`Sound: Could not play ${soundName}:`, err.message);
  });
}

// Helper function to convert hex color to hue rotation
function getHueRotationFromColor(hexColor) {
  // Remove # if present
  hexColor = hexColor.replace('#', '');
  
  // Convert hex to RGB
  const r = parseInt(hexColor.substr(0, 2), 16) / 255;
  const g = parseInt(hexColor.substr(2, 2), 16) / 255;
  const b = parseInt(hexColor.substr(4, 2), 16) / 255;
  
  // Find max and min values
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  
  let hue = 0;
  
  if (delta !== 0) {
    if (max === r) {
      hue = ((g - b) / delta) % 6;
    } else if (max === g) {
      hue = (b - r) / delta + 2;
    } else {
      hue = (r - g) / delta + 4;
    }
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  
  // Return hue rotation needed (subtract base orange/brown hue ~30deg)
  return hue - 30;
}

// Sprite configuration
const SPRITE_CONFIG = {
  player: {
    baseWidth: 352,  // Doubled size for better visibility
    baseHeight: 405, // Doubled size for better visibility
    leftSide: true,
    startX: 40,
    startYBase: window.innerHeight - 405 - 15,  // Start at 30% from top
    spacing: 40,    // Increased spacing for larger sprites
    horizontalOffset: 150  // Increased stagger for larger sprites
  },
  enemy: {
    baseWidth: 352 / 3 * 2,  // Increased size
    baseHeight: 405 / 3 * 2, // Increased size
    leftSide: false,
    startX: window.innerWidth - 352 / 5 * 3 - 80,
    startYBase: window.innerHeight - 405 / 5 * 3 - 15,  // Start at 30% from top
    spacing: 60,     // Reduced for overlap
    horizontalOffset: 130  // Stagger horizontally (opposite direction)
  }
};

// Animation types for different action categories
// ANIMATION_TYPES - No longer needed! Animation types are now sent from the server
// as part of the action data (animType property). This makes the system more dynamic
// and easier to maintain - just add animType to the action definition in server.js
// 
// Animation types:
//   - 'melee': Sprite slides toward target and back
//   - 'projectile': Projectile flies from actor to target
//   - 'spell': Casting animation + effect overlay on target
//   - 'support': Casting animation + heal/buff effect on target

// Class icon mappings
const CLASS_ICONS = {
  knight: '🛡️',
  wizard: '🧙',
  cleric: '✨',
  rogue: '🗡️',
  druid: '🌿',
  warlock: '👹'
};

let gameState = {
  phase: 'class_selection',
  players: {},
  enemies: {},
  sprites: {},
  animating: false
};

// DOM elements
const classSelection = document.getElementById('classSelection');
const classGrid = document.getElementById('classGrid');
const battleScene = document.getElementById('battleScene');
const roundInfo = document.getElementById('roundInfo');
const turnIndicator = document.getElementById('turnIndicator');
const turnOrderDisplay = document.getElementById('turnOrderDisplay');
const turnOrderList = document.getElementById('turnOrderList');
const spritesContainer = document.getElementById('spritesContainer');
const actionPopup = document.getElementById('actionPopup');
const actionActor = document.getElementById('actionActor');
const actionVerb = document.getElementById('actionVerb');
const actionNameEl = document.getElementById('actionName');

// ========== SOCKET EVENTS ==========

socket.on('hostGameUpdate', (data) => {
  console.log('Host game update:', data);
  
  if (data.phase === 'class_selection') {
    showClassSelection(data);
  } else if (data.phase === 'pick_a_path') {
    showPickAPathScene(data);
  } else if (data.phase === 'camp') {
    showCampScene(data);
  } else if (data.phase === 'defeat') {
    // Show defeat banner then return to lobby
    showDefeatBanner(data.message || 'Defeat! The party has been defeated...');
    setTimeout(() => {
      // Navigate back to lobby view
      window.location.href = '/';
    }, 4500);
  } else if (data.phase === 'skill_learning') {
    showSkillLearningScene(data);
  } else if (data.phase === 'talent_learning') {
    showTalentLearningScene(data);
  } else if (data.phase === 'combat') {
    // Check if this is a new combat encounter
    // Only reinitialize if:
    // 1. We're not in combat phase yet (first combat)
    // 2. We have no enemies stored (fresh start)
    // 3. The enemy IDs are completely different (new encounter, not just one died)
    let isNewEncounter = false;
    
    if (gameState.phase !== 'combat' || !gameState.enemies || gameState.enemies.length === 0) {
      // First combat or no previous enemies
      isNewEncounter = true;
    } else if (data.enemies && gameState.enemies) {
      // Check if ALL enemy IDs are different (indicates new encounter)
      // If even one enemy ID matches, it's the same encounter
      const hasAnyMatchingEnemy = data.enemies.some(newEnemy => 
        gameState.enemies.some(oldEnemy => oldEnemy.id === newEnemy.id)
      );
      
      if (!hasAnyMatchingEnemy && data.enemies.length > 0) {
        // No matching IDs means this is a completely new encounter
        isNewEncounter = true;
      }
    }
    
    if (isNewEncounter) {
      console.log('New combat encounter detected, initializing battle scene');
      initializeBattleScene(data);
    } else {
      // Update existing scene (enemy died, health changed, etc.)
      updateBattleScene(data);
    }
    
    // Show turn order when initiative is rolled (action selection phase)
    if (data.message && data.message.includes('Players selecting actions') && data.turnOrder) {
      showTurnOrderDisplay(data.turnOrder);
    }
    
    // Hide turn order when combat starts resolving
    if (data.message && data.message.includes('Resolving combat')) {
      hideTurnOrderDisplay();
    }
    
    // Update title based on encounter type
    const titleElement = document.getElementById('encounterTitle');
    if (data.encounterType === 'boss') {
      titleElement.textContent = 'Boss Battle';
    } else if (data.encounterType === 'puzzle') {
      titleElement.textContent = 'Interaction';
    } else {
      titleElement.textContent = 'Combat Encounter';
    }
  }
});

// Listen for loot complete to remove overlay
socket.on('lootComplete', () => {
  console.log('Loot phase complete, removing overlay');
  const lootOverlay = document.getElementById('lootOverlay');
  if (lootOverlay) {
    lootOverlay.remove();
  }
});

// Listen for camp complete to remove camp scene
socket.on('campComplete', () => {
  console.log('Camp phase complete, removing camp scene');
  const campFrame = document.getElementById('campFrame');
  if (campFrame) {
    campFrame.remove();
  }
});

// Listen for Pick a Path events
socket.on('pickAPathStarted', (data) => {
  console.log('[PICK_A_PATH] Pick a Path started:', data);
  showPickAPathScene(data);
});

socket.on('pathVoteUpdate', (data) => {
  console.log('[PICK_A_PATH] Vote update:', data);
  updatePathVotes(data);
});

socket.on('pathChosen', (data) => {
  console.log('[PICK_A_PATH] Path chosen:', data);
  // Could show a message here, but the encounter will start shortly anyway
});

// Listen for custom combat messages (for puzzle feedback)
  socket.on('customCombatMessage', (data) => {
    console.log('[DEBUG] Received customCombatMessage event:', data);
    showCustomCombatMessage(data.text, data.color);
  });

  socket.on('riddleDisplay', (data) => {
    console.log('Riddle display:', data);
    // Add a small delay to ensure DOM is ready
    setTimeout(() => {
      showRiddleDisplay(data.question, data.options);
    }, 500);
  });

// Function to show riddle display
function showRiddleDisplay(question, options) {
  // Prefer the modal turn order display used on this host scene
  let container = document.getElementById('turnOrderDisplay');
  if (!container) {
    // Fallbacks to avoid race conditions/layout differences
    container = document.getElementById('turnIndicator') || document.getElementById('battleScene') || document.body;
  }
  
  // Ensure the display is visible if we're using the turn order modal
  if (container.id === 'turnOrderDisplay') {
    container.style.display = 'block';
    container.classList.remove('fade-out');
  }

  // Remove any existing riddle display
  const existingRiddle = document.getElementById('riddleDisplay');
  if (existingRiddle) {
    existingRiddle.remove();
  }

  const riddleDisplay = document.createElement('div');
  riddleDisplay.id = 'riddleDisplay';
  riddleDisplay.style.cssText = `
    background: rgba(0, 0, 0, 0.9);
    color: #ffffff;
    padding: 30px;
    border-radius: 15px;
    text-align: center;
    border: 3px solid #ffaa00;
    box-shadow: 0 0 30px rgba(255, 170, 0, 0.4);
    width: 50%;
    margin: 0 auto 20px auto;
  `;

  // Question
  const questionDiv = document.createElement('div');
  questionDiv.style.cssText = `
    margin-bottom: 25px;
    font-size: 24px;
    font-weight: bold;
    color: #ffaa00;
    line-height: 1.4;
  `;
  questionDiv.textContent = question;

  // Options
  const optionsDiv = document.createElement('div');
  optionsDiv.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  `;

  Object.entries(options).forEach(([key, value]) => {
    const optionDiv = document.createElement('div');
    optionDiv.style.cssText = `
      background: rgba(255, 170, 0, 0.2);
      border: 2px solid #ffaa00;
      padding: 15px 20px;
      border-radius: 10px;
      font-size: 20px;
      font-weight: 500;
      text-align: left;
    `;
    optionDiv.textContent = `${key}: ${value}`;
    optionsDiv.appendChild(optionDiv);
  });

  riddleDisplay.appendChild(questionDiv);
  riddleDisplay.appendChild(optionsDiv);
  
  // Insert riddle display as the first child (above turn order)
  container.insertBefore(riddleDisplay, container.firstChild);

  // Do not auto-remove; it's cleared when encounter ends (e.g., victory banner)
}

// Function to show custom combat messages (for puzzle feedback)
function showCustomCombatMessage(text, color = '#ffffff') {
  console.log(`[DEBUG] showCustomCombatMessage called with text: "${text}", color: "${color}"`);
  
  // Try multiple possible containers
  let container = document.getElementById('turnIndicator');
  if (!container) {
    container = document.getElementById('battleScene');
  }
  if (!container) {
    container = document.getElementById('spritesContainer');
  }
  if (!container) {
    container = document.body; // Fallback to body
  }
  
  console.log(`[DEBUG] Using container:`, container);
  if (!container) {
    console.error('[DEBUG] No suitable container found!');
    return;
  }
  
  // Create custom message element
  const customMessage = document.createElement('div');
  customMessage.className = 'custom-combat-message';
  customMessage.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.9);
    color: ${color};
    padding: 15px 25px;
    border-radius: 10px;
    font-size: 18px;
    font-weight: bold;
    text-align: center;
    z-index: 10000;
    border: 2px solid ${color};
    box-shadow: 0 0 20px ${color}40;
    animation: customMessageFade 3s ease-in-out forwards;
    pointer-events: none;
  `;
  customMessage.textContent = text;
  
  console.log(`[DEBUG] Created custom message element:`, customMessage);
  
  // Add to container
  container.appendChild(customMessage);
  
  console.log(`[DEBUG] Added custom message to container. Children count:`, container.children.length);
  
  // Remove after animation
  setTimeout(() => {
    if (customMessage.parentNode) {
      customMessage.parentNode.removeChild(customMessage);
    }
  }, 3000);
}

// Listen for skill learning complete
socket.on('skillLearningComplete', () => {
  console.log('[SKILL LEARNING] Skill learning complete, removing overlay');
  hideSkillLearningScene();
});

socket.on('talentLearningComplete', () => {
  console.log('[TALENT LEARNING] Talent learning complete, removing overlay');
  hideTalentLearningScene();
});

socket.on('animateAction', (data) => {
  console.log('Animate action:', data);
  playActionAnimation(data);
});

socket.on('animateCharging', (data) => {
  console.log('Animate charging:', data);
  playChargingAnimation(data);
});

// ========== CLASS SELECTION ==========

function showClassSelection(data) {
  classSelection.style.display = 'flex';
  battleScene.style.display = 'none';
  
  classGrid.innerHTML = '';
  
  const allClasses = ['knight', 'wizard', 'cleric', 'rogue', 'druid', 'warlock', 'monk'];
  const classData = {
    knight: { name: 'Knight', hp: 120, def: 15 },
    wizard: { name: 'Wizard', hp: 80, def: 5 },
    cleric: { name: 'Cleric', hp: 100, def: 10 },
    rogue: { name: 'Rogue', hp: 90, def: 12 },
    monk: { name: 'Monk', hp: 100, def: 8 },
    druid: { name: 'Druid', hp: 105, def: 11 },
    warlock: { name: 'Warlock', hp: 95, def: 6 },
  };
  
  allClasses.forEach(className => {
    const info = classData[className];
    const player = data.players?.find(p => p.class === className);
    
    const card = document.createElement('div');
    card.className = `class-card ${player ? 'selected' : ''}`;
    card.innerHTML = `
      <div class="class-icon">${CLASS_ICONS[className]}</div>
      <div class="class-name">${info.name}</div>
      <div class="class-stats">❤️ ${info.hp} HP • 🛡️ ${info.def} DEF</div>
      ${player ? `<div class="player-name">${player.username}</div>` : '<div style="opacity:0.5; margin-top:15px;">Waiting...</div>'}
    `;
    classGrid.appendChild(card);
  });
}

// ========== BATTLE SCENE ==========

function showPickAPathScene(data) {
  console.log('[PICK_A_PATH] Showing Pick a Path scene:', data);
  const classSelection = document.getElementById('classSelection');
  const battleScene = document.getElementById('battleScene');
  const pickAPathScene = document.getElementById('pickAPathScene');
  
  classSelection.style.display = 'none';
  battleScene.style.display = 'none';
  pickAPathScene.style.display = 'flex';
  
  // Update path descriptions
  document.getElementById('leftPathDesc').textContent = data.leftDescription || 'Unknown path...';
  document.getElementById('rightPathDesc').textContent = data.rightDescription || 'Unknown path...';
  
  // Reset votes
  document.getElementById('leftVotes').textContent = '0';
  document.getElementById('rightVotes').textContent = '0';
}

function updatePathVotes(data) {
  const votes = data.votes || {};
  let leftVotes = 0;
  let rightVotes = 0;
  
  Object.values(votes).forEach(vote => {
    if (vote === 'left') leftVotes++;
    else if (vote === 'right') rightVotes++;
  });
  
  document.getElementById('leftVotes').textContent = leftVotes;
  document.getElementById('rightVotes').textContent = rightVotes;
}

function initializeBattleScene(data) {
  const classSelection = document.getElementById('classSelection');
  const battleScene = document.getElementById('battleScene');
  const pickAPathScene = document.getElementById('pickAPathScene');
  
  classSelection.style.display = 'none';
  battleScene.style.display = 'block';
  pickAPathScene.style.display = 'none';
  gameState.phase = 'combat';
  
  // Set random combat background
  setRandomCombatBackground();
  
  // Play combat music
  playMusic('combat');
  
  // Update round info with puzzle max rounds if applicable
  if (data.encounterType === 'puzzle' && data.puzzleMaxRounds) {
    roundInfo.textContent = `Round ${data.round || 1}/${data.puzzleMaxRounds}`;
  } else {
    roundInfo.textContent = `Round ${data.round || 1}`;
  }
  
  // Clear previous sprites
  spritesContainer.innerHTML = '';
  gameState.sprites = {};
  
  // Create player sprites
  if (data.players) {
    data.players.forEach((player, index) => {
      const sprite = createSprite(player, 'player', index);
      gameState.sprites[player.id] = sprite;
      gameState.sprites[`username_${player.username}`] = sprite; // Also store by username for reconnection
    });
  }
  
  // Create enemy sprites
  if (data.enemies) {
    data.enemies.forEach((enemy, index) => {
      const sprite = createSprite(enemy, 'enemy', index);
      gameState.sprites[enemy.id] = sprite;
    });
  }
  
  // Store current state
  gameState.players = data.players || [];
  gameState.enemies = data.enemies || [];
  
  // Log initial combat message (no popup needed)
  if (data.message) {
    console.log('Combat message:', data.message);
  }
}

function updateBattleScene(data) {
  // Update round info with puzzle max rounds if applicable
  if (data.encounterType === 'puzzle' && data.puzzleMaxRounds) {
    roundInfo.textContent = `Round ${data.round || 1}/${data.puzzleMaxRounds}`;
  } else {
    roundInfo.textContent = `Round ${data.round || 1}`;
  }
  
  // Update all sprites
  if (data.players) {
    data.players.forEach(player => {
      // Check if player reconnected (socket ID changed)
      let sprite = document.getElementById(`sprite-${player.id}`);
      
      // If sprite doesn't exist with current ID, try to find by username (reconnection case)
      if (!sprite) {
        const spriteByUsername = gameState.sprites[`username_${player.username}`];
        if (spriteByUsername) {
          console.log(`[RECONNECTION] Updating sprite ID for ${player.username} from ${spriteByUsername.id} to sprite-${player.id}`);
          // Update the sprite's ID to match the new socket ID
          spriteByUsername.id = `sprite-${player.id}`;
          spriteByUsername.dataset.characterId = player.id;
          // Update the sprites mapping
          gameState.sprites[player.id] = spriteByUsername;
          sprite = spriteByUsername;
        }
      }
      
      updateSpriteHealth(player.id, player.health, player.maxHealth);
      updateSpriteStats(player.id, player.speed, player.defense, player.statusEffects || []);
      updateStatusEffects(player.id, player.statusEffects || []);
      
      // Handle charging sprite state
      if (sprite) {
        if (player.chargingAbility) {
          changeSpriteState(sprite, 'cast');
          sprite.classList.add('charging');
        } else {
          sprite.classList.remove('charging');
          // Only reset to idle if not currently animating an action
          if (!sprite.classList.contains('animating')) {
            changeSpriteState(sprite, 'idle');
          }
        }
      }
    });
  }
  
  if (data.enemies) {
    data.enemies.forEach(enemy => {
      let sprite = document.getElementById(`sprite-${enemy.id}`);
      
      // Create sprite if it doesn't exist (e.g., summoned enemy)
      if (!sprite && enemy.health > 0) {
        console.log(`[updateBattleScene] Creating sprite for new enemy: ${enemy.name} (${enemy.id})`);
        
        // If this is a summoned enemy, position it relative to summoner
        let summonerSprite = null;
        if (enemy.summonedBy) {
          summonerSprite = document.getElementById(`sprite-${enemy.summonedBy}`);
        }
        
        sprite = createSprite({
          id: enemy.id,
          name: enemy.name,
          health: enemy.health,
          maxHealth: enemy.maxHealth,
          speed: enemy.speed,
          defense: enemy.defense,
          sprite: enemy.sprite,  // Custom sprite name if provided
          scale: enemy.scale,    // Scale multiplier if provided
          tint: enemy.tint,      // Tint color if provided
          summonedBy: enemy.summonedBy  // Summoner ID for positioning
        }, 'enemy', null, summonerSprite);
      }
      
      // Remove dead enemies
      if (enemy.health <= 0 && sprite) {
        sprite.style.transition = 'opacity 0.5s ease-out';
        sprite.style.opacity = '0';
        setTimeout(() => {
          sprite.remove();
        }, 500);
        return;
      }
      
      updateSpriteHealth(enemy.id, enemy.health, enemy.maxHealth);
      updateSpriteStats(enemy.id, enemy.speed, enemy.defense, enemy.statusEffects || []);
      updateStatusEffects(enemy.id, enemy.statusEffects || []);
      
      // Update special ability indicator
      updateSpecialAbilityIndicator(enemy.id, enemy.specialAbilityQueued);
      
      // Reset enemy sprite to idle if not currently animating
      if (sprite && !sprite.classList.contains('animating')) {
        changeSpriteState(sprite, 'idle');
      }
    });
  }
  
  // Update stored state for next comparison
  if (data.players) {
    gameState.players = data.players;
    // Maintain username mapping for reconnections
    data.players.forEach(player => {
      const sprite = gameState.sprites[player.id];
      if (sprite) {
        gameState.sprites[`username_${player.username}`] = sprite;
      }
    });
  }
  if (data.enemies) {
    gameState.enemies = data.enemies;
  }
  
  // Combat log updates handled by individual action popups
  // (no scrollable log anymore)
}

// ========== TURN ORDER DISPLAY ==========

function showTurnOrderDisplay(turnOrder) {
  if (!turnOrder || turnOrder.length === 0) return;
  
  console.log('[Turn Order] Showing turn order display');
  
  // Clear existing content
  turnOrderList.innerHTML = '';
  
  // Build turn order list
  turnOrder.forEach((turn, index) => {
    const item = document.createElement('div');
    item.className = `turn-order-item ${turn.type}`;
    
    const leftSection = document.createElement('div');
    leftSection.className = 'turn-order-item-left';
    
    // Rank number
    const rank = document.createElement('div');
    rank.className = 'turn-order-rank';
    rank.textContent = `${index + 1}`;
    leftSection.appendChild(rank);
    
    // Name and class
    const nameSection = document.createElement('div');
    nameSection.style.display = 'flex';
    nameSection.style.alignItems = 'center';
    nameSection.style.gap = '8px';
    
    const name = document.createElement('span');
    name.className = 'turn-order-name';
    name.textContent = turn.username || turn.name;
    nameSection.appendChild(name);
    
    if (turn.type === 'player' && turn.class) {
      const classLabel = document.createElement('span');
      classLabel.className = 'turn-order-class';
      classLabel.textContent = `(${turn.class})`;
      nameSection.appendChild(classLabel);
    }
    
    leftSection.appendChild(nameSection);
    
    // Special ability badge (only for enemies with queued abilities)
    if (turn.type === 'enemy' && turn.specialAbility) {
      const specialBadge = document.createElement('div');
      specialBadge.className = 'special-ability-badge';
      specialBadge.innerHTML = `⚠️ ${turn.specialAbility}`;
      leftSection.appendChild(specialBadge);
    }
    
    item.appendChild(leftSection);
    
    // Speed on the right
    const speed = document.createElement('div');
    speed.className = 'turn-order-speed';
    speed.textContent = `${turn.speed}`;
    item.appendChild(speed);
    
    turnOrderList.appendChild(item);
  });
  
  // Show the display
  turnOrderDisplay.style.display = 'block';
  turnOrderDisplay.classList.remove('fade-out');
}

function hideTurnOrderDisplay() {
  console.log('[Turn Order] Hiding turn order display');
  
  // Fade out
  turnOrderDisplay.classList.add('fade-out');
  
  // Remove after animation
  setTimeout(() => {
    turnOrderDisplay.style.display = 'none';
  }, 500);
}

function createSprite(character, type, index, summonerSprite = null) {
  const config = SPRITE_CONFIG[type];
  const sprite = document.createElement('div');
  sprite.className = `sprite ${type}`;
  sprite.id = `sprite-${character.id}`;
  
  let x, y;
  
  // Special positioning for summoned enemies
  if (summonerSprite && character.summonedBy) {
    // Position relative to summoner
    const summonerRect = summonerSprite.getBoundingClientRect();
    const summonerX = parseFloat(summonerSprite.style.left) || summonerRect.left;
    const summonerY = parseFloat(summonerSprite.style.top) || summonerRect.top;
    
    // Position to the left of summoner (toward center)
    const offsetX = -150 - Math.random() * 300; // 150-250px left of summoner
    const offsetY = -50 + Math.random() * 100;  // Random vertical offset (-50 to +50)
    
    x = summonerX + offsetX;
    y = summonerY + offsetY;
    
    // Clamp to screen bounds (don't go too far left or off screen)
    x = Math.max(window.innerWidth * 0.4, x); // Don't go past center
    y = Math.max(50, Math.min(window.innerHeight - 250, y)); // Keep on screen
    
    console.log(`[Summon Position] Summoner at (${summonerX}, ${summonerY}), summoned at (${x}, ${y})`);
  } else {
    // Normal positioning with horizontal staggering
    const staggerX = Math.floor(index) * config.horizontalOffset;
    const staggerY = 20 * index; // Alternate slight vertical offset
    
    x = config.startX + (type == 'player' ? staggerX : -staggerX);
    y = config.startYBase - (index * config.spacing) + staggerY; // Cascade upward (subtract)
  }
  
  sprite.style.left = x + 'px';
  sprite.style.top = y + 'px';
  sprite.style.width = config.baseWidth + 'px';
  sprite.style.height = config.baseHeight + 'px';
  sprite.style.zIndex = 10 - (index || 0); // Higher index = further back (behind)
  
  // Create sprite image
  const img = document.createElement('img');
  if (type === 'player') {
    img.src = getSpriteImage(character.class, 'idle');
    img.alt = character.username;
  } else {
    // Use custom sprite name if provided, otherwise use enemy name
    const spriteName = character.sprite || character.name;
    img.src = getEnemySpriteImage(spriteName, 'idle');
    img.alt = character.name;
    
    // Apply scale if provided (using CSS variable so breathing animation respects it)
    if (character.scale) {
      img.style.setProperty('--base-scale', character.scale);
      img.style.transform = `scale(${character.scale})`;
      img.style.transformOrigin = 'center bottom';
    }
    
    // Apply tint if provided (using CSS filters to only affect the image pixels)
    if (character.tint) {
      // Convert hex color to hue rotation value
      const tintColor = character.tint;
      
      // Apply a color filter that only affects the image pixels, not the transparent areas
      // Using drop-shadow with the tint color and brightness adjustment
      img.style.filter = `
        brightness(0.8) 
        sepia(1) 
        saturate(2) 
        hue-rotate(${getHueRotationFromColor(tintColor)}deg)
      `.trim().replace(/\s+/g, ' ');
    }
  }
  img.onerror = () => {
    // Mark as emoji fallback
    img.dataset.isEmoji = 'true';
    sprite.innerHTML = type === 'player' ? '🛡️' : '👹';
    sprite.style.fontSize = '64px';
  };
  sprite.appendChild(img);
  
  // Add idle class for breathing animation
  sprite.classList.add('idle');
  
  // Health bar
  const healthBar = createHealthBar(character.health, character.maxHealth);
  sprite.appendChild(healthBar);
  
  // Status effects display (above health bar)
  const statusEffects = document.createElement('div');
  statusEffects.className = 'status-effects';
  statusEffects.id = `status-${character.id}`;
  sprite.appendChild(statusEffects);
  updateStatusEffects(character.id, character.statusEffects || []);
  
  // Name tag (no container)
  const nameTag = document.createElement('div');
  nameTag.className = 'name-tag';
  nameTag.textContent = type === 'player' ? character.username : character.name;
  sprite.appendChild(nameTag);
  
  // Stats badge (next to name, no container)
  const stats = document.createElement('div');
  stats.className = 'stats-badge';
  stats.id = `stats-${character.id}`;
  stats.textContent = `🛡️${character.defense || 0}`;
  sprite.appendChild(stats);

  // Add resistance icons for enemies
  if (type === 'enemy' && character.resistances && character.resistances.length > 0) {
    character.resistances.forEach((resistance, index) => {
      const resistanceIcon = document.createElement('div');
      resistanceIcon.className = 'resistance-icon';
      resistanceIcon.style.right = `${-10 + (index * 25)}px`;
      resistanceIcon.textContent = resistance === 'physical' ? '🛡️' : resistance === 'magic' ? '✨' : '❓';
      resistanceIcon.title = `Resistant to ${resistance} damage`;
      sprite.appendChild(resistanceIcon);
    });
  }
  
  // Add special ability indicator for enemies
  if (type === 'enemy') {
    const specialIndicator = document.createElement('div');
    specialIndicator.className = 'special-ability-indicator';
    specialIndicator.id = `special-${character.id}`;
    specialIndicator.style.display = 'none';
    sprite.appendChild(specialIndicator);
  }

  spritesContainer.appendChild(sprite);
  
  // Store original position
  sprite.dataset.originalX = x;
  sprite.dataset.originalY = y;
  sprite.dataset.type = type;
  sprite.dataset.characterId = character.id;
  
  return sprite;
}

function createHealthBar(current, max) {
  const container = document.createElement('div');
  container.className = 'health-bar-container';
  
  const percentage = (current / max) * 100;
  let healthClass = '';
  if (percentage <= 30) healthClass = 'critical';
  else if (percentage <= 60) healthClass = 'low';
  
  container.innerHTML = `
    <div class="health-bar ${healthClass}" style="width: ${percentage}%">
      <div class="health-text">${current}/${max}</div>
    </div>
  `;
  
  return container;
}

function updateSpriteHealth(spriteId, health, maxHealth) {
  const sprite = document.getElementById(`sprite-${spriteId}`);
  if (!sprite) return;
  
  const healthBar = sprite.querySelector('.health-bar');
  const healthText = sprite.querySelector('.health-text');
  
  if (healthBar && healthText) {
    const percentage = (health / maxHealth) * 100;
    healthBar.style.width = percentage + '%';
    healthText.textContent = `${health}/${maxHealth}`;
    
    // Update color
    healthBar.className = 'health-bar';
    if (percentage <= 30) healthBar.classList.add('critical');
    else if (percentage <= 60) healthBar.classList.add('low');
  }
}

function updateSpriteStats(spriteId, speed, defense, statusEffects = []) {
  const statsBadge = document.getElementById(`stats-${spriteId}`);
  if (statsBadge) {
    // Calculate effective defense (base + status effect modifiers)
    let effectiveDefense = defense || 0;
    
    if (statusEffects && statusEffects.length > 0) {
      statusEffects.forEach(effect => {
        // Add defense buff
        if (effect.effectId === 'defense') {
          effectiveDefense += effect.points || 0;
        }
        // Subtract sunder
        if (effect.effectId === 'sunder') {
          effectiveDefense -= effect.points || 0;
        }
      });
    }
    
    statsBadge.textContent = `🛡️${effectiveDefense}`;
    
    // Change color to yellow if defense is negative
    if (effectiveDefense < 0) {
      statsBadge.style.color = '#fbbf24'; // Yellow
    } else {
      statsBadge.style.color = '#ffffff'; // White
    }
  }
}

function updateStatusEffects(spriteId, effects) {
  const statusContainer = document.getElementById(`status-${spriteId}`);
  if (!statusContainer) return;
  
  statusContainer.innerHTML = '';
  
  if (!effects || effects.length === 0) return;
  
  effects.forEach(effect => {
    const effectIcon = document.createElement('div');
    effectIcon.className = 'status-effect-icon';
    effectIcon.style.borderColor = effect.color || '#ffffff';
    
    // Show icon
    const icon = document.createElement('span');
    icon.textContent = effect.icon || '?';
    effectIcon.appendChild(icon);
    
    // Show duration if > 1
    if (effect.duration > 1) {
      const duration = document.createElement('span');
      duration.className = 'status-duration';
      duration.textContent = effect.duration;
      effectIcon.appendChild(duration);
    }
    
    // Add tooltip
    effectIcon.title = `${effect.name}: ${effect.description}`;
    
    statusContainer.appendChild(effectIcon);
  });
}

function updateSpecialAbilityIndicator(enemyId, abilityName) {
  const indicator = document.getElementById(`special-${enemyId}`);
  if (!indicator) return;
  
  if (abilityName) {
    indicator.textContent = '⚠️';
    indicator.title = `Will use: ${abilityName}`;
    indicator.style.display = 'block';
  } else {
    indicator.style.display = 'none';
  }
}

// ========== SPRITE IMAGES ==========

function getSpriteImage(className, state) {
  // state: idle, attack, cast, hurt
  // Fallback to placeholders if images don't exist
  const basePath = `/games/rpg/assets/sprites/${className}`;
  return `${basePath}_${state}.png`;
}

function getEnemySpriteImage(enemyName, state) {
  const enemyId = enemyName.toLowerCase().replace(/\s+/g, '_');
  const basePath = `/games/rpg/assets/sprites/enemies/${enemyId}`;
  return `${basePath}_${state}.png`;
}

function getProjectileImage(actionId, spriteOverride) {
  const spriteName = spriteOverride || actionId;
  return `/games/rpg/assets/effects/projectile_${spriteName}.png`;
}

function getEffectImage(actionId, spriteOverride) {
  const spriteName = spriteOverride || actionId;
  return `/games/rpg/assets/effects/effect_${spriteName}.gif`;
}

// Apply tint to an image element using CSS filters
// fullRecolor: if true, applies aggressive recoloring for monochromatic images (like action effects)
function applyTintToImage(imgElement, tintColor, fullRecolor = false) {
  if (!tintColor) return;
  
  if (fullRecolor) {
    // Aggressive recoloring for monochromatic action effects
    // This uses blend mode trick: make bright, desaturate, then colorize
    // Works for both black and white source images
    imgElement.style.filter = `
      brightness(5)
      grayscale(1)
      sepia(1) 
      saturate(500) 
      hue-rotate(${getHueRotationFromColor(tintColor)}deg)
      brightness(0.7)
      contrast(1.5)
    `.trim().replace(/\s+/g, ' ');
    
    // Add a color overlay using mix-blend-mode for even stronger recoloring
    imgElement.style.mixBlendMode = 'screen';
  } else {
    // Subtle tinting for colored sprites (like enemies)
    imgElement.style.filter = `
      brightness(0.8) 
      sepia(1) 
      saturate(2) 
      hue-rotate(${getHueRotationFromColor(tintColor)}deg)
    `.trim().replace(/\s+/g, ' ');
  }
}

// ========== ANIMATIONS ==========

async function playSummonAnimation(actorSprite, summonedEnemy, sound, animTime) {
  console.log('[SUMMON] Playing summon animation:', summonedEnemy);
  
  gameState.animating = true;
  
  // Actor goes to cast pose
  actorSprite.classList.add('animating');
  changeSpriteState(actorSprite, 'cast');
  
  // Show summoning effect at actor
  const summonEffect = document.createElement('div');
  summonEffect.className = 'effect-overlay';
  summonEffect.style.opacity = '1';
  
  const effectImg = document.createElement('img');
  effectImg.src = '/games/rpg/assets/effects/effect_summon_skeleton.gif';
  effectImg.onerror = () => {
    effectImg.textContent = '💀';
    effectImg.style.fontSize = '80px';
  };
  summonEffect.appendChild(effectImg);
  
  const actorRect = actorSprite.getBoundingClientRect();
  summonEffect.style.position = 'absolute';
  summonEffect.style.left = (actorRect.left - actorRect.width / 4) + 'px';
  summonEffect.style.top = (actorRect.top - actorRect.height / 4) + 'px';
  summonEffect.style.width = (actorRect.width * 1.5) + 'px';
  summonEffect.style.height = (actorRect.height * 1.5) + 'px';
  summonEffect.style.zIndex = '100';
  summonEffect.style.transition = 'opacity 0.3s';
  
  spritesContainer.appendChild(summonEffect);
  
  await sleep(50);
  summonEffect.classList.add('show');
  
  // Wait for effect
  await sleep(animTime || 1500);
  
  // Fade out effect
  summonEffect.style.opacity = '0';
  await sleep(300);
  summonEffect.remove();
  
  // Return actor to idle
  changeSpriteState(actorSprite, 'idle');
  actorSprite.classList.remove('animating');
  
  // Add summoned enemy to gameState so it appears on next update
  if (!gameState.enemies) {
    gameState.enemies = [];
  }
  gameState.enemies.push({
    id: summonedEnemy.id,
    name: summonedEnemy.name,
    health: summonedEnemy.health,
    maxHealth: summonedEnemy.maxHealth
  });
  
  console.log('[SUMMON] Added summoned enemy to gameState:', summonedEnemy.name);
  
  gameState.animating = false;
}

async function playChargingAnimation(data) {
  const { actorId, action, actionId } = data;
  
  gameState.animating = true;
  
  const actorSprite = document.getElementById(`sprite-${actorId}`);
  
  if (!actorSprite) {
    gameState.animating = false;
    return;
  }
  
  // Disable breathing animation during charging
  actorSprite.classList.add('animating');
  
  // Change to cast sprite for charging
  changeSpriteState(actorSprite, 'cast');
  
  // Add a charging glow effect
  actorSprite.classList.add('charging');
  
  // Get actor name
  const isHero = actorSprite.dataset.type === 'player';
  let actorName = '';
  if (isHero) {
    const playerData = gameState.players.find(p => p.id === actorId);
    actorName = playerData ? playerData.username : 'Player';
  }
  
  // Show charging popup
  showActionPopup(actorName, `Charging ${action}...`, isHero);
  
  // Create charging indicator visual effect
  const chargingEffect = document.createElement('div');
  chargingEffect.className = 'charging-effect';
  chargingEffect.style.position = 'absolute';
  chargingEffect.style.fontSize = '60px';
  chargingEffect.style.opacity = '0';
  chargingEffect.style.transition = 'opacity 0.3s';
  chargingEffect.textContent = '⚡';
  
  const actorRect = actorSprite.getBoundingClientRect();
  chargingEffect.style.left = (actorRect.left + actorRect.width / 2 - 30) + 'px';
  chargingEffect.style.top = (actorRect.top - 40) + 'px';
  chargingEffect.style.zIndex = '1000';
  chargingEffect.style.filter = 'drop-shadow(0 0 10px yellow)';
  chargingEffect.style.animation = 'pulse 0.5s infinite alternate';
  
  spritesContainer.appendChild(chargingEffect);
  
  // Fade in
  setTimeout(() => {
    chargingEffect.style.opacity = '1';
  }, 50);
  
  // Wait for charging display
  await sleep(1200);
  
  // Fade out and remove
  chargingEffect.style.opacity = '0';
  await sleep(300);
  chargingEffect.remove();
  
  // Remove charging glow
  actorSprite.classList.remove('charging');
  
  // Return to idle
  changeSpriteState(actorSprite, 'idle');
  actorSprite.classList.remove('animating');
  
  gameState.animating = false;
}

async function playActionAnimation(animData) {
  const { actorId, targetId, action, actionId, hit, crit, damage, heal, sound, animTime, animType, sprite, tint } = animData;
  
  gameState.animating = true;

  if(animData.type){
    if(animData.type === 'popup'){
      showGenericPopup(animData.action, animData.text || animData.message || '', animData.color || '#ffffff');
    }
  } 
  
  // Play sound effect - use miss sound if attack missed, otherwise use action sound
  if (!hit && sound) {
    playSoundEffect('miss');
  } else if (sound) {
    playSoundEffect(sound);
  }
  
  const actorSprite = document.getElementById(`sprite-${actorId}`);
  
  // Handle summon animation
  if (targetId === 'summon' && animData.summonedEnemy) {
    await playSummonAnimation(actorSprite, animData.summonedEnemy, sound, animTime);
    gameState.animating = false;
    return;
  }
  
  // Handle multi-target vs single-target
  let targetSprite = null;
  let targetSprites = [];
  let isMultiTarget = false;
  
  if (targetId === 'all_enemies' || targetId === 'all_players') {
    // Multi-target action
    isMultiTarget = true;
    if (targetId === 'all_enemies') {
      targetSprites = gameState.enemies
        .filter(e => e.health > 0)
        .map(e => document.getElementById(`sprite-${e.id}`))
        .filter(s => s !== null);
    } else if (targetId === 'all_players') {
      targetSprites = gameState.players
        .filter(p => p.health > 0)
        .map(p => document.getElementById(`sprite-${p.id}`))
        .filter(s => s !== null);
    }
  } else if (targetId) {
    // Single target
    targetSprite = document.getElementById(`sprite-${targetId}`);
  }
  
  if (!actorSprite) {
    gameState.animating = false;
    return;
  }
  
  // Determine if actor is hero or enemy
  const isHero = actorSprite.dataset.type === 'player';
  
  // Get actor name
  let actorName = '';
  if (isHero) {
    const playerData = gameState.players.find(p => p.id === actorId);
    actorName = playerData ? playerData.username : 'Player';
  } else {
    const enemyData = gameState.enemies.find(e => e.id === actorId);
    actorName = enemyData ? enemyData.name : 'Enemy';
  }
  
  // Show action popup
  showActionPopup(actorName, action, isHero);
  
  // Use animTime from action or default to 1500ms
  const effectDuration = animTime || 1500;
  
  // Use animType from server data (defaults to 'support' if not provided for backwards compatibility)
  const animationType = animType || 'support';
  
  // Play animation based on type
  if (isMultiTarget) {
    // Multi-target animations
    if (animationType === 'spell' || animationType === 'support') {
      await playMultiTargetAnimation(actorSprite, targetSprites, actionId, hit, crit, damage, heal, effectDuration, animationType, sprite, tint);
    } else {
      // Fallback for multi-target melee/projectile (shouldn't happen often)
      await playMultiTargetAnimation(actorSprite, targetSprites, actionId, hit, crit, damage, heal, effectDuration, 'spell', sprite, tint);
    }
  } else {
    // Single target animations
    switch (animationType) {
      case 'melee':
        await playMeleeAnimation(actorSprite, targetSprite, hit, crit, damage, targetId);
        break;
      case 'projectile':
        await playProjectileAnimation(actorSprite, targetSprite, actionId, hit, crit, damage, targetId, sprite, tint);
        break;
      case 'spell':
        await playSpellAnimation(actorSprite, targetSprite, actionId, hit, crit, damage, targetId, effectDuration, sprite, tint, heal);
        break;
      case 'support':
        await playSupportAnimation(actorSprite, targetSprite, actionId, heal, targetId, effectDuration, sprite, tint);
        break;
    }
  }
  
  gameState.animating = false;
}

// Melee attack: Move toward target and back
async function playMeleeAnimation(actorSprite, targetSprite, hit, crit, damage, targetId) {
  if (!targetSprite) return;
  
  // Disable breathing animation during combat
  actorSprite.classList.add('animating');
  
  // Change to attack sprite FIRST
  changeSpriteState(actorSprite, 'attack');
  
  // Wait briefly to ensure attack sprite is visible before sliding
  await sleep(200);
  
  // Get positions
  const actorRect = actorSprite.getBoundingClientRect();
  const targetRect = targetSprite.getBoundingClientRect();
  
  // Calculate midpoint
  const deltaX = (targetRect.left - actorRect.left) * 0.6;
  const deltaY = (targetRect.top - actorRect.top) * 0.6;
  
  // Add smooth transition for the slide
  actorSprite.style.transition = 'transform 0.3s ease-out';
  
  // Move toward target
  actorSprite.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
  
  await sleep(300);
  
  // Show floating text at impact
  if (targetId) {
    if (!hit) {
      showMissText(targetId);
    } else if (damage > 0) {
      showDamageText(targetId, damage, crit);
      
      // Always shake target when damage is dealt
      if (targetSprite) {
        shakeSpriteOnDamage(targetSprite);
      }
    }
  }
  
  // Return to original position with transition
  actorSprite.style.transition = 'transform 0.2s ease-in';
  actorSprite.style.transform = 'translate(0, 0)';
  
  await sleep(200);
  
  // Clean up transition style
  actorSprite.style.transition = '';
  
  // Re-enable breathing animation and back to idle
  actorSprite.classList.remove('animating');
  changeSpriteState(actorSprite, 'idle');
}

// Projectile attack: Show projectile flying
async function playProjectileAnimation(actorSprite, targetSprite, actionId, hit, crit, damage, targetId, spriteOverride, tint) {
  if (!targetSprite) return;
  
  // Disable breathing animation during combat
  actorSprite.classList.add('animating');
  
  // Change to attack sprite
  changeSpriteState(actorSprite, 'attack');
  
  await sleep(200);
  
  // Create projectile
  const projectile = document.createElement('div');
  projectile.className = 'projectile';
  
  const projectileImg = document.createElement('img');
  projectileImg.src = getProjectileImage(actionId, spriteOverride);
  projectileImg.onerror = () => {
    // Fallback to generic projectile
    projectileImg.textContent = '➤';
    projectileImg.style.fontSize = '40px';
  };
  
  // Apply tint if specified (full recolor for action effects)
  applyTintToImage(projectileImg, tint, true);
  
  projectile.appendChild(projectileImg);
  
  // Position at actor
  const actorRect = actorSprite.getBoundingClientRect();
  projectile.style.left = (actorRect.left + actorRect.width / 2) + 'px';
  projectile.style.top = (actorRect.top + actorRect.height / 2) + 'px';
  
  spritesContainer.appendChild(projectile);
  
  // Animate to target
  const targetRect = targetSprite.getBoundingClientRect();
  
  await sleep(50);
  
  projectile.style.transition = 'all 0.8s linear';
  projectile.style.left = (targetRect.left + targetRect.width / 2) + 'px';
  projectile.style.top = (targetRect.top + targetRect.height / 2) + 'px';
  
  await sleep(800);
  
  // Show floating text on impact
  if (targetId) {
    if (!hit) {
      showMissText(targetId);
    } else if (damage > 0) {
      showDamageText(targetId, damage, crit);
      
      // Always shake target when damage is dealt
      if (targetSprite) {
        shakeSpriteOnDamage(targetSprite);
      }
    }
  }
  
  // Remove projectile
  projectile.remove();
  
  // Re-enable breathing animation and back to idle
  actorSprite.classList.remove('animating');
  changeSpriteState(actorSprite, 'idle');
}

// Spell attack: Casting animation + effect overlay
async function playSpellAnimation(actorSprite, targetSprite, actionId, hit, crit, damage, targetId, effectDuration = 1500, spriteOverride, tint, heal = 0) {
  // Disable breathing animation during combat
  actorSprite.classList.add('animating');
  
  // Change to cast sprite
  changeSpriteState(actorSprite, 'cast');
  
  await sleep(500);
  
  if (targetSprite) {
    // Show effect over target
    const effect = document.createElement('div');
    effect.className = 'effect-overlay';
    
    const effectImg = document.createElement('img');
    effectImg.src = getEffectImage(actionId, spriteOverride);
    effectImg.onerror = () => {
      // Fallback to emoji effect
      effectImg.textContent = '💥';
      effectImg.style.fontSize = '80px';
    };
    
    // Apply tint if specified (full recolor for action effects)
    applyTintToImage(effectImg, tint, true);
    
    effect.appendChild(effectImg);
    
    // Position at target (bottom-aligned)
    const targetRect = targetSprite.getBoundingClientRect();
    const effectWidth = targetRect.width * 1.5;
    const effectHeight = targetRect.height * 1.5;
    
    // Center horizontally, align bottom
    effect.style.left = (targetRect.left - (effectWidth - targetRect.width) / 2) + 'px';
    effect.style.top = (targetRect.bottom - effectHeight) + 'px';
    effect.style.width = effectWidth + 'px';
    effect.style.height = effectHeight + 'px';
    
    spritesContainer.appendChild(effect);
    
    // Fade in
    await sleep(50);
    effect.classList.add('show');
    
    // Show floating text when effect appears
    if (targetId) {
      if (!hit) {
        showMissText(targetId);
      } else if (damage > 0) {
        showDamageText(targetId, damage, crit);
        
        // Always shake target when damage is dealt
        if (targetSprite) {
          shakeSpriteOnDamage(targetSprite);
        }
      }
    }
    
    // Show heal text if healing
    if (targetId && heal > 0) {
      showHealText(targetId, heal);
    }
    
    // Show effect for the specified duration
    await sleep(effectDuration);
    effect.style.opacity = '0';
    
    await sleep(500);
    effect.remove();
  } else {
    await sleep(effectDuration);
  }
  
  // Re-enable breathing animation and back to idle
  actorSprite.classList.remove('animating');
  changeSpriteState(actorSprite, 'idle');
}

// Support animation: Brief glow effect
async function playSupportAnimation(actorSprite, targetSprite, actionId, heal, targetId, effectDuration = 1500, spriteOverride, tint) {
  // Disable breathing animation during combat
  actorSprite.classList.add('animating');
  
  // Change to cast sprite
  changeSpriteState(actorSprite, 'cast');
  
  await sleep(500);
  
  if (targetSprite) {
    // Show healing/buff effect
    const effect = document.createElement('div');
    effect.className = 'effect-overlay';
    effect.style.opacity = '1';
    
    const effectImg = document.createElement('img');
    effectImg.src = getEffectImage(actionId, spriteOverride);
    effectImg.onerror = () => {
      effectImg.textContent = '✨';
      effectImg.style.fontSize = '80px';
    };
    
    // Apply tint if specified (full recolor for action effects)
    applyTintToImage(effectImg, tint, true);
    
    effect.appendChild(effectImg);
    
    // Position at target (bottom-aligned)
    const targetRect = targetSprite.getBoundingClientRect();
    const effectWidth = targetRect.width * 1.5;
    const effectHeight = targetRect.height * 1.5;
    
    // Center horizontally, align bottom
    effect.style.left = (targetRect.left - (effectWidth - targetRect.width) / 2) + 'px';
    effect.style.top = (targetRect.bottom - effectHeight) + 'px';
    effect.style.width = effectWidth + 'px';
    effect.style.height = effectHeight + 'px';
    
    spritesContainer.appendChild(effect);
    
    await sleep(50);
    effect.classList.add('show');
    
    // Show floating heal text
    if (targetId && heal > 0) {
      showHealText(targetId, heal);
    }
    
    // Show effect for the specified duration
    await sleep(effectDuration);
    effect.style.opacity = '0';
    
    await sleep(500);
    effect.remove();
  } else {
    await sleep(effectDuration);
  }
  
  // Re-enable breathing animation and back to idle
  actorSprite.classList.remove('animating');
  changeSpriteState(actorSprite, 'idle');
}

// Multi-target animation: Show effect on all targets
async function playMultiTargetAnimation(actorSprite, targetSprites, actionId, hit, crit, damage, heal, effectDuration, animType, spriteOverride, tint) {
  // Disable breathing animation during combat
  actorSprite.classList.add('animating');
  
  // Change to cast sprite
  changeSpriteState(actorSprite, 'cast');
  
  await sleep(500);
  
  if (targetSprites.length > 0) {
    // Show effect on all targets simultaneously
    const effects = [];
    
    targetSprites.forEach(targetSprite => {
      const effect = document.createElement('div');
      effect.className = 'effect-overlay';
      effect.style.opacity = '1';
      
      const effectImg = document.createElement('img');
      effectImg.src = getEffectImage(actionId, spriteOverride);
      effectImg.onerror = () => {
        effectImg.textContent = animType === 'support' ? '✨' : '💥';
        effectImg.style.fontSize = '80px';
      };
      
      // Apply tint if specified (full recolor for action effects)
      applyTintToImage(effectImg, tint, true);
      
      effect.appendChild(effectImg);
      
      // Position at target (bottom-aligned)
      const targetRect = targetSprite.getBoundingClientRect();
      const effectWidth = targetRect.width * 1.5;
      const effectHeight = targetRect.height * 1.5;
      
      // Center horizontally, align bottom
      effect.style.left = (targetRect.left - (effectWidth - targetRect.width) / 2) + 'px';
      effect.style.top = (targetRect.bottom - effectHeight) + 'px';
      effect.style.width = effectWidth + 'px';
      effect.style.height = effectHeight + 'px';
      
      spritesContainer.appendChild(effect);
      effects.push(effect);
      
      // Show floating text for each target
      const targetId = targetSprite.id.replace('sprite-', '');
      
      if (animType === 'spell' && damage > 0) {
        // Damage spell
        showDamageText(targetId, damage, crit);
        if (targetSprite) {
          shakeSpriteOnDamage(targetSprite);
        }
      } else if (animType === 'support' && heal > 0) {
        // Healing spell
        showHealText(targetId, heal);
      }
    });
    
    // Fade in all effects
    await sleep(50);
    effects.forEach(effect => effect.classList.add('show'));
    
    // Show effects for the specified duration
    await sleep(effectDuration);
    
    // Fade out all effects
    effects.forEach(effect => effect.style.opacity = '0');
    
    await sleep(500);
    effects.forEach(effect => effect.remove());
  } else {
    await sleep(effectDuration);
  }
  
  // Re-enable breathing animation and back to idle
  actorSprite.classList.remove('animating');
  changeSpriteState(actorSprite, 'idle');
}

function changeSpriteState(sprite, state) {
  const img = sprite.querySelector('img');
  if (!img) return;
  
  // Check if this is an emoji fallback
  if (img.dataset.isEmoji === 'true' || !img.src.includes('.png')) {
    console.log('Sprite is emoji fallback, skipping state change');
    return;
  }
  
  const currentSrc = img.src;
  
  // Replace state in URL
  const newSrc = currentSrc.replace(/_idle\.png|_attack\.png|_cast\.png|_hurt\.png/, `_${state}.png`);
  
  console.log('Changing sprite state:', { 
    from: currentSrc.split('/').pop(), 
    to: newSrc.split('/').pop(),
    state: state
  });
  
  // Only update if different
  if (newSrc !== currentSrc) {
    img.src = newSrc;
  }
}

function shakeSpriteOnDamage(sprite) {
  if (!sprite) return;
  
  console.log('Shaking sprite:', sprite.id);
  
  // Determine if this is a player or enemy sprite
  const isPlayer = sprite.dataset.type === 'player';
  
  // Show impact GIF animation
  showImpactAnimation(sprite, isPlayer);
  
  // Disable sprite state changes during hurt animation
  sprite.classList.add('animating');
  
  // Change to hurt sprite briefly
  changeSpriteState(sprite, 'hurt');
  
  // Add shake animation
  sprite.classList.add('damage');
  
  setTimeout(() => {
    sprite.classList.remove('damage');
    sprite.classList.remove('animating');
    changeSpriteState(sprite, 'idle');
  }, 500);
}

function showImpactAnimation(sprite, isPlayer) {
  if (!sprite) return;
  
  // Create impact overlay
  const impact = document.createElement('div');
  impact.className = 'impact-overlay';
  
  const impactGif = document.createElement('img');
  // Use appropriate GIF based on sprite type
  impactGif.src = isPlayer 
    ? '/games/rpg/assets/effects/impact_right.gif'
    : '/games/rpg/assets/effects/impact_left.gif';
  
  // Fallback if GIF doesn't exist
  impactGif.onerror = () => {
    impact.remove();
  };
  
  impact.appendChild(impactGif);
  
  // Position over sprite center
  const rect = sprite.getBoundingClientRect();
  impact.style.left = (rect.left + rect.width / 2 - 100) + 'px';
  impact.style.top = (rect.top + rect.height / 2 - 100) + 'px';
  
  spritesContainer.appendChild(impact);
  
  // Remove after GIF completes (assume ~0.8s for impact animation)
  // You can adjust this timing based on your actual GIF duration
  setTimeout(() => {
    impact.remove();
  }, 800);
}

// ========== VICTORY BANNER ==========

function showVictoryBanner(message) {
  // Clear riddle display when combat ends
  const riddleDisplay = document.getElementById('riddleDisplay');
  if (riddleDisplay) {
    riddleDisplay.remove();
  }
  
  // Play victory sound
  const victorySound = new Audio('/games/rpg/assets/victory.mp3');
  victorySound.volume = 0.5;
  victorySound.play().catch(err => {
    console.warn('Victory sound: Could not play:', err.message);
  });
  
  // Create victory banner overlay
  const banner = document.createElement('div');
  banner.id = 'victoryBanner';
  banner.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0.5);
    background: linear-gradient(135deg, #ffd700, #ffed4e);
    color: #1a1a1a;
    padding: 60px 100px;
    border-radius: 30px;
    font-size: 5em;
    font-weight: bold;
    text-align: center;
    z-index: 2000;
    box-shadow: 0 20px 60px rgba(255, 215, 0, 0.6);
    border: 8px solid #fff;
    opacity: 0;
    animation: victoryPopIn 0.5s ease-out forwards;
  `;
  banner.textContent = 'VICTORY!';
  
  // Add animation styles
  const style = document.createElement('style');
  style.textContent = `
    @keyframes victoryPopIn {
      0% {
        transform: translate(-50%, -50%) scale(0.5);
        opacity: 0;
      }
      50% {
        transform: translate(-50%, -50%) scale(1.1);
        opacity: 1;
      }
      100% {
        transform: translate(-50%, -50%) scale(1);
        opacity: 1;
      }
    }
    @keyframes victoryPopOut {
      0% {
        transform: translate(-50%, -50%) scale(1);
        opacity: 1;
      }
      100% {
        transform: translate(-50%, -50%) scale(1.2);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(banner);
  
  // Remove after 3 seconds with fade out
  setTimeout(() => {
    banner.style.animation = 'victoryPopOut 0.5s ease-in forwards';
    setTimeout(() => {
      banner.remove();
      style.remove();
    }, 500);
  }, 2500);
}

// ========== DEFEAT BANNER ==========

function showDefeatBanner(message) {
  // Clear riddle display when combat ends
  const riddleDisplay = document.getElementById('riddleDisplay');
  if (riddleDisplay) {
    riddleDisplay.remove();
  }
  
  // Create defeat banner overlay
  const banner = document.createElement('div');
  banner.id = 'defeatBanner';
  banner.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0.5);
    background: linear-gradient(135deg, #7f1d1d, #dc2626);
    color: #fff;
    padding: 60px 100px;
    border-radius: 30px;
    font-size: 5em;
    font-weight: bold;
    text-align: center;
    z-index: 2000;
    box-shadow: 0 20px 60px rgba(239, 68, 68, 0.5);
    border: 8px solid rgba(255,255,255,0.85);
    opacity: 0;
    animation: defeatPopIn 0.5s ease-out forwards;
  `;
  banner.textContent = 'DEFEAT';
  
  // Subtitle message
  const subtitle = document.createElement('div');
  subtitle.style.cssText = 'font-size:.35em;margin-top:12px;opacity:.9;';
  subtitle.textContent = message || '';
  banner.appendChild(subtitle);
  
  // Add animation styles
  const style = document.createElement('style');
  style.textContent = `
    @keyframes defeatPopIn {
      0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
      50% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
      100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    }
    @keyframes defeatPopOut {
      0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
      100% { transform: translate(-50%, -50%) scale(1.2); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(banner);
  
  // Remove after delay with fade out (just before redirect)
  setTimeout(() => {
    banner.style.animation = 'defeatPopOut 0.5s ease-in forwards';
    setTimeout(() => {
      banner.remove();
      style.remove();
    }, 500);
  }, 4000);
}

// ========== CAMP SCENE ==========

function showCampScene(data) {
  console.log('Showing camp scene:', data);
  
  // Play camp music
  playMusic('camp');
  
  // Hide other scenes
  classSelection.style.display = 'none';
  battleScene.style.display = 'none';
  
  // Check if camp frame already exists
  let campFrame = document.getElementById('campFrame');
  
  if (!campFrame) {
    // Create iframe for camp scene
    campFrame = document.createElement('iframe');
    campFrame.id = 'campFrame';
    campFrame.src = '/games/rpg/client/camp-scene.html';
    campFrame.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      border: none;
      z-index: 500;
    `;
    
    document.body.appendChild(campFrame);
    
    // Wait for iframe to load before sending data
    campFrame.onload = () => {
      console.log('Camp frame loaded, initializing scene');
      if (campFrame.contentWindow && campFrame.contentWindow.initializeCampScene) {
        campFrame.contentWindow.initializeCampScene(data);
      }
    };
  } else {
    // Update existing camp scene
    if (campFrame.contentWindow && campFrame.contentWindow.updateCampScene) {
      campFrame.contentWindow.updateCampScene(data);
    }
  }
  
  gameState.phase = 'camp';
}

// ========== SKILL LEARNING SCENE ==========

function showSkillLearningScene(data) {
  console.log('[SKILL LEARNING] Showing skill learning scene:', data);
  
  // Check if skill learning overlay already exists
  let skillOverlay = document.getElementById('skillLearningOverlay');
  
  if (!skillOverlay) {
    // Create skill learning overlay
    skillOverlay = document.createElement('div');
    skillOverlay.id = 'skillLearningOverlay';
    skillOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-image: url('/games/rpg/assets/backgrounds/skill.jpg');
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      z-index: 600;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: white;
    `;
    
    skillOverlay.innerHTML = `
      <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); z-index: -1;"></div>
      <div style="text-align: center; max-width: 800px; padding: 40px; position: relative; z-index: 1;">
        <h1 style="font-size: 4em; margin-bottom: 20px; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);">
          Skill Learning
        </h1>
        <p style="font-size: 2em; opacity: 0.9; margin-bottom: 30px;">
          Players are choosing new abilities to learn...
        </p>
        <div style="font-size: 1.5em; opacity: 0.7;">
          Encounter #${data.encounterNumber}
        </div>
      </div>
    `;
    
    document.body.appendChild(skillOverlay);
  }
}

function hideSkillLearningScene() {
  const skillOverlay = document.getElementById('skillLearningOverlay');
  if (skillOverlay) {
    skillOverlay.remove();
  }
}

function showTalentLearningScene(data) {
  console.log('[TALENT LEARNING] Showing talent learning scene:', data);
  
  // Check if talent learning overlay already exists
  let talentOverlay = document.getElementById('talentLearningOverlay');
  
  if (!talentOverlay) {
    // Create talent learning overlay
    talentOverlay = document.createElement('div');
    talentOverlay.id = 'talentLearningOverlay';
    talentOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-image: url('/games/rpg/assets/backgrounds/talent.jpg');
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      z-index: 600;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: white;
    `;
    
    talentOverlay.innerHTML = `
      <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); z-index: -1;"></div>
      <div style="text-align: center; max-width: 800px; padding: 40px; position: relative; z-index: 1;">
        <h1 style="font-size: 4em; margin-bottom: 20px; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);">
          Talent Selection
        </h1>
        <p style="font-size: 2em; opacity: 0.9; margin-bottom: 30px;">
          Players are choosing powerful talents...
        </p>
        <div style="font-size: 1.5em; opacity: 0.7;">
          Encounter #${data.encounterNumber || 'N/A'}
        </div>
      </div>
    `;
    
    document.body.appendChild(talentOverlay);
  }
}

function hideTalentLearningScene() {
  const talentOverlay = document.getElementById('talentLearningOverlay');
  if (talentOverlay) {
    talentOverlay.remove();
  }
}

// ========== LOOT SCREEN ==========

function showLootScreen(lootData) {
  // Play loot music
  playMusic('loot');
  
  // Create loot screen overlay
  const lootOverlay = document.createElement('div');
  lootOverlay.id = 'lootOverlay';
  lootOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.95);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  // Create iframe for loot screen
  const lootFrame = document.createElement('iframe');
  lootFrame.src = '/games/rpg/client/loot-screen.html';
  lootFrame.style.cssText = `
    width: 100%;
    height: 100%;
    border: none;
  `;
  
  lootOverlay.appendChild(lootFrame);
  document.body.appendChild(lootOverlay);

  // Handle loot screen messages
  window.addEventListener('message', (event) => {
    if (event.data.type === 'lootComplete') {
      // Remove loot screen
      document.body.removeChild(lootOverlay);
      // Continue to next encounter or phase
      socket.emit('lootPhaseComplete');
    }
  });

  // Send loot data to iframe after it loads
  lootFrame.onload = () => {
    lootFrame.contentWindow.postMessage({
      type: 'lootData',
      data: lootData
    }, '*');
  };
}

// Listen for loot screen events
socket.on('showLootScreen', (data) => {
  console.log('Showing loot screen:', data);
  showLootScreen(data);
});

// Listen for victory banner
socket.on('showVictoryBanner', (data) => {
  console.log('Showing victory banner:', data);
  showVictoryBanner(data.message);
});

// ========== ACTION POPUP ==========

function showActionPopup(actorNameText, actionNameText, isHero) {
  // Set actor name and color
  actionActor.textContent = actorNameText;
  actionActor.className = 'action-actor ' + (isHero ? 'hero' : 'enemy');
  actionVerb.textContent = 'used';
  
  // Set action name
  actionNameEl.textContent = actionNameText;
  
  // Reset animation
  actionPopup.classList.remove('show');
  
  // Trigger animation
  setTimeout(() => {
    actionPopup.classList.add('show');
  }, 50);
  
  // Remove animation class after it completes
  setTimeout(() => {
    actionPopup.classList.remove('show');
  }, 2500);
}

function showGenericPopup(title, text, hexColor) {
  // Set actor name and color
  actionActor.textContent = title;
  actionActor.className = 'action-actor';
  if (hexColor && typeof hexColor === 'string') {
    actionActor.style.color = hexColor;
  } else {
    actionActor.style.color = '';
  }
  
  // Set action name
  actionNameEl.textContent = '';
  actionVerb.textContent = text;
  
  // Reset animation
  actionPopup.classList.remove('show');
  
  // Trigger animation
  setTimeout(() => {
    actionPopup.classList.add('show');
  }, 50);
  
  // Remove animation class after it completes
  setTimeout(() => {
    actionPopup.classList.remove('show');
  }, 2500);
}

// ========== FLOATING COMBAT TEXT ==========

function showFloatingText(spriteId, text, type, isCrit = false) {
  const sprite = document.getElementById(`sprite-${spriteId}`);
  if (!sprite) return;
  
  const floatingText = document.createElement('div');
  floatingText.className = `floating-text ${type}`;
  
  if (isCrit) {
    floatingText.classList.add('crit');
  }
  
  floatingText.textContent = text;
  
  // Position at sprite center
  const rect = sprite.getBoundingClientRect();
  floatingText.style.left = (rect.left + rect.width / 2) + 'px';
  floatingText.style.top = (rect.top + rect.height / 2) + 'px';
  
  // Add slight random offset for multiple hits
  const randomOffset = (Math.random() - 0.5) * 40;
  floatingText.style.marginLeft = randomOffset + 'px';
  
  spritesContainer.appendChild(floatingText);
  
  // Remove after animation completes
  setTimeout(() => {
    floatingText.remove();
  }, 2000);
}

function showDamageText(targetId, damage, isCrit) {
  if (isCrit) {
    showFloatingText(targetId, `${damage}!`, 'damage', true);
  } else {
    showFloatingText(targetId, damage, 'damage', false);
  }
}

function showHealText(targetId, heal) {
  showFloatingText(targetId, `+${heal}`, 'heal', false);
}

function showMissText(targetId) {
  showFloatingText(targetId, 'MISS', 'miss', false);
}

// ========== UTILITY ==========

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ========== INITIALIZATION ==========

console.log('RPG Host Scene initialized');
console.log('Socket:', socket ? 'Connected' : 'Not connected');
console.log('Lobby code:', lobbyCode);

// Handle image loading errors globally
document.addEventListener('error', (e) => {
  if (e.target.tagName === 'IMG') {
    console.log('Image failed to load:', e.target.src);
    
    // For sprites, show emoji fallback
    if (e.target.closest('.sprite')) {
      const sprite = e.target.closest('.sprite');
      const type = sprite.dataset.type;
      
      // Mark as emoji fallback
      e.target.dataset.isEmoji = 'true';
      
      if (type === 'player') {
        const characterData = gameState.players.find(p => p.id === sprite.dataset.characterId);
        if (characterData) {
          e.target.textContent = CLASS_ICONS[characterData.class] || '👤';
          e.target.style.fontSize = '80px';
          e.target.style.textAlign = 'center';
          e.target.style.lineHeight = '120px';
        }
      } else {
        e.target.textContent = '👹';
        e.target.style.fontSize = '100px';
        e.target.style.textAlign = 'center';
        e.target.style.lineHeight = '140px';
      }
      
      // Don't try to change src again
      e.target.onerror = null;
    }
  }
}, true);


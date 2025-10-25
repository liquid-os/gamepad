// Street Brawler - Server Logic

// Fighter characters
const FIGHTERS = {
  ryu: {
    id: 'ryu',
    name: 'Ryu',
    health: 100,
    speed: 5,
    jumpPower: 25,
    color: '#ef4444',
    attacks: {
      light: { damage: 5, range: 80, cooldown: 300 },
      medium: { damage: 10, range: 100, cooldown: 500 },
      heavy: { damage: 20, range: 120, cooldown: 800 }
    }
  },
  ken: {
    id: 'ken',
    name: 'Ken',
    health: 100,
    speed: 6,
    jumpPower: 24,
    color: '#3b82f6',
    attacks: {
      light: { damage: 6, range: 70, cooldown: 250 },
      medium: { damage: 12, range: 90, cooldown: 450 },
      heavy: { damage: 18, range: 110, cooldown: 750 }
    }
  }
};

// Game constants
const GAME_WIDTH = 1920;
const GAME_HEIGHT = 1080;
const GROUND_Y = 900;
const FIGHTER_WIDTH = 80;
const FIGHTER_HEIGHT = 120;
const GRAVITY = 0.8;

module.exports = {
  meta: {
    id: 'fighter',
    name: 'Street Brawler',
    minPlayers: 2,
    maxPlayers: 2,
    description: 'Classic 2D fighting game!'
  },

  onInit(lobby, api) {
    lobby.state = {
      phase: 'character_select',
      players: {},
      fighters: {},
      gameStarted: false
    };

    api.sendToAll('gameState', {
      phase: 'character_select',
      availableFighters: Object.keys(FIGHTERS)
    });
  },

  onPlayerJoin(lobby, api, player) {
    console.log('Player joined fighter game:', player.username);
    
    lobby.state.players[player.id] = {
      id: player.id,
      username: player.username,
      fighter: null,
      ready: false
    };

    // Send current game state immediately
    api.sendToPlayer(player.id, 'gameState', {
      phase: lobby.state.phase,
      availableFighters: Object.keys(FIGHTERS)
    });
    
    // Also send to all to update availability
    api.sendToAll('gameState', {
      phase: lobby.state.phase,
      availableFighters: Object.keys(FIGHTERS)
    });
  },

  onPlayerLeave(lobby, api, player) {
    delete lobby.state.players[player.id];
    delete lobby.state.fighters[player.id];
    
    // End game if a player leaves during match
    if (lobby.state.gameStarted) {
      api.sendToAll('gameEnded', {
        reason: 'Player disconnected'
      });
      lobby.state.gameStarted = false;
      lobby.state.phase = 'character_select';
    }
  },

  onAction(lobby, api, player, data) {
    const { action, payload } = data;

    switch (action) {
      case 'selectFighter':
        handleFighterSelection(lobby, api, player, payload);
        break;
      
      case 'controllerInput':
        handleControllerInput(lobby, api, player, payload);
        break;
      
      default:
        console.log(`Unknown action: ${action}`);
    }
  },

  onEnd(lobby, api) {
    if (lobby.gameLoop) {
      clearInterval(lobby.gameLoop);
    }
    lobby.state = null;
  }
};

// ============= FIGHTER SELECTION =============

function handleFighterSelection(lobby, api, player, payload) {
  console.log('handleFighterSelection called:', { playerId: player.id, payload });
  
  const { fighterId } = payload;
  
  if (!FIGHTERS[fighterId]) {
    console.log('Invalid fighter:', fighterId);
    return;
  }
  
  // Check if fighter already taken
  const takenFighters = Object.values(lobby.state.players)
    .filter(p => p.id !== player.id)
    .map(p => p.fighter);
  
  console.log('Taken fighters:', takenFighters);
  
  if (takenFighters.includes(fighterId)) {
    console.log('Fighter already taken:', fighterId);
    api.sendToPlayer(player.id, 'error', {
      message: 'Fighter already selected by another player'
    });
    return;
  }
  
  // Assign fighter
  lobby.state.players[player.id].fighter = fighterId;
  lobby.state.players[player.id].ready = true;
  
  console.log('Fighter assigned:', { playerId: player.id, fighterId, ready: true });
  
  // Notify all players
  api.sendToAll('fighterSelected', {
    playerId: player.id,
    playerName: player.username,
    fighterId: fighterId
  });
  
  console.log('Sent fighterSelected event');
  
  // Check if both players ready
  const allPlayers = Object.values(lobby.state.players);
  console.log('All players:', allPlayers.map(p => ({ id: p.id, fighter: p.fighter, ready: p.ready })));
  
  if (allPlayers.length === 2 && allPlayers.every(p => p.ready)) {
    console.log('Both players ready, starting fight!');
    startFight(lobby, api);
  } else {
    console.log('Waiting for more players or selections');
  }
}

// ============= GAME START =============

function startFight(lobby, api) {
  lobby.state.phase = 'fighting';
  lobby.state.gameStarted = true;
  
  // Initialize fighter positions
  const players = Object.values(lobby.state.players);
  
  players.forEach((player, index) => {
    const fighterData = FIGHTERS[player.fighter];
    
    lobby.state.fighters[player.id] = {
      id: player.id,
      username: player.username,
      fighterId: player.fighter,
      x: index === 0 ? 300 : GAME_WIDTH - 300,
      y: GROUND_Y,
      velocityX: 0,
      velocityY: 0,
      facingRight: index === 0,
      health: fighterData.health,
      maxHealth: fighterData.health,
      isJumping: false,
      isAttacking: false,
      attackCooldown: 0,
      stunned: false,
      state: 'idle' // idle, walking, jumping, attacking, hurt
    };
  });
  
  // Start game loop
  startGameLoop(lobby, api);
  
  // Notify all
  api.sendToAll('fightStarted', {
    fighters: Object.values(lobby.state.fighters).map(f => ({
      id: f.id,
      username: f.username,
      fighterId: f.fighterId,
      x: f.x,
      y: f.y,
      health: f.health,
      maxHealth: f.maxHealth,
      facingRight: f.facingRight
    }))
  });
}

// ============= GAME LOOP =============

function startGameLoop(lobby, api) {
  lobby.gameLoop = setInterval(() => {
    updateGame(lobby, api);
  }, 1000 / 60); // 60 FPS
}

function updateGame(lobby, api) {
  if (!lobby.state.gameStarted) return;
  
  const fighters = Object.values(lobby.state.fighters);
  
  // Update physics for each fighter
  fighters.forEach(fighter => {
    // Apply gravity
    if (fighter.y < GROUND_Y) {
      fighter.velocityY += GRAVITY;
      fighter.y += fighter.velocityY;
      
      if (fighter.y >= GROUND_Y) {
        fighter.y = GROUND_Y;
        fighter.velocityY = 0;
        fighter.isJumping = false;
        if (fighter.state === 'jumping') {
          fighter.state = 'idle';
        }
      }
    }
    
    // Apply horizontal movement
    fighter.x += fighter.velocityX;
    
    // Keep in bounds
    fighter.x = Math.max(50, Math.min(GAME_WIDTH - 50, fighter.x));
    
    // Reduce attack cooldown
    if (fighter.attackCooldown > 0) {
      fighter.attackCooldown -= 16; // ~60 FPS
      if (fighter.attackCooldown <= 0) {
        fighter.isAttacking = false;
      }
    }
    
    // Auto-face opponent
    const opponent = fighters.find(f => f.id !== fighter.id);
    if (opponent) {
      fighter.facingRight = opponent.x > fighter.x;
    }
  });
  
  // Check for collisions/attacks
  checkAttackCollisions(lobby, api);
  
  // Send update to host (throttled - every 3rd frame)
  if (!lobby.frameCounter) lobby.frameCounter = 0;
  lobby.frameCounter++;
  
  if (lobby.frameCounter % 3 === 0) {
    api.sendToHost('gameUpdate', {
      fighters: fighters.map(f => ({
        id: f.id,
        username: f.username,
        fighterId: f.fighterId,
        x: Math.round(f.x),
        y: Math.round(f.y),
        health: f.health,
        maxHealth: f.maxHealth,
        facingRight: f.facingRight,
        state: f.state,
        isAttacking: f.isAttacking
      }))
    });
  }
  
  // Check win condition
  checkWinCondition(lobby, api);
}

// ============= CONTROLLER INPUT =============

function handleControllerInput(lobby, api, player, payload) {
  if (!lobby.state.gameStarted) return;
  
  const fighter = lobby.state.fighters[player.id];
  if (!fighter || fighter.stunned) return;
  
  const { type, direction, button } = payload;
  const fighterData = FIGHTERS[fighter.fighterId];
  
  if (type === 'joystick') {
    // Handle movement
    if (direction === 'left') {
      fighter.velocityX = -fighterData.speed;
      if (!fighter.isJumping && !fighter.isAttacking) {
        fighter.state = 'walking';
      }
    } else if (direction === 'right') {
      fighter.velocityX = fighterData.speed;
      if (!fighter.isJumping && !fighter.isAttacking) {
        fighter.state = 'walking';
      }
    } else if (direction === 'up' && !fighter.isJumping) {
      // Jump
      fighter.velocityY = -fighterData.jumpPower;
      fighter.isJumping = true;
      fighter.state = 'jumping';
    } else if (direction === 'neutral') {
      fighter.velocityX = 0;
      if (!fighter.isJumping && !fighter.isAttacking) {
        fighter.state = 'idle';
      }
    }
  } else if (type === 'button' && !fighter.isAttacking) {
    // Handle attacks
    let attackType = null;
    
    if (button === 'A') {
      attackType = 'light';
    } else if (button === 'B') {
      attackType = 'medium';
    } else if (button === 'X') {
      attackType = 'heavy';
    }
    
    if (attackType && fighter.attackCooldown <= 0) {
      executeAttack(lobby, api, fighter, attackType);
    }
  }
}

function executeAttack(lobby, api, fighter, attackType) {
  const fighterData = FIGHTERS[fighter.fighterId];
  const attack = fighterData.attacks[attackType];
  
  fighter.isAttacking = true;
  fighter.attackCooldown = attack.cooldown;
  fighter.state = 'attacking';
  fighter.currentAttack = {
    type: attackType,
    damage: attack.damage,
    range: attack.range,
    startTime: Date.now()
  };
  
  // Attack resolves after animation (200ms)
  setTimeout(() => {
    resolveAttack(lobby, api, fighter);
    if (fighter.state === 'attacking') {
      fighter.state = 'idle';
    }
  }, 200);
}

function resolveAttack(lobby, api, fighter) {
  if (!fighter.currentAttack) return;
  
  const attack = fighter.currentAttack;
  const opponent = Object.values(lobby.state.fighters).find(f => f.id !== fighter.id);
  
  if (!opponent) return;
  
  // Check if opponent is in range
  const distance = Math.abs(fighter.x - opponent.x);
  const inRange = distance <= attack.range;
  
  // Check if facing opponent
  const facingOpponent = (fighter.facingRight && opponent.x > fighter.x) || 
                         (!fighter.facingRight && opponent.x < fighter.x);
  
  if (inRange && facingOpponent) {
    // Hit!
    opponent.health = Math.max(0, opponent.health - attack.damage);
    opponent.state = 'hurt';
    
    // Knockback
    const knockbackDirection = fighter.facingRight ? 1 : -1;
    opponent.x += knockbackDirection * 30;
    
    // Brief stun
    opponent.stunned = true;
    setTimeout(() => {
      opponent.stunned = false;
      if (opponent.state === 'hurt') {
        opponent.state = 'idle';
      }
    }, 300);
    
    // Notify hit
    api.sendToHost('attackHit', {
      attackerId: fighter.id,
      targetId: opponent.id,
      damage: attack.damage,
      attackType: attack.type
    });
    
    // Send health update
    api.sendToAll('healthUpdate', {
      playerId: opponent.id,
      health: opponent.health,
      maxHealth: opponent.maxHealth
    });
  }
  
  fighter.currentAttack = null;
}

// ============= COLLISION DETECTION =============

function checkAttackCollisions(lobby, api) {
  // Collision checking is handled in resolveAttack
  // This function can be used for additional collision logic
}

// ============= WIN CONDITION =============

function checkWinCondition(lobby, api) {
  const fighters = Object.values(lobby.state.fighters);
  
  const defeated = fighters.find(f => f.health <= 0);
  if (defeated) {
    const winner = fighters.find(f => f.id !== defeated.id);
    
    // Stop game loop
    clearInterval(lobby.gameLoop);
    lobby.state.gameStarted = false;
    
    // Announce winner
    api.sendToAll('fightEnded', {
      winner: winner.username,
      winnerId: winner.id,
      loserId: defeated.id
    });
    
    // Reset after delay
    setTimeout(() => {
      lobby.state.phase = 'character_select';
      lobby.state.fighters = {};
      Object.values(lobby.state.players).forEach(p => {
        p.ready = false;
        p.fighter = null;
      });
      
      api.sendToAll('gameState', {
        phase: 'character_select',
        availableFighters: Object.keys(FIGHTERS)
      });
    }, 5000);
  }
}


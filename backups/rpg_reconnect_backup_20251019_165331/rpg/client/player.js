// Co-op RPG Quest - Player Client

// Get socket from parent window
const socket = window.parent.socket || io('/lobby');
const lobbyCode = window.parent.currentLobbyCode;
const playerName = window.parent.myName;

// Class icons
const CLASS_ICONS = {
  knight: '🛡️',
  wizard: '🧙',
  cleric: '✨',
  rogue: '🗡️',
  archer: '🏹',
  druid: '🌿',
  barbarian: '🪓',
  warlock: '🔮',
  monk: '🥋'
};

// Game state
let gameState = {
  phase: 'class_selection',
  selectedClass: null,
  playerData: null,
  availableClasses: [],
  selectedClasses: {},
  combat: null
};

// Current action selection state
let currentActionIndex = 0;
let currentTotalActions = 1;

// Tab management
let currentTab = 0;
const tabs = ['combatTabContent', 'inventoryTabContent'];
// Mobile swipe state
let swipeStartX = 0;
let swipeCurrentX = 0;
let swipeDragging = false;
let ignoreNextTouchEnd = false; // prevents stale touchend after programmatic tab switch

// Global item database that gets populated from server
let itemDatabase = {
  'health_potion': {
    name: 'Health Potion',
    description: 'Increases maximum health by 20',
    icon: '/games/rpg/assets/items/health_potion.png',
    iconFallback: '🧪',
    rarity: 'common'
  },
  'vitality_ring': {
    name: 'Ring of Vitality',
    description: 'Increases maximum health by 30',
    icon: '/games/rpg/assets/items/vitality_ring.png',
    iconFallback: '💍',
    rarity: 'uncommon'
  },
  'assassin_hood': {
    name: 'Assassin Hood',
    description: 'Increases speed by 3',
    icon: '/games/rpg/assets/items/assassin_hood.png',
    iconFallback: '🎭',
    rarity: 'uncommon'
  },
  'sharpened_sword': {
    name: 'Sharpened Sword',
    description: 'Increases physical damage by 5',
    icon: '/games/rpg/assets/items/sharpened_sword.png',
    iconFallback: '⚔️',
    rarity: 'common'
  },
  'iron_armor': {
    name: 'Iron Armor',
    description: 'Increases defense by 8',
    icon: '/games/rpg/assets/items/iron_armor.png',
    iconFallback: '🛡️',
    rarity: 'common'
  },
  'sharpened_mind': {
    name: 'Sharpened Mind',
    description: 'Increases magic damage by 5',
    icon: '/games/rpg/assets/items/sharpened_mind.png',
    iconFallback: '🧠',
    rarity: 'common'
  }
};

// DOM elements
const classSelection = document.getElementById('classSelection');
const classList = document.getElementById('classList');
const selectedClassDisplay = document.getElementById('selectedClass');
const yourClassName = document.getElementById('yourClassName');

const combatPhase = document.getElementById('combat');
const playerClassName = document.getElementById('playerClassName');
const playerHealthBar = document.getElementById('playerHealthBar');
const playerHealthText = document.getElementById('playerHealthText');
const combatMessage = document.getElementById('combatMessage');
const turnInfo = document.getElementById('turnInfo');

const actionSelection = document.getElementById('actionSelection');
const actionButtons = document.getElementById('actionButtons');
const targetSelection = document.getElementById('targetSelection');
const targetButtons = document.getElementById('targetButtons');
const waitingState = document.getElementById('waitingState');
const waitingMessage = document.getElementById('waitingMessage');
const statusDisplay = document.getElementById('statusDisplay');
const playerStatusEffects = document.getElementById('playerStatusEffects');

// Tabs DOM
const tabHeaders = document.getElementById('tabHeaders');
const combatTabBtn = document.getElementById('combatTab');
const inventoryTabBtn = document.getElementById('inventoryTab');
const tabContent = document.getElementById('tabContent');
const combatTabContent = document.getElementById('combatTabContent');
const inventoryTabContent = document.getElementById('inventoryTabContent');
const dotIndicators = document.getElementById('dotIndicators');

const skillLearning = document.getElementById('skillLearning');
const skillOptions = document.getElementById('skillOptions');
const skillSelected = document.getElementById('skillSelected');
const learnedSkillName = document.getElementById('learnedSkillName');

const talentLearning = document.getElementById('talentLearning');
const talentOptions = document.getElementById('talentOptions');
const talentSelected = document.getElementById('talentSelected');
const learnedTalentName = document.getElementById('learnedTalentName');

const gameEnd = document.getElementById('gameEnd');
const endTitle = document.getElementById('endTitle');
const endMessage = document.getElementById('endMessage');

// Socket event listeners
socket.on('gameState', (data) => {
  console.log('Game state received:', data);
  gameState.phase = data.phase;
  gameState.availableClasses = data.availableClasses || [];
  gameState.selectedClasses = data.selectedClasses || {};
  gameState.playerData = data.playerData;

  if (data.phase === 'class_selection') {
    renderClassSelection();
  }
  
  // Update player items if available
  if (data.playerData && data.playerData.items) {
    updatePlayerItems(data.playerData.items);
    // Also update stats/talents with current player data
    updateTalentsDisplay(data.playerData.items);
    updateStatsDisplay(data.playerData);
  }
});

// Show a dismissible alert on the player device
socket.on('playerAlert', (payload) => {
  const { title, text } = payload || {};
  // Create overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
  const modal = document.createElement('div');
  modal.style.cssText = 'background:#111;color:#fff;border:2px solid #7e22ce;border-radius:12px;max-width:420px;width:90%;padding:18px;box-shadow:0 10px 30px rgba(0,0,0,.6);text-align:center;';
  const h = document.createElement('div');
  h.style.cssText = 'font-size:1.2em;font-weight:bold;margin-bottom:8px;color:#fbbf24;';
  h.textContent = title || 'Notice';
  const p = document.createElement('div');
  p.style.cssText = 'font-size:1em;opacity:.95;margin-bottom:14px;white-space:pre-wrap;';
  p.textContent = text || '';
  const ok = document.createElement('button');
  ok.textContent = 'OK';
  ok.className = 'action-btn';
  ok.style.cssText = 'margin-top:4px;background:#7e22ce;border:2px solid rgba(255,255,255,0.25);color:#fff;padding:10px 18px;border-radius:10px;cursor:pointer;font-weight:bold;';
  ok.onclick = () => overlay.remove();
  modal.appendChild(h); modal.appendChild(p); modal.appendChild(ok);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
});

socket.on('classSelected', (data) => {
  console.log('Class selected:', data);
  gameState.selectedClasses = data.selectedClasses;
  
  if (data.playerId === socket.id) {
    // This player selected a class
    gameState.selectedClass = data.className;
    showSelectedClass(data.className);
  }
  
  updateClassAvailability();
});

socket.on('campStarted', (data) => {
  console.log('Camp started:', data);
  gameState.phase = 'camp';
  gameState.camp = data;
  
  showCampPhase();
});

socket.on('campRoundStarted', (data) => {
  console.log('Camp round started:', data);
  gameState.camp = data;
  showCampPhase();
});

socket.on('campActionSelected', (data) => {
  console.log('Camp action selected:', data);
  updateCombatStatus(`You selected: ${data.actionName}. Waiting for other players...`);
});

socket.on('campActionsResolved', (data) => {
  console.log('Camp actions resolved:', data);
  
  // Update player data
  const myData = data.players.find(p => p.id === socket.id);
  if (myData) {
    updatePlayerItems(myData.items);
  }
  
  // Show results
  let resultText = 'Camp actions complete!\n';
  data.results.forEach(result => {
    resultText += `${result.playerName}: ${result.effects.join(', ')}\n`;
  });
  updateCombatStatus(resultText);
});

socket.on('campComplete', () => {
  console.log('Camp complete');
  
  // Hide camp UI elements (clear buttons but preserve structure)
  const actionSelectionDiv = document.getElementById('actionSelection');
  const actionButtonsDiv = document.getElementById('actionButtons');
  if (actionSelectionDiv) {
    actionSelectionDiv.style.display = 'none';
  }
  if (actionButtonsDiv) {
    actionButtonsDiv.innerHTML = '';  // Clear camp action buttons
  }
  
  updateCombatStatus('Camp complete! Preparing for combat...');
});

// ========== SKILL LEARNING ==========

socket.on('skillLearningOptions', (data) => {
  console.log('[SKILL LEARNING] ✅ Event received:', data);
  console.log('[SKILL LEARNING] Number of skills:', data.skills ? data.skills.length : 0);
  console.log('[SKILL LEARNING] Skills:', data.skills);
  showSkillLearning(data);
});

socket.on('skillLearned', (data) => {
  console.log('Skill learned:', data);
  showSkillLearned(data.skill);
});

socket.on('skillLearningComplete', () => {
  console.log('Skill learning complete');
  
  // Hide skill learning UI
  skillLearning.style.display = 'none';
  skillOptions.innerHTML = '';
  skillSelected.style.display = 'none';
});

// ========== TALENT LEARNING ==========

socket.on('talentLearningOptions', (data) => {
  console.log('[TALENT LEARNING] ✅ Event received:', data);
  console.log('[TALENT LEARNING] Number of talents:', data.talents ? data.talents.length : 0);
  console.log('[TALENT LEARNING] Talents:', data.talents);
  showTalentLearning(data);
});

socket.on('talentLearned', (data) => {
  console.log('Talent learned:', data);
  showTalentLearned(data.talent);
});

socket.on('talentLearningComplete', () => {
  console.log('Talent learning complete');
  
  // Hide talent learning UI
  talentLearning.style.display = 'none';
  talentOptions.innerHTML = '';
  talentSelected.style.display = 'none';
});

socket.on('combatStarted', (data) => {
  console.log('Combat started:', data);
  gameState.phase = 'combat';
  gameState.combat = data;
  
  // Clear any camp state
  gameState.camp = null;
  
  showCombatPhase();
  updateCombatStatus('Combat has begun! Rolling initiative...');
});

socket.on('initiativeRolled', (data) => {
  console.log('Initiative rolled:', data);
  displayTurnOrder(data.turnOrder);
});

socket.on('actionOptions', (data) => {
  console.log('Action options:', data);
  // Auto-switch to combat tab and suppress one pending touchend from previous tab
  ignoreNextTouchEnd = true;
  switchTab(0);
  showActionSelection(data.actions, data.actionIndex, data.totalActions, data.selectedActionIds || []);
});

socket.on('selectTarget', (data) => {
  console.log('Select target:', data);
  showTargetSelection(data.action, data.targets, data.actionIndex, data.totalActions);
});

socket.on('actionConfirmed', (data) => {
  console.log('Action confirmed:', data);
  hideActionSelection();
  hideTargetSelection();
  showWaitingState(`Action selected: ${data.action}`);
});

socket.on('allActionsConfirmed', (data) => {
  console.log('All actions confirmed:', data);
  hideActionSelection();
  hideTargetSelection();
  showWaitingState(`All ${data.totalActions} actions selected!`);
});

socket.on('healthUpdate', (data) => {
  console.log('Health update received:', data);
  
  // Update player's health bar
  updatePlayerHealth(data.players);
});

socket.on('combatRoundComplete', (data) => {
  console.log('Combat round complete:', data);
  
  // Final health update
  updatePlayerHealth(data.players);
  
  hideWaitingState();
});

socket.on('combatEnded', (data) => {
  console.log('Combat ended:', data);
  
  // Only show end screen for defeat (victory goes to loot)
  if (data.result === 'defeat') {
    setTimeout(() => {
      showEndScreen(data.result, data.message);
    }, 2000);
  }
});

  socket.on('statusEffectsUpdate', (data) => {
    console.log('Status effects update:', data);
    updatePlayerStatusEffects(data.statusEffects);
  });

  // Loot system events
  socket.on('lootItem', (data) => {
    console.log('Loot item:', data);
    
    // Store the item data for inventory display
    if (data.itemId && data.name) {
      itemDatabase[data.itemId] = {
        name: data.name,
        description: data.description,
        icon: data.icon,
        iconFallback: data.iconFallback,
      rarity: data.rarity,
      talent: data.talent === true
      };
    }
    
    showLootItem(data);
  });

  socket.on('lootRolls', (data) => {
    console.log('Loot rolls:', data);
    showLootRolls(data);
  });

  socket.on('lootWinner', (data) => {
    console.log('Loot winner:', data);
    showLootWinner(data);
  });

  socket.on('playerLootAction', (data) => {
    console.log('Player loot action:', data);
    updatePlayerLootAction(data);
  });

  socket.on('lootComplete', () => {
    console.log('Loot complete, preparing for next combat');
    // Hide loot container
    hideLootContainer();
    // Stay in combat phase for next encounter
  });

  socket.on('itemAwarded', (data) => {
    console.log('Item awarded:', data);
    
    // Store the item data for inventory display
    if (data.itemId && data.name) {
      itemDatabase[data.itemId] = {
        name: data.name,
        description: data.description,
        icon: data.icon,
        iconFallback: data.iconFallback,
      rarity: data.rarity,
      talent: data.talent === true
      };
    }
  });

socket.on('error', (data) => {
  console.error('Error:', data);
  alert(data.message);
});

// ============= RENDER FUNCTIONS =============

function renderClassSelection() {
  classSelection.style.display = 'block';
  combatPhase.style.display = 'none';
  gameEnd.style.display = 'none';
  
  classList.innerHTML = '';
  
  const classData = {
    knight: { name: 'Knight', health: 120, icon: CLASS_ICONS.knight },
    wizard: { name: 'Wizard', health: 80, icon: CLASS_ICONS.wizard },
    cleric: { name: 'Cleric', health: 100, icon: CLASS_ICONS.cleric },
    rogue: { name: 'Rogue', health: 90, icon: CLASS_ICONS.rogue },
    druid: { name: 'Druid', health: 105, icon: CLASS_ICONS.druid },
    //barbarian: { name: 'Barbarian', health: 130, icon: CLASS_ICONS.barbarian },
    warlock: { name: 'Warlock', health: 85, icon: CLASS_ICONS.warlock },
    monk: { name: 'Monk', health: 100, icon: CLASS_ICONS.monk }

  };
  
  gameState.availableClasses.forEach(className => {
    const classInfo = classData[className];
    const isTaken = gameState.selectedClasses[className];
    
    const card = document.createElement('div');
    card.className = `class-card ${isTaken ? 'taken' : ''}`;
    card.innerHTML = `
      <div class="class-icon">${classInfo.icon}</div>
      <div class="class-name">${classInfo.name}</div>
      <div class="class-health">❤️ ${classInfo.health} HP</div>
      ${isTaken ? '<div style="margin-top:10px; color:#ef4444;">Taken</div>' : ''}
    `;
    
    if (!isTaken) {
      card.onclick = () => selectClass(className);
    }
    
    classList.appendChild(card);
  });
}

function updateClassAvailability() {
  const cards = classList.querySelectorAll('.class-card');
  cards.forEach((card, index) => {
    const className = gameState.availableClasses[index];
    const isTaken = gameState.selectedClasses[className];
    
    if (isTaken && !card.classList.contains('taken')) {
      card.classList.add('taken');
      card.onclick = null;
      
      const takenLabel = document.createElement('div');
      takenLabel.style.marginTop = '10px';
      takenLabel.style.color = '#ef4444';
      takenLabel.textContent = 'Taken';
      card.appendChild(takenLabel);
    }
  });
}

function showSelectedClass(className) {
  classList.style.display = 'none';
  selectedClassDisplay.style.display = 'block';
  
  const classNames = {
    knight: 'Knight 🛡️',
    wizard: 'Wizard 🧙',
    cleric: 'Cleric ✨',
    rogue: 'Rogue 🗡️',
    druid: 'Druid 🌿',
    //barbarian: 'Barbarian 🌿',
    warlock: 'Warlock 👹',
    monk: 'Monk 🧘'
  };
  
  yourClassName.textContent = classNames[className];
}

function showCampPhase() {
  classSelection.style.display = 'none';
  combatPhase.style.display = 'block';
  gameEnd.style.display = 'none';
  
  // Show camp actions
  const actions = gameState.camp.actions || [];
  showCampActions(actions);
}

function showCampActions(actions) {
  const actionSelection = document.getElementById('actionSelection');
  const actionButtons = document.getElementById('actionButtons');
  const combatMessage = document.getElementById('combatMessage');
  
  // Update status message (use combatMessage, not combatStatus!)
  if (combatMessage) {
    combatMessage.textContent = `Camp - Round ${gameState.camp.round}/${gameState.camp.maxRounds}`;
  }
  
  // Clear and populate actionButtons (don't destroy the element!)
  if (actionButtons) {
    actionButtons.innerHTML = '';
    
    actions.forEach(action => {
      const btn = document.createElement('button');
      btn.className = 'action-btn';
      btn.innerHTML = `
        <div style="font-size: 2em; margin-bottom: 5px;">${action.icon}</div>
        <div style="font-weight: bold; margin-bottom: 5px;">${action.name}</div>
        <div style="font-size: 0.9em; opacity: 0.9;">${action.description}</div>
      `;
      btn.onclick = () => selectCampAction(action.id);
      actionButtons.appendChild(btn);
    });
  }
  
  actionSelection.style.display = 'block';
  document.getElementById('targetSelection').style.display = 'none';
}

function selectCampAction(actionId) {
  console.log('Selecting camp action:', actionId);
  
  socket.emit('action', {
    code: lobbyCode,
    data: {
      action: 'selectCampAction',
      payload: { actionId: actionId }
    }
  });
  
  document.getElementById('actionSelection').style.display = 'none';
}

function showCombatPhase() {
  classSelection.style.display = 'none';
  combatPhase.style.display = 'block';
  gameEnd.style.display = 'none';
  
  // Hide camp/action UI elements (don't clear innerHTML - combat will populate them)
  const actionSelectionDiv = document.getElementById('actionSelection');
  const targetSelectionDiv = document.getElementById('targetSelection');
  if (actionSelectionDiv) {
    actionSelectionDiv.style.display = 'none';
  }
  if (targetSelectionDiv) {
    targetSelectionDiv.style.display = 'none';
  }
  
  if (gameState.playerData) {
    const classNames = {
      knight: 'Knight 🛡️',
      wizard: 'Wizard 🧙',
      cleric: 'Cleric ✨',
      rogue: 'Rogue 🗡️',
      druid: 'Druid 🌿',
      //barbarian: 'Barbarian 🌿',
      warlock: 'Warlock 👹',
      monk: 'Monk 🧘'
    };
    
    playerClassName.textContent = classNames[gameState.playerData.class];
    updateHealthBar(gameState.playerData.health, gameState.playerData.maxHealth);
  }
}

function updateCombatStatus(message) {
  combatMessage.textContent = message;
}

function displayTurnOrder(turnOrder) {
  /*let html = '<h4>Turn Order (by speed):</h4><ol>';
  
  turnOrder.forEach(turn => {
    const name = turn.type === 'player' ? turn.username : turn.name;
    const speed = turn.speed;
    const icon = turn.type === 'player' ? '👤' : '👹';
    html += `<li>${icon} ${name} (${speed})</li>`;
  });
  
  html += '</ol>';
  turnInfo.innerHTML = html;*/
  
  updateCombatStatus('Turn order determined!');
}

function showActionSelection(actions, actionIndex = 0, totalActions = 1, selectedActionIds = []) {
  hideTargetSelection();
  hideWaitingState();
  
  // Store current action state
  currentActionIndex = actionIndex;
  currentTotalActions = totalActions;
  
  actionSelection.style.display = 'block';
  actionButtons.innerHTML = '';
  
  // Add header showing which action this is
  if (totalActions > 1) {
    const header = document.createElement('div');
    header.style.cssText = 'text-align: center; margin-bottom: 15px; font-size: 1.1em; font-weight: bold; color: #fbbf24;';
    header.textContent = `Select Action ${actionIndex + 1} of ${totalActions}`;
    actionButtons.appendChild(header);
  }
  
  actions.forEach(action => {
    const btn = document.createElement('button');
    const isSelected = selectedActionIds.includes(action.id);
    
    // Apply disabled styling if already selected
    if (isSelected) {
      btn.className = `action-btn ${action.type} disabled`;
      btn.style.opacity = '0.5';
      btn.style.cursor = 'not-allowed';
    } else {
      btn.className = `action-btn ${action.type}`;
    }
    
    let content = `<div style="font-size: 1.2em; margin-bottom: 5px; font-weight: bold;">${action.name}</div>`;
    
    // Add "Already Selected" indicator if disabled
    if (isSelected) {
      content += `<div style="font-size: 0.75em; color: #ef4444; font-weight: bold; margin-bottom: 3px;">❌ Already Selected</div>`;
    }
    
    // Add damage type indicator
    if (action.damageType) {
      const damageTypeIcon = action.damageType === 'physical' ? '⚔️' : '✨';
      const damageTypeColor = action.damageType === 'physical' ? '#ef4444' : '#8b5cf6';
      content += `<div style="font-size: 0.8em; color: ${damageTypeColor}; margin-bottom: 3px;">${damageTypeIcon} ${action.damageType}</div>`;
    }
    
    // Add hit chance modifier if present
    if (action.hitChanceModifier && action.hitChanceModifier !== 0) {
      const modifierSign = action.hitChanceModifier > 0 ? '+' : '';
      const modifierColor = action.hitChanceModifier > 0 ? '#22c55e' : '#fbbf24';
      content += `<div style="font-size: 0.75em; color: ${modifierColor}; font-weight: bold; margin-bottom: 3px;">🎯 ${modifierSign}${action.hitChanceModifier}% hit</div>`;
    }
    
    // Add charge-up indicator
    if (action.chargeUp) {
      content += `<div style="font-size: 0.75em; color: #fbbf24; font-weight: bold; margin-bottom: 3px;">⏳ Charge-up (1 turn)</div>`;
    }
    
    // Add remaining uses indicator
    if (action.remainingUses !== undefined && action.maxUses !== undefined) {
      const usesColor = action.remainingUses > 1 ? '#22c55e' : action.remainingUses === 1 ? '#fbbf24' : '#ef4444';
      content += `<div style="font-size: 0.75em; color: ${usesColor}; font-weight: bold; margin-bottom: 3px;">${action.remainingUses} uses left!</div>`;
    }
    
    content += `<div style="font-size: 0.85em; opacity: 0.8;">
      ${getActionDescription(action)}
    </div>`;
    
    btn.innerHTML = content;
    
    // Only allow clicking if not already selected
    if (!isSelected) {
      btn.onclick = () => selectAction(action.id);
    }
    
    actionButtons.appendChild(btn);
  });
}

function getActionDescription(action) {
  // If custom description is provided, use it
  if (action.desc) {
    // Replace placeholders with actual values
    let desc = action.desc;
    desc = desc.replace(/\$d/g, action.damage || 0);
    desc = desc.replace(/\$h/g, action.heal || 0);
    return desc;
  }
  
  // Otherwise, auto-generate from action properties
  let desc = '';
  if (action.damage) desc += `${action.damage} damage`;
  if (action.heal) desc += `${action.heal} healing`;
  if (action.defense) desc += `+${action.defense} defense`;
  if (action.stun) desc += ' • Stun';
  if (action.slow) desc += ' • Slow';
  return desc || 'Special action';
}

function hideActionSelection() {
  actionSelection.style.display = 'none';
}

function showTargetSelection(action, targets, actionIndex = 0, totalActions = 1) {
  hideActionSelection();
  
  // Store current action state
  currentActionIndex = actionIndex;
  currentTotalActions = totalActions;
  
  targetSelection.style.display = 'block';
  targetButtons.innerHTML = '';
  
  // Add header showing which action this is
  if (totalActions > 1) {
    const header = document.createElement('div');
    header.style.cssText = 'text-align: center; margin-bottom: 15px; font-size: 1.1em; font-weight: bold; color: #fbbf24;';
    header.textContent = `Select Target for Action ${actionIndex + 1} of ${totalActions}`;
    targetButtons.appendChild(header);
  }
  
  targets.forEach(target => {
    const btn = document.createElement('button');
    btn.className = 'target-btn';
    
    // Build button content
    let content = '';
    
    if (target.type === 'enemy') {
      content = `<div style="font-size: 1.2em; margin-bottom: 5px;">👹 ${target.name}</div>`;
      
      // Show HP if available
      if (target.hp !== undefined) {
        const hpColor = target.hp > 50 ? '#22c55e' : target.hp > 20 ? '#eab308' : '#ef4444';
        content += `<div style="font-size: 0.85em; opacity: 0.9; margin-bottom: 3px;">❤️ HP: <span style="color: ${hpColor}; font-weight: bold;">${target.hp}</span></div>`;
      }
      
      // Show hit chance for attack actions
      if (action.type === 'attack' && target.hitChance !== undefined) {
        const hitChance = target.hitChance;
        const hitColor = hitChance >= 75 ? '#22c55e' : hitChance >= 50 ? '#eab308' : '#ef4444';
        content += `<div style="font-size: 0.85em; opacity: 0.9;">🎯 Hit Chance: <span style="color: ${hitColor}; font-weight: bold;">${hitChance}%</span></div>`;
        content += `<div style="font-size: 0.75em; opacity: 0.7;">🛡️ Defense: ${target.defense}</div>`;
        
        // Show resistances if enemy has them
        if (target.resistances && target.resistances.length > 0) {
          const resistanceText = target.resistances.map(r => {
            const icon = r === 'physical' ? '🛡️' : r === 'magic' ? '✨' : '❓';
            const name = r === 'physical' ? 'Physical' : r === 'magic' ? 'Magic' : r;
            return `${icon} ${name}`;
          }).join(', ');
          content += `<div style="font-size: 0.75em; opacity: 0.7; color: #fbbf24;">🛡️ Resistant: ${resistanceText}</div>`;
        }
      }
    } else {
      content = `<div style="font-size: 1.2em;">👤 ${target.name}</div>`;
    }
    
    btn.innerHTML = content;
    btn.onclick = () => selectTarget(target.id);
    
    targetButtons.appendChild(btn);
  });
}

function hideTargetSelection() {
  targetSelection.style.display = 'none';
}

function showWaitingState(message) {
  waitingState.style.display = 'block';
  waitingMessage.textContent = message;
}

function hideWaitingState() {
  waitingState.style.display = 'none';
}

function updatePlayerHealth(players) {
  const myData = players.find(p => p.id === socket.id);
  if (myData) {
    // Update game state
    if (gameState.playerData) {
      gameState.playerData.health = myData.health;
      gameState.playerData.maxHealth = myData.maxHealth;
    }
    // Update health bar display
    updateHealthBar(myData.health, myData.maxHealth);
    console.log('Updated player HP:', myData.health, '/', myData.maxHealth);
  }
}

function updateHealthBar(current, max) {
  const percentage = (current / max) * 100;
  playerHealthBar.style.width = percentage + '%';
  playerHealthText.textContent = `${current}/${max}`;
  
  // Change color based on health percentage
  if (percentage > 60) {
    playerHealthBar.style.background = 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)';
  } else if (percentage > 30) {
    playerHealthBar.style.background = 'linear-gradient(90deg, #eab308 0%, #ca8a04 100%)';
  } else {
    playerHealthBar.style.background = 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)';
  }
}

// Combat log removed from player view - only on host screen

function updatePlayerStatusEffects(effects) {
  if (!playerStatusEffects) return;
  
  playerStatusEffects.innerHTML = '';
  
  if (!effects || effects.length === 0) return;
  
  effects.forEach(effect => {
    const badge = document.createElement('div');
    badge.className = 'status-effect-badge';
    badge.style.borderColor = effect.color || '#ffffff';
    
    // Icon
    const icon = document.createElement('span');
    icon.style.fontSize = '1.5em';
    icon.textContent = effect.icon || '?';
    badge.appendChild(icon);
    
    // Info
    const info = document.createElement('div');
    info.className = 'status-effect-info';
    
    const name = document.createElement('div');
    name.className = 'status-effect-name';
    name.textContent = effect.name;
    info.appendChild(name);
    
    const desc = document.createElement('div');
    desc.className = 'status-effect-desc';
    desc.textContent = effect.description;
    info.appendChild(desc);
    
    badge.appendChild(info);
    
    // Duration (if > 1 round)
    if (effect.duration > 1) {
      const duration = document.createElement('div');
      duration.className = 'status-effect-duration';
      duration.textContent = effect.duration;
      badge.appendChild(duration);
    }
    
    playerStatusEffects.appendChild(badge);
  });
}

// ========== LOOT SYSTEM ==========

// Track if player has acted on current loot item
let hasActedOnLoot = false;
let currentLootTimer = null;

function showLootItem(itemData) {
  console.log('Showing loot item:', itemData);
  
  // Reset action flag
  hasActedOnLoot = false;
  
  // Clear any existing timer
  if (currentLootTimer) {
    clearInterval(currentLootTimer);
    currentLootTimer = null;
  }
  
  // Show loot item on player screen
  const lootContainer = document.getElementById('lootContainer') || createLootContainer();
  
  const itemDisplay = document.createElement('div');
  itemDisplay.className = 'loot-item-display';
  itemDisplay.innerHTML = `
    <div class="loot-item-icon" style="width: 150px; height: 150px; margin: 0 auto 25px; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.3); border-radius: 12px; border: 3px solid rgba(255,255,255,0.2);">
      <img src="${itemData.icon}" 
           style="width: 120px; height: 120px; object-fit: contain;" 
           onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
      <span style="display:none; font-size: 5em;">${itemData.iconFallback}</span>
    </div>
    <div class="loot-item-name rarity-${itemData.rarity}" style="font-size: 2em; margin-bottom: 15px; font-weight: bold;">${itemData.name}</div>
    <div class="loot-item-description" style="font-size: 1.2em; line-height: 1.6; margin-bottom: 30px; max-width: 90%; color: rgba(255,255,255,0.9);">${itemData.description}</div>
    <div class="loot-actions" style="display: flex; gap: 20px; width: 100%; max-width: 500px; margin-bottom: 20px;">
      <button class="loot-roll-btn" onclick="rollForLoot('${itemData.itemId}')" 
              style="flex: 1; padding: 25px 50px; font-size: 1.5em; border-radius: 15px; border: none; background: linear-gradient(135deg, #10b981, #059669); color: white; cursor: pointer; font-weight: bold; transition: all 0.2s; box-shadow: 0 4px 15px rgba(16,185,129,0.4);">
        🎲 Roll
      </button>
      <button class="loot-pass-btn" onclick="passOnLoot('${itemData.itemId}')"
              style="flex: 1; padding: 25px 50px; font-size: 1.5em; border-radius: 15px; border: none; background: linear-gradient(135deg, #6b7280, #4b5563); color: white; cursor: pointer; font-weight: bold; transition: all 0.2s; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
        ❌ Pass
      </button>
    </div>
    <div class="loot-timer" style="width: 100%; max-width: 500px;">
      <div class="loot-timer-bar" style="width: 100%; height: 10px; background: rgba(255,255,255,0.2); border-radius: 5px; overflow: hidden;">
        <div class="loot-timer-fill" id="lootTimerFill" style="width: 100%; height: 100%; background: #10b981; transition: width 0.1s linear;"></div>
      </div>
      <div class="loot-timer-text" id="lootTimerText" style="margin-top: 10px; font-size: 1em; color: rgba(255,255,255,0.7);">10s remaining</div>
    </div>
  `;
  
  lootContainer.innerHTML = '';
  lootContainer.appendChild(itemDisplay);
  lootContainer.style.display = 'flex';
  
  // Start timer
  startLootTimer(itemData.itemId);
}

function createLootContainer() {
  const container = document.createElement('div');
  container.id = 'lootContainer';
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.9);
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    color: white;
    font-family: Arial, sans-serif;
  `;
  
  document.body.appendChild(container);
  return container;
}

function startLootTimer(itemId) {
  let timeRemaining = 10;
  
  currentLootTimer = setInterval(() => {
    timeRemaining--;
    const timerFill = document.getElementById('lootTimerFill');
    const timerText = document.getElementById('lootTimerText');
    
    if (timerFill && timerText) {
      const percentage = (timeRemaining / 10) * 100;
      timerFill.style.width = percentage + '%';
      timerText.textContent = `${timeRemaining}s remaining`;
    }
    
    if (timeRemaining <= 0) {
      clearInterval(currentLootTimer);
      currentLootTimer = null;
      // Auto-pass if no action taken
      if (!hasActedOnLoot) {
        passOnLoot(itemId);
      }
    }
  }, 1000);
}

function rollForLoot(itemId) {
  if (hasActedOnLoot) return;
  
  hasActedOnLoot = true;
  console.log('Rolling for loot:', itemId);
  
  // Clear timer
  if (currentLootTimer) {
    clearInterval(currentLootTimer);
    currentLootTimer = null;
  }
  
  socket.emit('action', {
    code: lobbyCode,
    data: {
      action: 'lootRoll',
      payload: { itemId: itemId }
    }
  });
  
  // Show waiting message instead of hiding
  const lootContainer = document.getElementById('lootContainer');
  if (lootContainer) {
    lootContainer.innerHTML = '<div style="text-align: center; padding: 50px; color: white;"><h2>Waiting for other players...</h2></div>';
  }
}

function passOnLoot(itemId) {
  if (hasActedOnLoot) return;
  
  hasActedOnLoot = true;
  console.log('Passing on loot:', itemId);
  
  // Clear timer
  if (currentLootTimer) {
    clearInterval(currentLootTimer);
    currentLootTimer = null;
  }
  
  socket.emit('action', {
    code: lobbyCode,
    data: {
      action: 'lootPass',
      payload: { itemId: itemId }
    }
  });
  
  // Show waiting message instead of hiding
  const lootContainer = document.getElementById('lootContainer');
  if (lootContainer) {
    lootContainer.innerHTML = '<div style="text-align: center; padding: 50px; color: white;"><h2>Waiting for other players...</h2></div>';
  }
}

function hideLootContainer() {
  const container = document.getElementById('lootContainer');
  if (container) {
    container.style.display = 'none';
  }
}

function showLootRolls(rollsData) {
  // Show rolls on player screen (optional - mainly for host)
  console.log('Loot rolls:', rollsData);
}

function showLootWinner(winnerData) {
  console.log('Showing loot winner:', winnerData);
  
  // Show winner announcement
  const container = document.getElementById('lootContainer');
  if (container) {
    container.innerHTML = `
      <div style="text-align: center; padding: 50px; color: white;">
        <h2 style="color: #10b981; font-size: 2em; margin-bottom: 20px;">🎉 ${winnerData.winner} won!</h2>
        <h3 style="font-size: 1.5em; margin-bottom: 10px;">${winnerData.item.name}</h3>
        <p style="font-size: 1.2em;">Roll: ${winnerData.roll}</p>
      </div>
    `;
    
    // Keep container visible
    container.style.display = 'flex';
  }
}

function updatePlayerLootAction(actionData) {
  // Update player action display (optional)
  console.log('Player action:', actionData);
}

// ========== PLAYER ITEMS SYSTEM ==========

// Toggle items section visibility
function toggleItemsSection() {
  const section = document.getElementById('itemsSection');
  const toggle = document.getElementById('itemsToggle');
  
  if (section.classList.contains('collapsed')) {
    section.classList.remove('collapsed');
    toggle.textContent = '▲';
  } else {
    section.classList.add('collapsed');
    toggle.textContent = '▼';
  }
}

// Update player items display
function updatePlayerItems(items) {
  // Update combined sections in Inventory tab
  updateInventoryDisplay(items);
  updateTalentsDisplay(items);
  if (gameState && gameState.playerData) updateStatsDisplay(gameState.playerData);
}

// New: Update stats list from playerData.itemEffects
function updateStatsDisplay(playerData) {
  const statsList = document.getElementById('statsList');
  if (!statsList || !playerData) return;
  const effects = playerData.itemEffects || {};
  const rows = [
    { label: 'Max Health', value: `+${effects.maxHealth || 0}` },
    { label: 'Physical Damage', value: `+${effects.physicalDamage || 0}%` },
    { label: 'Magic Damage', value: `+${effects.magicDamage || 0}%` },
    { label: 'Healing Bonus', value: `+${effects.healingBonus || 0}%` },
    { label: 'Hit Chance', value: `+${effects.hitChance || 0}%` },
    { label: 'Defense', value: `+${effects.defense || 0}` },
    { label: 'Speed', value: `+${effects.speed || 0}` },
    { label: 'Threat', value: `${effects.threat || 0}%` }
  ];
  statsList.innerHTML = rows.map(r => `<div class="stat-entry"><span class="stat-label">${r.label}</span><span class="stat-value">${r.value}</span></div>`).join('');
}

// New: Talents list (items with talent === true)
function updateTalentsDisplay(items) {
  const talentsList = document.getElementById('talentsList');
  if (!talentsList) return;
  const talentItems = (items || []).filter(id => {
    const it = getItemData(id);
    return it && it.talent === true;
  });
  if (talentItems.length === 0) {
    talentsList.innerHTML = '<div class="no-items">No talents acquired yet</div>';
    return;
  }
  const counts = {};
  talentItems.forEach(id => {
    const it = getItemData(id);
    if (!it) return;
    if (!counts[it.name]) counts[it.name] = { item: it, count: 0 };
    counts[it.name].count += 1;
  });
  talentsList.innerHTML = Object.values(counts).map(({ item, count }) => `
    <div class="talent-entry rarity-${item.rarity}">
      <div class="talent-icon">${item.iconFallback || '✨'}</div>
      <div class="talent-info">
        <div class="talent-name">${item.name}${count > 1 ? ` (${count})` : ''}</div>
        <div class="talent-description">${item.description || ''}</div>
      </div>
    </div>
  `).join('');
}

// New: Inventory list (non-talent items)
function updateInventoryDisplay(items) {
  const inventoryList = document.getElementById('inventoryList');
  if (!inventoryList) return;
  const nonTalent = (items || []).filter(id => {
    const it = getItemData(id);
    return it && it.talent !== true;
  });
  if (nonTalent.length === 0) {
    inventoryList.innerHTML = '<div class="no-items">No items collected yet</div>';
    return;
  }
  const counts = {};
  nonTalent.forEach(id => {
    const it = getItemData(id);
    if (!it) return;
    if (!counts[it.name]) counts[it.name] = { item: it, count: 0 };
    counts[it.name].count += 1;
  });
  inventoryList.innerHTML = Object.values(counts).map(({ item, count }) => {
    const iconHTML = item.icon && item.icon.startsWith('/')
      ? `<img src="${item.icon}" alt="${item.name}" style="width:100%;height:100%;object-fit:contain;" onerror="this.parentElement.textContent='${item.iconFallback || '❓'}'">`
      : (item.iconFallback || item.icon || '❓');
    return `
      <div class="item-entry rarity-${item.rarity}">
        <div class="item-icon">${iconHTML}${count > 1 ? `<div class="item-stack">${count}</div>` : ''}</div>
        <div class="item-info">
          <div class="item-name">${item.name}${count > 1 ? ` (${count})` : ''}</div>
          <div class="item-description">${item.description || ''}</div>
        </div>
      </div>
    `;
  }).join('');
}

// Tab switching helpers
function switchTab(tabIndex) {
  const panes = document.querySelectorAll('.tab-pane');
  panes.forEach((p, idx) => p.classList.toggle('active', idx === tabIndex));
  const headers = document.querySelectorAll('.tab-header');
  headers.forEach((h, idx) => h.classList.toggle('active', idx === tabIndex));
  const dots = document.querySelectorAll('.dot');
  dots.forEach((d, idx) => d.classList.toggle('active', idx === tabIndex));
  currentTab = tabIndex;
}

if (combatTabBtn && inventoryTabBtn) {
  combatTabBtn.addEventListener('click', () => switchTab(0));
  inventoryTabBtn.addEventListener('click', () => switchTab(1));
}

// Mobile swipe
if (tabContent) {
  tabContent.addEventListener('touchstart', e => {
    swipeDragging = true;
    swipeStartX = e.touches[0].clientX;
    swipeCurrentX = swipeStartX;
    // Once a new gesture starts, clear the suppression
    ignoreNextTouchEnd = false;
  });
  tabContent.addEventListener('touchmove', e => {
    if (!swipeDragging) return;
    swipeCurrentX = e.touches[0].clientX;
  });
  tabContent.addEventListener('touchend', () => {
    if (!swipeDragging) return;
    swipeDragging = false;
    if (ignoreNextTouchEnd) {
      // swallow this touchend caused by pre-switch gesture
      ignoreNextTouchEnd = false;
      return;
    }
    const diff = swipeStartX - swipeCurrentX; const threshold = 50;
    if (Math.abs(diff) > threshold) {
      if (diff > 0 && currentTab < tabs.length - 1) switchTab(currentTab + 1);
      else if (diff < 0 && currentTab > 0) switchTab(currentTab - 1);
    }
  });
}

// Get item data from global database
function getItemData(itemId) {
  return itemDatabase[itemId] || null;
}

// Legacy function - keeping for reference
function getItemData_old(itemId) {
  const itemDatabase = {
    'health_potion': {
      name: 'Health Potion',
      description: 'Increases maximum health by 20',
      icon: '/games/rpg/assets/items/health_potion.png',
      iconFallback: '🧪',
      rarity: 'common'
    },
    'vitality_ring': {
      name: 'Ring of Vitality',
      description: 'Increases maximum health by 30',
      icon: '/games/rpg/assets/items/vitality_ring.png',
      iconFallback: '💍',
      rarity: 'uncommon'
    },
    'sharp_sword': {
      name: 'Sharpened Blade',
      description: 'Increases physical damage by 5',
      icon: '/games/rpg/assets/items/sharp_sword.png',
      iconFallback: '⚔️',
      rarity: 'common'
    },
    'fire_wand': {
      name: 'Wand of Fire',
      description: 'Increases magic damage by 8',
      icon: '/games/rpg/assets/items/fire_wand.png',
      iconFallback: '🔥',
      rarity: 'uncommon'
    },
    'assassin_hood': {
      name: 'Assassin\'s Hood',
      description: 'Increases critical strike chance by 10%',
      icon: '/games/rpg/assets/items/assassin_hood.png',
      iconFallback: '🎭',
      rarity: 'rare'
    },
    'iron_armor': {
      name: 'Iron Armor',
      description: 'Increases defense by 8',
      icon: '/games/rpg/assets/items/iron_armor.png',
      iconFallback: '🛡️',
      rarity: 'common'
    },
    'healer_staff': {
      name: 'Staff of Healing',
      description: 'Increases healing done by 50%',
      icon: '/games/rpg/assets/items/healer_staff.png',
      iconFallback: '🩺',
      rarity: 'rare'
    },
    'lightning_orb': {
      name: 'Orb of Lightning',
      description: 'Unlocks Lightning Bolt action',
      icon: '/games/rpg/assets/items/lightning_orb.png',
      iconFallback: '⚡',
      rarity: 'epic'
    },
    'boots_swiftness': {
      name: 'Boots of Swiftness',
      description: 'Increases speed by 5',
      icon: '/games/rpg/assets/items/boots_swiftness.png',
      iconFallback: '👢',
      rarity: 'uncommon'
    },
    'haste_amulet': {
      name: 'Amulet of Haste',
      description: 'Increases speed rolls by 3',
      icon: '/games/rpg/assets/items/haste_amulet.png',
      iconFallback: '⏱️',
      rarity: 'rare'
    }
  };
  
  return itemDatabase[itemId];
}

function showEndScreen(result, message) {
  classSelection.style.display = 'none';
  combatPhase.style.display = 'none';
  gameEnd.style.display = 'block';
  
  if (result === 'victory') {
    endTitle.textContent = 'VICTORY!';
    endTitle.style.color = '#22c55e';
  } else {
    endTitle.textContent = '💀 Defeat';
    endTitle.style.color = '#ef4444';
  }
  
  endMessage.textContent = message;
}

// ============= ACTION FUNCTIONS =============

function selectClass(className) {
  console.log('Selecting class:', className);
  
  socket.emit('action', {
    code: lobbyCode,
    data: {
      action: 'selectClass',
      payload: { className }
    }
  });
}

function selectAction(actionId) {
  console.log('Selecting action:', actionId);
  
  socket.emit('action', {
    code: lobbyCode,
    data: {
      action: 'selectAction',
      payload: { actionId }
    }
  });
}

function selectTarget(targetId) {
  console.log('Selecting target:', targetId);
  
  socket.emit('action', {
    code: lobbyCode,
    data: {
      action: 'selectTarget',
      payload: { targetId, actionIndex: currentActionIndex }
    }
  });
}

// ========== SKILL LEARNING FUNCTIONS ==========

function showSkillLearning(data) {
  console.log('[SKILL LEARNING] 📚 showSkillLearning() called');
  console.log('[SKILL LEARNING] Data:', data);
  console.log('[SKILL LEARNING] Skills array:', data.skills);
  console.log('[SKILL LEARNING] Skills length:', data.skills ? data.skills.length : 'undefined');
  
  // Hide other phases
  classSelection.style.display = 'none';
  combatPhase.style.display = 'none';
  gameEnd.style.display = 'none';
  
  // Show skill learning phase
  console.log('[SKILL LEARNING] Setting skillLearning.style.display = block');
  skillLearning.style.display = 'block';
  skillSelected.style.display = 'none';
  
  // Clear previous skills
  skillOptions.innerHTML = '';
  console.log('[SKILL LEARNING] Cleared skillOptions, starting to build buttons');
  
  if (!data.skills || data.skills.length === 0) {
    console.log('[SKILL LEARNING] ❌ No skills provided!');
    skillOptions.innerHTML = '<div style="text-align: center; padding: 40px; color: #fbbf24;">No skills available</div>';
    return;
  }
  
  // Display each skill option
  console.log('[SKILL LEARNING] Building', data.skills.length, 'skill buttons');
  data.skills.forEach((skill, index) => {
    console.log(`[SKILL LEARNING] Building button ${index + 1}:`, skill.name);
    const btn = document.createElement('button');
    btn.className = `action-btn ${skill.type}`;
    
    let content = `<div style="font-size: 1.3em; margin-bottom: 8px; font-weight: bold;">✨ ${skill.name}</div>`;
    
    // Add damage type indicator
    if (skill.damageType) {
      const damageTypeIcon = skill.damageType === 'physical' ? '⚔️' : '✨';
      const damageTypeColor = skill.damageType === 'physical' ? '#ef4444' : '#8b5cf6';
      content += `<div style="font-size: 0.8em; color: ${damageTypeColor}; margin-bottom: 3px;">${damageTypeIcon} ${skill.damageType}</div>`;
    }
    
    // Add hit chance modifier if present
    if (skill.hitChanceModifier && skill.hitChanceModifier !== 0) {
      const modifierSign = skill.hitChanceModifier > 0 ? '+' : '';
      const modifierColor = skill.hitChanceModifier > 0 ? '#22c55e' : '#fbbf24';
      content += `<div style="font-size: 0.75em; color: ${modifierColor}; font-weight: bold; margin-bottom: 3px;">🎯 ${modifierSign}${skill.hitChanceModifier}% hit</div>`;
    }
    
    // Add charge-up indicator
    if (skill.chargeUp) {
      content += `<div style="font-size: 0.75em; color: #fbbf24; font-weight: bold; margin-bottom: 3px;">⏳ Charge-up (1 turn)</div>`;
    }
    
    // Add uses per combat indicator
    if (skill.usesPerCombat) {
      content += `<div style="font-size: 0.75em; color: #8b5cf6; font-weight: bold; margin-bottom: 3px;">🔢 ${skill.usesPerCombat} uses per combat</div>`;
    }
    
    // Add description
    content += `<div style="font-size: 0.9em; opacity: 0.8; margin-top: 5px;">
      ${getActionDescription(skill)}
    </div>`;
    
    btn.innerHTML = content;
    btn.onclick = () => selectSkill(skill.id);
    
    console.log(`[SKILL LEARNING] Appending button ${index + 1} to skillOptions`);
    skillOptions.appendChild(btn);
  });
  
  console.log('[SKILL LEARNING] ✅ All skill buttons created and appended');
  console.log('[SKILL LEARNING] skillOptions.children.length:', skillOptions.children.length);
}

function selectSkill(skillId) {
  console.log('[SKILL LEARNING] Selected skill:', skillId);
  
  // Send selection to server
  socket.emit('action', {
    code: lobbyCode,
    data: {
      action: 'selectSkill',
      payload: { skillId: skillId }
    }
  });
}

function showSkillLearned(skill) {
  console.log('[SKILL LEARNING] Skill learned:', skill);
  
  // Hide skill options
  skillOptions.innerHTML = '';
  
  // Show confirmation
  skillSelected.style.display = 'block';
  learnedSkillName.textContent = skill.name;
}

// ========== TALENT LEARNING FUNCTIONS ==========

function showTalentLearning(data) {
  console.log('[TALENT LEARNING] 🎁 showTalentLearning() called');
  console.log('[TALENT LEARNING] Data:', data);
  console.log('[TALENT LEARNING] Talents array:', data.talents);
  console.log('[TALENT LEARNING] Talents length:', data.talents ? data.talents.length : 'undefined');
  
  // Hide other phases
  classSelection.style.display = 'none';
  combatPhase.style.display = 'none';
  gameEnd.style.display = 'none';
  skillLearning.style.display = 'none';
  
  // Show talent learning phase
  console.log('[TALENT LEARNING] Setting talentLearning.style.display = block');
  talentLearning.style.display = 'block';
  talentSelected.style.display = 'none';
  
  // Clear previous talents
  talentOptions.innerHTML = '';
  console.log('[TALENT LEARNING] Cleared talentOptions, starting to build buttons');
  
  if (!data.talents || data.talents.length === 0) {
    console.log('[TALENT LEARNING] ❌ No talents provided!');
    talentOptions.innerHTML = '<div style="text-align: center; padding: 40px; color: #fbbf24;">No talents available</div>';
    return;
  }
  
  console.log('[TALENT LEARNING] ✅ Building talent buttons...');
  
  data.talents.forEach((talent, index) => {
    console.log(`[TALENT LEARNING] Building button ${index + 1}: ${talent.name}`);
    
    const button = document.createElement('button');
    button.className = 'action-btn';
    button.innerHTML = `
      <div class="action-header">
        <span class="action-icon">${talent.icon || '🎁'}</span>
        <span class="action-name">${talent.name}</span>
      </div>
      <div class="action-desc">${talent.description}</div>
    `;
    
    button.onclick = () => selectTalent(talent.id);
    talentOptions.appendChild(button);
    console.log(`[TALENT LEARNING] ✅ Button created and added for: ${talent.name}`);
  });
  
  console.log(`[TALENT LEARNING] ✅ All ${data.talents.length} talent buttons created`);
}

function selectTalent(talentId) {
  console.log('[TALENT LEARNING] Talent selected:', talentId);
  
  // Send selection to server
  socket.emit('action', {
    code: lobbyCode,
    data: {
      action: 'selectTalent',
      payload: { talentId: talentId }
    }
  });
}

function showTalentLearned(talent) {
  console.log('[TALENT LEARNING] Talent learned:', talent);
  
  // Hide talent options
  talentOptions.innerHTML = '';
  
  // Show confirmation
  talentSelected.style.display = 'block';
  learnedTalentName.textContent = talent.name;
}

// Initialize
console.log('RPG Quest player initialized');
console.log('Socket ID:', socket ? socket.id : 'No socket');
console.log('Lobby code:', lobbyCode);
console.log('Parent socket:', window.parent.socket);

// Request initial game state if we have the socket
if (socket && socket.connected) {
  console.log('Socket connected, waiting for game state...');
  // The server should send gameState on playerJoin
  // Show loading message
  if (classSelection) {
    classSelection.style.display = 'block';
    if (classList) {
      classList.innerHTML = '<div style="text-align:center; padding:40px;">Loading classes...</div>';
    }
  }
} else {
  console.error('Socket not connected!');
  if (classSelection) {
    classSelection.style.display = 'block';
    if (classList) {
      classList.innerHTML = '<div style="text-align:center; padding:40px; color:#ef4444;">Error: Not connected to game server. Please refresh.</div>';
    }
  }
}

// Fallback: If no game state received after 2 seconds, show default classes
setTimeout(() => {
  if (gameState.availableClasses.length === 0) {
    console.log('No game state received, using default classes');
    gameState.availableClasses = ['knight', 'wizard', 'cleric', 'rogue', 'druid', 'warlock', 'monk'];
    renderClassSelection();
  }
}, 2000);


# RPG Game Reconnection System - Deep Analysis & Implementation Plan

## Current System Analysis

### Player Identification System
The system uses **THREE different identifiers** for players:

1. **`player.id`** (socket.id) - Changes on every connection/reconnection
   - Used as the primary key in `lobby.state.players` object
   - Changes whenever socket reconnects
   - **PROBLEM**: Game state is keyed by socket.id, so reconnection creates NEW player entry

2. **`player.userId`** - Persistent MongoDB user ID (for authenticated users)
   - Stored in `disconnectedPlayers` Map during grace period
   - Used in server.js reconnection logic
   - **NOT used** as key in game state

3. **`player.username`** - Display name
   - Persistent across reconnections
   - Could be used for matching, but not currently used as primary key

### Current Reconnection Flow (server.js)

```javascript
// On disconnect (lines 585-644):
1. Player socket disconnects
2. If player has userId, store in disconnectedPlayers Map for 90s grace period
3. Keep player in lobby.players array (don't remove immediately)
4. Emit 'playerDisconnected' with temporary: true

// On reconnect attempt (lines 204-268):
1. Client sends 'reconnect' event with { playerId (userId), lobbyCode }
2. Server checks disconnectedPlayers Map
3. If found, creates restoredPlayer with NEW socket.id
4. Updates lobby.players array with new socket.id
5. Calls game.onPlayerJoin(lobby, api, restoredPlayer)
```

### Critical Problem in RPG Game (games/rpg/server.js)

```javascript
// Line 2532-2548: onPlayerJoin
onPlayerJoin(lobby, api, player) {
  if (!lobby.state.players[player.id]) {  // player.id is NEW socket.id!
    lobby.state.players[player.id] = {    // Creates NEW player entry
      id: player.id,
      username: player.username,
      class: null,
      health: 0,
      // ... all progress LOST
    };
  }
  // ...
}
```

**The Issue**: 
- Game state uses `player.id` (socket.id) as key
- On reconnect, `player.id` is a NEW socket.id
- `lobby.state.players[player.id]` check fails
- Creates brand new player with no class, no items, no progress
- Original character data remains orphaned under old socket.id

### What Should Happen

1. Player disconnects → socket.id changes
2. Player reconnects with same username
3. System finds existing character data by username
4. Updates character's socket.id to new value
5. Sends full game state to reconnected player
6. Player continues with same character/progress

## Implementation Plan

### Phase 1: Change Primary Key from socket.id to username

**Why username?**
- Persistent across reconnections
- Already unique in lobby (enforced by lobby system)
- Human-readable for debugging
- Works for both authenticated and guest users

**Changes Required:**

1. **games/rpg/server.js - Player State Structure**
   ```javascript
   // Instead of: lobby.state.players[player.id]
   // Use: lobby.state.players[player.username]
   
   lobby.state.players[player.username] = {
     id: player.id,           // Keep socket.id for sending messages
     username: player.username,
     userId: player.userId,   // Keep for auth tracking
     // ... rest of state
   };
   ```

2. **Update ALL references** to use username as key:
   - `applyItemEffects(lobby, playerUsername)` instead of playerId
   - `handleClassSelection`, `handleActionSelection`, etc.
   - Combat system target selection
   - Loot distribution
   - Status effect application

3. **Maintain socket.id mapping** for message sending:
   ```javascript
   // Helper function to get player by socket.id
   function getPlayerBySocketId(lobby, socketId) {
     return Object.values(lobby.state.players).find(p => p.id === socketId);
   }
   
   // Helper function to get player by username
   function getPlayerByUsername(lobby, username) {
     return lobby.state.players[username];
   }
   ```

### Phase 2: Implement Reconnection Logic in onPlayerJoin

```javascript
onPlayerJoin(lobby, api, player) {
  const existingPlayer = lobby.state.players[player.username];
  
  if (existingPlayer) {
    // RECONNECTION: Player already exists
    console.log(`[RPG] Player ${player.username} reconnecting...`);
    
    // Update socket.id for message routing
    existingPlayer.id = player.id;
    
    // Clear any stale reconnection flags
    existingPlayer.reconnected = true;
    
    // Send full game state to reconnected player
    sendFullGameState(lobby, api, player);
    
    // Notify other players
    api.sendToAll('playerReconnected', {
      username: player.username,
      message: `${player.username} has reconnected`
    });
    
    // Update host
    updateHostWithPlayerList(lobby, api);
    
  } else {
    // NEW PLAYER: First time joining
    console.log(`[RPG] New player ${player.username} joining...`);
    
    lobby.state.players[player.username] = {
      id: player.id,
      username: player.username,
      userId: player.userId,
      class: null,
      health: 0,
      maxHealth: 0,
      defense: 0,
      actions: [],
      items: [],
      learnedSkills: [],
      learnedTalents: [],
      statusEffects: [],
      abilityUses: {},
      itemEffects: {}
    };
    
    // Initialize item effects
    applyItemEffects(lobby, player.username);
    
    // Send initial game state
    sendFullGameState(lobby, api, player);
  }
}
```

### Phase 3: Comprehensive Game State Sync

```javascript
function sendFullGameState(lobby, api, player) {
  const playerData = lobby.state.players[player.username];
  const classData = playerData.class ? CLASSES[playerData.class] : null;
  
  const payload = {
    phase: lobby.state.phase,
    playerData: {
      ...playerData,
      baseHealth: classData ? classData.baseHealth : 0,
      baseDefense: classData ? classData.baseDefense : 0
    },
    availableClasses: Object.keys(CLASSES),
    selectedClasses: lobby.state.selectedClasses
  };
  
  // Add phase-specific data
  if (lobby.state.phase === 'combat' && lobby.state.combat) {
    payload.combat = {
      enemies: lobby.state.combat.enemies.map(e => ({
        id: e.id,
        name: e.name,
        health: e.currentHealth,
        maxHealth: e.maxHealth,
        defense: e.currentDefense
      })),
      round: lobby.state.round,
      encounterType: lobby.state.combat.encounterType
    };
    
    // If player had pending actions, restore them
    const pending = lobby.state.combat.pendingActions[player.username];
    if (pending) {
      payload.pendingActions = pending;
    }
  }
  
  if (lobby.state.phase === 'camp' && lobby.state.camp) {
    payload.camp = {
      round: lobby.state.camp.round,
      maxRounds: lobby.state.camp.maxRounds
    };
  }
  
  if (lobby.state.phase === 'skill_learning' && lobby.state.skillLearning) {
    payload.skillLearning = {
      availableSkills: lobby.state.skillLearning.availableSkills[player.username]
    };
  }
  
  if (lobby.state.phase === 'talent_learning' && lobby.state.talentLearning) {
    payload.talentLearning = {
      availableTalents: lobby.state.talentLearning.availableTalents[player.username]
    };
  }
  
  if (lobby.state.phase === 'loot' && lobby.state.loot) {
    payload.loot = {
      currentItem: lobby.state.loot.items[lobby.state.loot.currentItemIndex],
      currentItemIndex: lobby.state.loot.currentItemIndex,
      totalItems: lobby.state.loot.items.length
    };
  }
  
  api.sendToPlayer(player.id, 'gameState', payload);
  
  // Send combat-specific updates if in combat
  if (lobby.state.phase === 'combat' && lobby.state.combat) {
    // If it's player's turn, resend action options
    const turnPlayer = lobby.state.combat.turnOrder[lobby.state.combat.currentTurnIndex];
    if (turnPlayer && turnPlayer.username === player.username) {
      // Regenerate action options for this player
      const pending = lobby.state.combat.pendingActions[player.username];
      if (pending && pending.actions.length < pending.totalActions) {
        showNextActionOptions(lobby, api, player);
      }
    }
  }
}
```

### Phase 4: Update Combat System

**Key areas to update:**

1. **pendingActions** - Change key from player.id to player.username
   ```javascript
   // OLD: lobby.state.combat.pendingActions[player.id]
   // NEW: lobby.state.combat.pendingActions[player.username]
   ```

2. **Turn order** - Store username instead of id
   ```javascript
   // In rollInitiative():
   turnOrder.push({
     username: player.username,
     id: player.id,  // Keep for message routing
     initiative: roll
   });
   ```

3. **Target selection** - Use username for player targets
   ```javascript
   // When targeting allies:
   if (action.target === 'ally') {
     targets.push(lobby.state.players[targetUsername]);
   }
   ```

### Phase 5: Update All Handler Functions

**Pattern to follow:**
```javascript
// OLD:
function handleActionSelection(lobby, api, player, payload) {
  const playerData = lobby.state.players[player.id];
  // ...
}

// NEW:
function handleActionSelection(lobby, api, player, payload) {
  const playerData = lobby.state.players[player.username];
  if (!playerData) {
    console.error(`[RPG] Player ${player.username} not found in state`);
    return;
  }
  // ...
}
```

**Functions to update:**
- `handleClassSelection`
- `handleActionSelection`
- `handleTargetSelection`
- `handleCampActionSelection`
- `handleSkillSelection`
- `handleTalentSelection`
- `handleLootRoll`
- `handleLootPass`
- `applyItemEffects`
- `startCombatPhase`
- `resolveCombatRound`
- `executePlayerAction`
- All status effect functions

### Phase 6: Client-Side Reconnection Support

**games/rpg/client/player.js:**
```javascript
// On disconnect, store state
socket.on('disconnect', () => {
  console.log('[RPG] Disconnected from server, attempting reconnect...');
  // Client will auto-reconnect via parent window socket
});

// Handle reconnection
socket.on('reconnect', () => {
  console.log('[RPG] Reconnected to server');
  // Parent window will handle sending reconnect event
  // Game state will be sent via 'gameState' event
});

// Ensure we can handle full game state updates
socket.on('gameState', (data) => {
  console.log('[RPG] Received game state:', data.phase);
  
  // Update all UI based on phase
  updateUIForPhase(data.phase, data);
  
  // Restore player data
  if (data.playerData) {
    updatePlayerData(data.playerData);
  }
  
  // Restore combat state if in combat
  if (data.combat) {
    updateCombatUI(data.combat);
  }
  
  // etc...
});
```

### Phase 7: Testing Checklist

1. **Class Selection Phase**
   - [ ] Disconnect before selecting class → reconnect → can select class
   - [ ] Select class → disconnect → reconnect → class still selected
   - [ ] All players select → disconnect one → reconnect → game starts correctly

2. **Combat Phase**
   - [ ] Disconnect during action selection → reconnect → can select action
   - [ ] Select action → disconnect → reconnect → action still queued
   - [ ] Disconnect during enemy turn → reconnect → see correct game state
   - [ ] Multi-action: select first action → disconnect → reconnect → can select second action

3. **Camp Phase**
   - [ ] Disconnect during camp → reconnect → can select camp action
   - [ ] Select camp action → disconnect → reconnect → action still queued

4. **Skill Learning Phase**
   - [ ] Disconnect during skill selection → reconnect → see skill options
   - [ ] Select skill → disconnect → reconnect → skill still learned

5. **Loot Phase**
   - [ ] Disconnect during loot → reconnect → see current loot item
   - [ ] Roll for loot → disconnect → reconnect → roll still counted

6. **Edge Cases**
   - [ ] Multiple players disconnect and reconnect in different orders
   - [ ] Player disconnects, grace period expires, then tries to reconnect (should fail gracefully)
   - [ ] Player disconnects and different player with same username tries to join (should reject)
   - [ ] Host disconnects (lobby closes - expected behavior)

### Phase 8: Migration Strategy

**To avoid breaking existing games:**

1. Add username-based lookup alongside existing id-based lookup
2. Gradually migrate functions one at a time
3. Keep both working until all functions updated
4. Remove id-based lookup last

**Helper functions for migration:**
```javascript
// Temporary compatibility layer
function getPlayerData(lobby, playerIdOrUsername) {
  // Try username first
  if (lobby.state.players[playerIdOrUsername]) {
    return lobby.state.players[playerIdOrUsername];
  }
  
  // Fallback to id (for backwards compatibility during migration)
  return Object.values(lobby.state.players).find(p => p.id === playerIdOrUsername);
}
```

## Summary of Changes

### Files to Modify:
1. **games/rpg/server.js** (main changes)
   - onPlayerJoin function
   - All handler functions (15+ functions)
   - Combat system (5+ functions)
   - Helper functions (10+ functions)

2. **games/rpg/client/player.js**
   - Add reconnection state handling
   - Add full game state update handler
   - Improve UI state restoration

3. **games/rpg/client/host-scene.js** (minor)
   - Ensure host UI updates correctly on reconnection

### Estimated Changes:
- ~50-70 function updates
- ~200-300 lines of new code
- ~100-150 lines of refactored code

### Risk Assessment:
- **High Risk**: Combat system (complex state management)
- **Medium Risk**: Loot/skill/talent systems (simpler state)
- **Low Risk**: Class selection (simple state)

### Recommended Approach:
1. Start with Phase 1 (change to username keys)
2. Test thoroughly after each phase
3. Use feature flag to enable/disable new reconnection logic during testing
4. Deploy to staging environment first
5. Monitor for issues before production deployment


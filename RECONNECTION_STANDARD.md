# Standardized Reconnection System Documentation

## Overview

The GAMEPAD platform now includes a **system-level reconnection handler** that standardizes player reconnection across all games. This eliminates the need for each game to implement custom reconnection logic, providing a consistent and seamless reconnection experience.

## Core Principles

### 1. Persistent Player Identification

**Username is the primary key** for player state across reconnections. Socket IDs change on every reconnection, but usernames remain constant.

```javascript
// ❌ BAD: Using socket.id as key
lobby.state.players[player.id] = { ... }

// ✅ GOOD: Using username as key
lobby.state.players[player.username] = {
  id: player.id,        // Current socket.id (for message routing)
  username: player.username,  // Persistent identifier
  // ... game state
}
```

### 2. System-Level Detection

The system automatically detects reconnections before calling game callbacks. Games don't need to implement detection logic.

### 3. Standardized Callbacks

Games implement standardized callbacks for reconnection handling:
- `onPlayerJoin(lobby, api, player, isReconnection)` - Called for both new joins and reconnections
- `onPlayerReconnect(lobby, api, player, previousSocketId)` - Optional, called specifically for reconnections

## Player Identity Utilities

The `utils/PlayerIdentity.js` module provides standardized player management:

```javascript
const PlayerIdentity = require('./utils/PlayerIdentity');

// Get player by username (recommended)
const player = PlayerIdentity.getPlayerByUsername(lobby, username);

// Get player by socket ID (for backward compatibility)
const player = PlayerIdentity.getPlayerBySocketId(lobby, socketId);

// Check if a player object indicates reconnection
const isReconnect = PlayerIdentity.isReconnection(player);

// Update player's socket ID
PlayerIdentity.updatePlayerSocketId(lobby, username, newSocketId);

// Create standardized player object
const player = PlayerIdentity.createPlayer({
  id: socket.id,
  username: username,
  userId: userId
});
```

## Enhanced API for Games

The `makeApi()` function now includes reconnection helpers:

```javascript
const api = makeApi(io, lobby);

// Get player by username
const player = api.getPlayerByUsername(username);

// Get player by socket ID
const player = api.getPlayerBySocketId(socketId);

// Check if reconnection
const isReconnect = api.isReconnection(player);

// Update socket ID
api.updatePlayerSocketId(username, newSocketId);

// Get all players
const allPlayers = api.getAllPlayers();
```

## Game Module Interface

### Standard Callbacks

```javascript
module.exports = {
  meta: {
    id: 'mygame',
    name: 'My Game',
    minPlayers: 2,
    maxPlayers: 8
  },
  
  onInit(lobby, api) {
    // Initialize game state
    lobby.state = {
      players: {},  // Use username as key!
      // ... other state
    };
  },
  
  onPlayerJoin(lobby, api, player, isReconnection = false) {
    if (isReconnection) {
      // System detected reconnection - should call onPlayerReconnect
      return this.onPlayerReconnect(lobby, api, player, player.previousSocketId);
    }
    
    // NEW PLAYER: Create player state using username as key
    lobby.state.players[player.username] = {
      id: player.id,           // Current socket.id (for message routing)
      username: player.username,  // Persistent identifier
      // ... game-specific state
    };
    
    // Send initial game state
    api.sendToPlayer(player.id, 'gameState', { ... });
  },
  
  onPlayerReconnect(lobby, api, player, previousSocketId) {
    // RECONNECTION: Player already exists in game state
    const existingPlayer = lobby.state.players[player.username];
    if (!existingPlayer) {
      // Player not found - treat as new join
      return this.onPlayerJoin(lobby, api, player, false);
    }
    
    // Update socket.id for message routing
    existingPlayer.id = player.id;
    
    // Send full game state to reconnected player
    api.sendToPlayer(player.id, 'gameState', {
      // ... complete game state
    });
    
    // Notify other players
    api.sendToAll('playerReconnected', {
      username: player.username,
      message: `${player.username} has reconnected`
    });
  },
  
  onPlayerLeave(lobby, api, player) {
    // Player disconnected - use username to remove
    delete lobby.state.players[player.username];
    // ... cleanup
  },
  
  onAction(lobby, api, player, data) {
    // Handle player actions - player.username is always available
    const playerState = lobby.state.players[player.username];
    // ... handle action
  },
  
  onEnd(lobby, api) {
    // Cleanup when game ends
    lobby.state = null;
  }
};
```

## Reconnection Flow

### 1. Player Disconnects

```
1. Socket disconnects
2. System marks player as disconnected (doesn't remove immediately)
3. Starts 90-second grace period (for authenticated users)
4. Calls game.onPlayerLeave() if implemented
5. Emits 'playerDisconnected' event with temporary: true
```

### 2. Player Reconnects

```
1. Player joins with same username
2. System checks if username exists in lobby.players
3. If exists: RECONNECTION DETECTED
   - Updates player's socket.id
   - Calls game.onPlayerReconnect() if implemented
   - Otherwise calls game.onPlayerJoin() with isReconnection=true
   - Emits 'playerReconnected' event
4. If not exists: NEW PLAYER JOIN
   - Creates new player entry
   - Calls game.onPlayerJoin() with isReconnection=false
```

### 3. Grace Period Expires

```
1. 90 seconds pass without reconnection
2. System permanently removes player
3. Emits 'playerPermanentlyDisconnected' event
4. Removes from lobby.players array
```

## Migration Guide

### Step 1: Update Player State Structure

Change from socket.id keys to username keys:

```javascript
// Before
lobby.state.players[player.id] = {
  id: player.id,
  // ...
};

// After
lobby.state.players[player.username] = {
  id: player.id,           // Keep for message routing
  username: player.username, // Persistent identifier
  // ...
};
```

### Step 2: Update onPlayerJoin

```javascript
// Before
onPlayerJoin(lobby, api, player) {
  if (!lobby.state.players[player.id]) {
    lobby.state.players[player.id] = { ... };
  }
}

// After
onPlayerJoin(lobby, api, player, isReconnection = false) {
  if (isReconnection) {
    return this.onPlayerReconnect(lobby, api, player, player.previousSocketId);
  }
  
  // Check if player already exists (safety check)
  if (lobby.state.players[player.username]) {
    return this.onPlayerReconnect(lobby, api, player, null);
  }
  
  // Create new player entry
  lobby.state.players[player.username] = {
    id: player.id,
    username: player.username,
    // ...
  };
}
```

### Step 3: Implement onPlayerReconnect (Optional but Recommended)

```javascript
onPlayerReconnect(lobby, api, player, previousSocketId) {
  const existingPlayer = lobby.state.players[player.username];
  if (!existingPlayer) {
    // Not found - treat as new join
    return this.onPlayerJoin(lobby, api, player, false);
  }
  
  // Update socket.id
  existingPlayer.id = player.id;
  
  // Send full game state
  api.sendToPlayer(player.id, 'gameState', {
    // ... complete state
  });
  
  // Notify others
  api.sendToAll('playerReconnected', {
    username: player.username,
    message: `${player.username} has reconnected`
  });
}
```

### Step 4: Update All References

Find and replace all references to `player.id` as a key with `player.username`:

```javascript
// Before
const playerState = lobby.state.players[player.id];

// After
const playerState = lobby.state.players[player.username];
```

Keep `player.id` only for:
- Message routing: `api.sendToPlayer(player.id, ...)`
- Temporary references within the same function
- Display purposes

### Step 5: Update onAction Handler

```javascript
// Before
onAction(lobby, api, player, data) {
  const playerState = lobby.state.players[player.id];
  // ...
}

// After
onAction(lobby, api, player, data) {
  const playerState = lobby.state.players[player.username];
  if (!playerState) {
    console.error(`Player ${player.username} not found in game state`);
    return;
  }
  // ...
}
```

## Best Practices

### 1. Always Use Username as Key

```javascript
// ✅ GOOD
lobby.state.players[player.username] = { ... };
const playerState = lobby.state.players[player.username];

// ❌ BAD
lobby.state.players[player.id] = { ... };
```

### 2. Store Socket.id for Message Routing

```javascript
// ✅ GOOD
lobby.state.players[player.username] = {
  id: player.id,        // For api.sendToPlayer()
  username: player.username,
  // ... game state
};

// Send message using socket.id
api.sendToPlayer(playerState.id, 'gameState', { ... });
```

### 3. Handle Reconnection Gracefully

```javascript
// ✅ GOOD
onPlayerReconnect(lobby, api, player, previousSocketId) {
  const existingPlayer = lobby.state.players[player.username];
  if (!existingPlayer) {
    // Fallback to new join
    return this.onPlayerJoin(lobby, api, player, false);
  }
  
  // Update and send state
  existingPlayer.id = player.id;
  api.sendToPlayer(player.id, 'gameState', { ... });
}
```

### 4. Check for Player Existence

```javascript
// ✅ GOOD
onAction(lobby, api, player, data) {
  const playerState = lobby.state.players[player.username];
  if (!playerState) {
    console.error(`Player ${player.username} not found`);
    return;
  }
  // ... handle action
}
```

### 5. Update Socket IDs on Reconnection

```javascript
// ✅ GOOD
onPlayerReconnect(lobby, api, player, previousSocketId) {
  const existingPlayer = lobby.state.players[player.username];
  existingPlayer.id = player.id;  // Update for message routing
  
  // Also update any nested references
  if (lobby.state.combat && lobby.state.combat.fighters[player.username]) {
    lobby.state.combat.fighters[player.username].id = player.id;
  }
}
```

## Backward Compatibility

The system maintains backward compatibility with existing games:

1. **Games without `onPlayerReconnect`**: System calls `onPlayerJoin()` with `isReconnection=true`
2. **Games with old `onPlayerJoin` signature**: System detects function length and calls appropriately
3. **Socket.id based games**: Still work, but won't handle reconnection properly

## Testing Checklist

### Reconnection Tests

- [ ] Player disconnects during game
- [ ] Player reconnects within grace period
- [ ] Player state is restored correctly
- [ ] Socket.id is updated in game state
- [ ] Full game state is sent to reconnected player
- [ ] Other players are notified of reconnection
- [ ] Player can continue playing after reconnection

### Edge Cases

- [ ] Multiple players disconnect and reconnect
- [ ] Player reconnects with different socket but same username
- [ ] Player tries to reconnect after grace period expires
- [ ] Host disconnects (should close lobby)
- [ ] All players disconnect (should keep lobby open for reconnection)

## Examples

See the following games for reference implementations:
- `games/rpg/server.js` - Full reconnection support with username-based keys
- `games/fighter/server.js` - Migrated from socket.id to username keys
- `games/cambio/server.js` - Updated to use username keys

## Support

For questions or issues with the reconnection system, refer to:
- This documentation
- `utils/PlayerIdentity.js` - Player management utilities
- `server.js` - System-level reconnection handler implementation


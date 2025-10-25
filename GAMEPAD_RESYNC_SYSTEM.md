# GAMEPAD System-Level Player Resync

## Overview

Implemented a system-level player reconnection feature that allows players to rejoin in-progress games after accidentally closing their browser window or disconnecting.

---

## System Architecture

### 1. Main Server (`server.js`)

**New Logic in `joinLobby` Event:**

When a player joins a lobby, the system now checks:
1. Is there a game in progress? (`lobby.gameId && lobby.gameStarted`)
2. Does the game implement `playerResync`?
3. Does the player exist in the game state?

If all conditions are met, the player is reconnected instead of being added as a new player.

```javascript
// Check if a game is in progress and this player is reconnecting
if (lobby.gameId && lobby.gameStarted) {
  const game = gameLoader.getGame(lobby.gameId);
  if (game && typeof game.playerResync === 'function') {
    const reconnected = game.playerResync(lobby, api, player);
    
    if (reconnected) {
      // Player successfully reconnected
      callback?.({ ..., reconnected: true });
      return;
    }
  }
}
```

---

### 2. Game Module Interface (`utils/DynamicGameLoader.js`)

**New Method: `playerResync`**

Added to the game module wrapper alongside existing methods:
- `onInit`
- `onPlayerJoin`
- `onAction`
- `onEnd`
- **`playerResync`** ← NEW

```javascript
playerResync: (lobby, api, player) => {
  try {
    if (typeof gameModule.playerResync === 'function') {
      return gameModule.playerResync(lobby, api, player);
    }
    // If game doesn't implement playerResync, return false
    return false;
  } catch (error) {
    console.error(`[Game:${gameData.id}] playerResync error:`, error);
    return false;
  }
}
```

**Return Value:**
- `true` = Player was found and successfully reconnected
- `false` = Player not found, treat as new player

---

### 3. RPG Game Implementation (`games/rpg/server.js`)

**Implemented `playerResync` Function:**

```javascript
playerResync(lobby, api, player) {
  // Check if this player exists in the game state by username
  const existingPlayer = lobby.state.players[player.username];
  
  if (!existingPlayer) {
    return false; // Player not found
  }
  
  // Update socket.id for message routing
  existingPlayer.id = player.id;
  existingPlayer.userId = player.userId;
  
  // Send full game state to reconnected player
  sendFullGameState(lobby, api, player);
  
  // Notify other players
  api.sendToAll('playerReconnected', {
    username: player.username,
    message: `${player.username} has reconnected`
  });
  
  return true; // Successfully reconnected
}
```

---

## How It Works

### Scenario: Player Accidentally Closes Browser

1. **Player is in game** (e.g., Round 3 of combat)
2. **Player closes browser tab** accidentally
3. **Player reopens browser** and navigates back to game
4. **Player enters lobby code** and username
5. **System detects:**
   - Game is in progress (`lobby.gameStarted = true`)
   - Game has `playerResync` function
6. **System calls `game.playerResync()`**
7. **Game checks:** Does player exist by username?
8. **If yes:**
   - Updates socket.id to new connection
   - Sends full game state
   - Player continues where they left off
9. **If no:**
   - Treats as new player (normal join flow)

---

## Benefits

### 1. **Seamless Recovery**
- Players don't lose progress if they accidentally close the window
- No need to restart the entire game

### 2. **Game-Specific Logic**
- Each game can implement reconnection differently
- Games that don't support mid-game join can return `false`

### 3. **Backwards Compatible**
- Games without `playerResync` continue to work normally
- Optional feature, not required

### 4. **Username-Based**
- Uses username as identifier (not socket.id)
- Works across different devices/browsers

---

## RPG-Specific: 30-Second Action Timer

### Feature

Players now have **30 seconds** to select their combat actions each round.

### Implementation

**Timer Start:**
- Timer starts when action options are sent to player
- One timer per player per round

**Timer Expiry:**
- If player doesn't select actions within 30 seconds
- Automatically fills remaining actions with "Pass"
- Notifies player: "Time expired! Your turn has been passed."
- Triggers round resolution if all players are done

**Timer Clear:**
- Cleared when player completes all action selections
- Cleared when new round starts

### Functions Added

```javascript
function startActionTimer(lobby, api, player) {
  // Sets 30-second timeout
  // On expiry: fills pending actions with "pass"
}

function clearActionTimer(lobby, username) {
  // Clears timeout for specific player
}
```

### Logging

```
[TIMER] Starting 30-second action timer for PlayerName
[TIMER] Action timer expired for PlayerName
[TIMER] Player PlayerName timed out, passing their turn
[TIMER] Cleared action timer for PlayerName
```

---

## Testing

### Test 1: Accidental Browser Close
1. Start RPG game, enter combat
2. Close browser tab
3. Reopen browser, enter lobby code + username
4. **Expected:** Reconnect to game, see current combat state

### Test 2: Mid-Action Disconnect
1. Start combat, action options appear
2. Close browser before selecting
3. Rejoin within 30 seconds
4. **Expected:** See action options again, can select

### Test 3: Action Timer
1. Start combat, get action options
2. Wait 30 seconds without selecting
3. **Expected:** Turn automatically passes, round continues

### Test 4: Different Username
1. Start game as "Player1"
2. Close browser
3. Rejoin as "Player2"
4. **Expected:** Treated as new player (not reconnected)

### Test 5: Game Without Resync
1. Create a game that doesn't implement `playerResync`
2. Start game, disconnect
3. Try to rejoin
4. **Expected:** Treated as new player

---

## Files Modified

### 1. `server.js`
- Added reconnection check in `joinLobby` event
- Calls `game.playerResync()` if game is in progress
- Returns `reconnected: true/false` in callback

### 2. `utils/DynamicGameLoader.js`
- Added `playerResync` to game module wrapper
- Error handling for games without implementation

### 3. `games/rpg/server.js`
- Implemented `playerResync` function
- Added `startActionTimer` function
- Added `clearActionTimer` function
- Modified `rollInitiative` to start timers
- Modified `handleTargetSelection` to clear timers
- Added timer initialization in combat state

---

## API Reference

### Game Module Interface

```javascript
module.exports = {
  meta: { ... },
  
  onInit(lobby, api) { ... },
  
  onPlayerJoin(lobby, api, player) { ... },
  
  onAction(lobby, api, player, data) { ... },
  
  onEnd(lobby, api) { ... },
  
  // NEW: Optional reconnection handler
  playerResync(lobby, api, player) {
    // Check if player exists in game state
    // Update player's socket.id
    // Send game state to player
    // Return true if reconnected, false otherwise
    return true/false;
  }
};
```

### Parameters

**`lobby`**: Lobby object with game state
**`api`**: API object for sending messages
**`player`**: Player object with:
- `id`: New socket.id
- `username`: Player's username
- `userId`: User's database ID (if logged in)

### Return Value

- **`true`**: Player was found and reconnected
- **`false`**: Player not found, treat as new player

---

## Future Enhancements

### Potential Improvements:

1. **Grace Period Display**
   - Show countdown timer on player screen
   - Visual indicator of time remaining

2. **Reconnection Token**
   - Generate unique token for each player
   - More secure than username-based

3. **Spectator Mode**
   - Allow disconnected players to spectate
   - Option to rejoin next round

4. **Auto-Reconnect**
   - Detect disconnect and auto-reconnect
   - No need to manually rejoin

5. **Configurable Timer**
   - Let host set action timer duration
   - Different timers for different phases

---

## Summary

The GAMEPAD system now supports game-level player reconnection:
- ✅ Players can rejoin in-progress games
- ✅ Username-based identification
- ✅ Game-specific reconnection logic
- ✅ Backwards compatible
- ✅ RPG game implements full support
- ✅ 30-second action timer in RPG combat

This makes the platform more resilient to accidental disconnections and provides a better user experience.


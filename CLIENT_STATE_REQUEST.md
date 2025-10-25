# Client-Side State Request System

## Overview

Implemented a pull-based reconnection system where clients actively request state information from the server when reconnecting, rather than relying solely on server push.

## Problem Solved

**Before:** If a player disconnected during the exact moment when action options were being sent (e.g., during `rollInitiative`), they would miss the message and have no way to get their action options.

**After:** When reconnecting, the client automatically requests the current state for the active phase, ensuring they receive all necessary information even if they missed the initial broadcast.

---

## How It Works

### Client-Side (player.js)

When the client receives a `gameState` event (during reconnection or join), it:

1. **Detects the current phase** (combat, camp, skills, talents, loot)
2. **Switches to the appropriate UI** (hides lobby, shows game)
3. **Requests phase-specific state** from the server

#### Combat Phase
```javascript
if (data.phase === 'combat' && data.combat) {
  // Request action options after 500ms delay
  socket.emit('action', {
    code: lobbyCode,
    data: {
      action: 'requestActionOptions'
    }
  });
}
```

#### Camp Phase
```javascript
if (data.phase === 'camp' && data.camp) {
  // Request camp options
  socket.emit('action', {
    code: lobbyCode,
    data: {
      action: 'requestCampOptions'
    }
  });
}
```

#### Other Phases
- **Skills/Talents/Loot:** Data is already included in the `gameState` payload, so the client just displays it directly

---

### Server-Side (server.js)

Added two new action handlers:

#### 1. `handleRequestActionOptions`

**Purpose:** Send action options to a reconnecting player during combat

**Checks:**
- ✅ Is the game in combat phase?
- ✅ Is the player alive and has a class?
- ✅ Is combat in the "selecting" phase (not "resolving")?
- ✅ Has the player already selected all their actions?

**Behavior:**
- If player has **no pending actions** → Send initial action options (3 random actions)
- If player has **partial actions** → Send next action options via `showNextActionOptions`
- If player has **all actions selected** → Do nothing (already done)

**Logging:**
```
[REQUEST] Player [username] requesting action options
[REQUEST] Sending initial action options to [username]
[REQUEST] Sent 3 action options to [username]
```

---

#### 2. `handleRequestCampOptions`

**Purpose:** Send camp action options to a reconnecting player during camp phase

**Checks:**
- ✅ Is the game in camp phase?
- ✅ Has the player already selected a camp action?

**Behavior:**
- Sends the current round's 3 camp action options
- Uses the stored `lobby.state.camp.currentActions`

**Logging:**
```
[REQUEST] Player [username] requesting camp options
[REQUEST] Sent 3 camp options to [username]
```

---

## Technical Details

### State Storage

**Camp Actions:**
- Modified `startCampRound` to store current actions:
  ```javascript
  lobby.state.camp.currentActions = selectedActions;
  ```
- This allows reconnecting players to get the same actions other players are seeing

**Combat Actions:**
- Already stored in `lobby.state.combat.playerActionOptions[username]`
- Used by `handleRequestActionOptions` to maintain consistency

---

### Timing

**500ms Delay:**
- Client waits 500ms before requesting state
- Ensures the `gameState` has been fully processed
- Prevents race conditions

---

## Benefits

### 1. **Resilient to Timing Issues**
- Players can reconnect at any point during action selection
- No longer dependent on catching the initial broadcast

### 2. **Idempotent**
- Safe to call multiple times
- Server checks if player already has what they need
- No duplicate actions or state corruption

### 3. **Phase-Aware**
- Only requests relevant state for current phase
- Doesn't spam unnecessary requests

### 4. **Graceful Degradation**
- If request fails, server logs it but doesn't crash
- Player can try again by refreshing

---

## Usage Scenarios

### Scenario 1: Disconnect During Initiative Roll
1. Round starts, server calls `rollInitiative`
2. Player disconnects **during** the broadcast
3. Player misses the `actionOptions` event
4. Player reconnects
5. Client receives `gameState` with `phase: 'combat'`
6. Client requests action options
7. Server sends action options
8. ✅ Player can now select actions

---

### Scenario 2: Disconnect Between Rounds
1. Round 1 completes
2. Player disconnects
3. Round 2 starts (player misses initiative roll)
4. Player reconnects
5. Client requests action options
6. Server checks: combat is in "selecting" phase
7. Server sends fresh action options
8. ✅ Player can participate in Round 2

---

### Scenario 3: Disconnect During Multi-Action Selection
1. Player has 2 actions to select
2. Player selects first action
3. Player disconnects
4. Player reconnects
5. Client requests action options
6. Server detects: player has 1/2 actions selected
7. Server calls `showNextActionOptions`
8. ✅ Player can select their second action

---

### Scenario 4: Join In-Progress Game
1. Game is already in Round 3 of combat
2. New player joins via lobby code
3. Client receives `gameState` with combat data
4. Client requests action options
5. Server sends action options for current round
6. ✅ New player can participate immediately

---

## Error Handling

### Client-Side
- Requests are wrapped in `setTimeout` to avoid blocking
- Logs all requests for debugging
- Continues to work even if request fails

### Server-Side
- Validates all preconditions before sending
- Logs why requests are rejected
- Never crashes on invalid requests

**Example Rejection Logs:**
```
[REQUEST] Not in combat phase, ignoring request
[REQUEST] Player is dead or has no class
[REQUEST] Combat is in resolving phase, not selecting
[REQUEST] Player has already selected all actions
```

---

## Testing

### Test 1: Disconnect During Initiative
1. Start combat
2. Disconnect **immediately** after round starts
3. Reconnect
4. **Expected:** Action options appear

### Test 2: Disconnect Between Rounds
1. Complete Round 1
2. Disconnect
3. Wait for Round 2 to start
4. Reconnect
5. **Expected:** Action options appear

### Test 3: Multi-Action Disconnect
1. Get item with `grantAdditionalActions`
2. Select first action
3. Disconnect
4. Reconnect
5. **Expected:** Second action options appear

### Test 4: Camp Phase Disconnect
1. Enter camp phase
2. Disconnect
3. Reconnect
4. **Expected:** Camp action options appear

---

## Future Enhancements

### Potential Improvements:
1. **Retry Logic:** Auto-retry if request fails
2. **Loading State:** Show "Loading..." while waiting for response
3. **Timeout:** Alert player if request takes too long
4. **Batch Requests:** Request multiple states at once
5. **State Versioning:** Detect stale state and refresh

---

## Files Modified

### Client (`games/rpg/client/player.js`)
- Enhanced `gameState` event handler
- Added state request logic for each phase
- Added 500ms delay before requests

### Server (`games/rpg/server.js`)
- Added `handleRequestActionOptions` function (100 lines)
- Added `handleRequestCampOptions` function (45 lines)
- Added action handlers in `onAction` switch
- Modified `startCampRound` to store `currentActions`

---

## Logging

### Client Console:
```
[CLIENT] Reconnected to combat - requesting current state
[CLIENT] Requesting action options from server
```

### Server Console:
```
[REQUEST] Player TestPlayer requesting action options
[REQUEST] Sending initial action options to TestPlayer
[REQUEST] Sent 3 action options to TestPlayer
```

---

## Summary

This pull-based system ensures that reconnecting players **always** get the state they need, regardless of when they disconnect or reconnect. It's resilient, idempotent, and phase-aware, making the reconnection experience seamless.

**Key Principle:** Don't rely on catching broadcasts. Instead, actively request what you need when you need it.


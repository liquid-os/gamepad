# Reconnection Debug Guide

## Issue: Action Options Not Appearing After Reconnect on Next Round

I've added comprehensive logging to help diagnose the issue. Here's what to look for:

---

## How to Test

1. **Start a game** and enter combat
2. **Complete Round 1** (all players select actions)
3. **Disconnect** your player device
4. **Wait for Round 2** to start
5. **Reconnect** within 90 seconds
6. **Check logs** (see below)
7. **Wait for Round 3** to start
8. **Check if action options appear**

---

## Server Console Logs to Watch For

### When You Reconnect:
```
[RPG] Player [username] reconnecting (old socket: [old-id], new socket: [new-id])
[RECONNECT] Sending full game state to [username]
[RECONNECT] Phase: combat
[RPG] Full game state sent to [username] (phase: combat)
[RPG] Player [username] successfully reconnected with character data intact
```

**✅ Good:** Socket ID is updated
**❌ Bad:** If you don't see these logs, reconnection isn't working

---

### When Next Round Starts (Round 3):
```
[INITIATIVE] Sending action options to 2 players
[INITIATIVE] Checking player [username]: health=100, class=warrior, socketId=[socket-id]
[INITIATIVE] Sending 3 action options to [username] (socket: [socket-id])
[INITIATIVE] Action options sent to [username]
[INITIATIVE] Finished sending action options to all players
```

**✅ Good:** Your username appears in the list with correct socket ID
**❌ Bad:** If your username is missing or has wrong socket ID

**Key Things to Check:**
1. Is your player in the list?
2. Does the socket ID match your new socket ID from reconnection?
3. Does it say "Sending 3 action options"?
4. Does it say "Action options sent"?

---

### If Player is Skipped:
```
[INITIATIVE] Skipping [username]: health=0, class=warrior
```

**Possible Causes:**
- Player health is 0 (dead)
- Player has no class assigned
- Player object is corrupted

---

## Browser Console Logs to Watch For

### When You Reconnect:
```
Game state received: { phase: 'combat', playerData: {...}, combat: {...} }
Reconnected to combat phase
```

**✅ Good:** You receive game state with combat data
**❌ Bad:** If you don't see this, client isn't receiving reconnection data

---

### When Next Round Starts:
```
[CLIENT] Action options received: { actions: [...], yourTurn: 0, selectedActionIds: [] }
[CLIENT] Number of actions: 3
[CLIENT] Current phase: combat
[CLIENT] Action selection UI shown
```

**✅ Good:** Client receives and displays action options
**❌ Bad:** If you don't see these logs, action options aren't reaching client

---

## Diagnostic Scenarios

### Scenario 1: Server Logs Show Actions Sent, But Client Doesn't Receive
**Symptom:**
- Server: `[INITIATIVE] Action options sent to [username]`
- Client: No `[CLIENT] Action options received` log

**Possible Causes:**
1. Socket ID mismatch (server sending to old socket)
2. Socket connection not fully established
3. Client socket listener not registered

**Solution:**
- Check if socket IDs match in server logs
- Try adding a small delay before sending (500ms)

---

### Scenario 2: Server Skips Player
**Symptom:**
- Server: `[INITIATIVE] Skipping [username]: health=0, class=warrior`

**Possible Causes:**
1. Player health was set to 0 somehow
2. Player class was cleared

**Solution:**
- Check player data in `sendFullGameState`
- Verify health and class are preserved

---

### Scenario 3: Player Not in List at All
**Symptom:**
- Server: `[INITIATIVE] Sending action options to 1 players`
- But there should be 2 players

**Possible Causes:**
1. Player not in `lobby.state.players`
2. Player keyed by socket ID instead of username
3. Player object deleted on reconnect

**Solution:**
- Verify player is in state: `Object.keys(lobby.state.players)`
- Check if username key exists

---

### Scenario 4: Client Receives But Doesn't Display
**Symptom:**
- Client: `[CLIENT] Action options received`
- Client: `[CLIENT] Number of actions: 3`
- But UI doesn't show

**Possible Causes:**
1. UI elements hidden
2. Tab not switched to combat
3. DOM elements not found

**Solution:**
- Check if `gameplayContainer.style.display === 'flex'`
- Check if combat tab is active
- Inspect DOM for action buttons

---

## Quick Fixes to Try

### Fix 1: Ensure Socket ID is Updated
In `onPlayerJoin`, after updating socket ID, log it:
```javascript
existingPlayer.id = player.id;
console.log(`[DEBUG] Updated ${player.username} socket from ${oldId} to ${player.id}`);
```

### Fix 2: Force Action Options Resend on Reconnect
In `sendFullGameState`, if in combat and it's selecting phase, resend options:
```javascript
if (lobby.state.phase === 'combat' && lobby.state.combat) {
  if (lobby.state.combat.roundPhase === 'selecting') {
    console.log(`[DEBUG] Combat in selecting phase, will resend action options`);
    setTimeout(() => {
      // Force resend action options
      const playerInState = lobby.state.players[player.username];
      if (playerInState && playerInState.health > 0) {
        console.log(`[DEBUG] Forcing action options resend to ${player.username}`);
        // Trigger rollInitiative logic for this player only
      }
    }, 1000);
  }
}
```

### Fix 3: Add Heartbeat Check
Verify socket is connected before sending:
```javascript
if (player.id && api.isSocketConnected(player.id)) {
  api.sendToPlayer(player.id, 'actionOptions', {...});
} else {
  console.error(`[ERROR] Cannot send to ${player.username}: socket not connected`);
}
```

---

## What to Report Back

Please run the test and share:

1. **Server console output** from reconnection through next round
2. **Browser console output** from reconnection through next round
3. **Specific behavior:**
   - Do you see the reconnection logs?
   - Do you see the initiative logs?
   - Do you see the client logs?
   - Does the UI show action options?

This will help me pinpoint exactly where the issue is occurring.

---

## Expected Flow (Working Correctly)

1. **Disconnect** → Server keeps player for 90s
2. **Reconnect** → Server updates socket ID
3. **Round ends** → Server clears pendingActions
4. **New round** → Server calls rollInitiative
5. **rollInitiative** → Iterates all players, sends action options
6. **Client receives** → Shows action selection UI
7. **Player acts** → Selects action and target

If any step fails, the logs will show where.


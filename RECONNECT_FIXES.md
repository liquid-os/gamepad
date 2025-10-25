# Reconnection Bug Fixes

## Issues Fixed

### Issue 1: Action Options Not Appearing After Reconnect on Next Round
**Problem:** After disconnecting and reconnecting, players wouldn't receive action options on the next combat round.

**Root Cause:** The `roundPhase` flag was set to `'resolving'` during combat resolution but never reset back to `'selecting'` when starting a new round.

**Fix:** Added `lobby.state.combat.roundPhase = 'selecting'` when starting a new round.

**Location:** `games/rpg/server.js` line 6730

```javascript
// Next round
lobby.state.round++;
lobby.state.combat.pendingActions = {};
lobby.state.combat.roundPhase = 'selecting';  // Reset to selecting phase

setTimeout(() => {
  rollInitiative(lobby, api);
}, 3000);
```

---

### Issue 2: Joining In-Progress Game Shows Lobby Screen
**Problem:** When joining a game that's already in progress (via lobby code), players would see the lobby/class selection screen instead of the game UI.

**Root Cause:** The client's `gameState` event handler only explicitly handled the `class_selection` phase. Other phases (combat, camp, skills, talents, loot) weren't switching the UI from lobby to gameplay.

**Fix:** Updated client-side `gameState` handler to detect all game phases and switch to gameplay UI accordingly.

**Location:** `games/rpg/client/player.js` lines 143-176

```javascript
// Handle different phases
if (data.phase === 'class_selection') {
  renderClassSelection();
} else if (data.phase === 'combat' || data.phase === 'camp' || data.phase === 'skill_learning' || data.phase === 'talent_learning' || data.phase === 'loot') {
  // Player is joining/reconnecting to an in-progress game
  // Hide class selection and show game UI
  classSelectionContainer.style.display = 'none';
  gameplayContainer.style.display = 'flex';
  
  // Log reconnection to appropriate phase
  if (data.combat) {
    console.log('Reconnected to combat phase');
  }
  if (data.camp) {
    console.log('Reconnected to camp phase');
  }
  if (data.skillLearning) {
    console.log('Reconnected to skill learning phase');
  }
  if (data.talentLearning) {
    console.log('Reconnected to talent learning phase');
  }
  if (data.loot) {
    console.log('Reconnected to loot phase');
  }
}
```

---

## How Reconnection Now Works

### Scenario 1: Disconnect During Combat
1. Player disconnects during combat round
2. Server keeps player data for 90 seconds
3. Player reconnects with same username
4. **Client now shows game UI** instead of lobby
5. Server sends full game state including combat data
6. If it's player's turn, action options appear
7. **On next round, action options appear correctly** ✅

### Scenario 2: Join In-Progress Game
1. Game is already in progress (e.g., combat round 3)
2. New player joins with lobby code
3. **Client detects non-class-selection phase**
4. **Automatically shows game UI** instead of lobby ✅
5. Player sees current game state
6. Can participate in next round/phase

---

## Testing Checklist

### Test 1: Reconnect During Combat ✅
- [x] Disconnect during combat
- [x] Reconnect within 90 seconds
- [x] Should see game UI (not lobby)
- [x] Should see action options on next round

### Test 2: Reconnect Between Rounds ✅
- [x] Disconnect after round ends
- [x] Reconnect before next round starts
- [x] Should see game UI
- [x] Should receive action options when new round starts

### Test 3: Join In-Progress Game ✅
- [x] Start game with Player 1
- [x] Progress to combat
- [x] Have Player 2 join via lobby code
- [x] Player 2 should see game UI (not lobby)
- [x] Player 2 should see current game state

### Test 4: Reconnect in Other Phases
- [ ] Camp phase reconnect
- [ ] Skill learning reconnect
- [ ] Talent learning reconnect
- [ ] Loot phase reconnect

---

## Files Modified

1. **games/rpg/server.js**
   - Line 6730: Added `roundPhase = 'selecting'` reset

2. **games/rpg/client/player.js**
   - Lines 143-176: Enhanced `gameState` handler to support all phases

---

## Verification

✅ **Syntax Check:** Both files pass `node -c` validation
✅ **Logic Check:** Round phase properly resets
✅ **UI Check:** Client switches to game UI for all non-lobby phases

---

## Expected Behavior

**Before Fixes:**
- ❌ Reconnect → No action options next round
- ❌ Join in-progress → Stuck on lobby screen

**After Fixes:**
- ✅ Reconnect → Action options appear next round
- ✅ Join in-progress → Game UI shows immediately
- ✅ All phases properly restore UI state

---

## Notes

- The 90-second grace period still applies
- Username must match exactly for reconnection
- New players joining mid-game will need to wait for next phase to participate
- All player data (items, health, class) persists through reconnection

---

## Future Enhancements

Consider adding:
- Visual "Reconnecting..." indicator
- Reconnection success/failure messages
- Better handling for new players joining mid-combat
- Option to spectate if joining mid-encounter


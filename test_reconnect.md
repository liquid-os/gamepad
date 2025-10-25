# Reconnection Testing Guide

## Quick Test Scenarios

### Test 1: Basic Lobby Reconnection
**Steps:**
1. Create lobby with code `TEST123`
2. Join as player with username `TestPlayer1`
3. Close browser tab
4. Rejoin lobby with code `TEST123` and username `TestPlayer1`

**Expected:**
- Should see "Welcome back!" message
- Should be in same lobby
- Should have same player slot

---

### Test 2: Class Selection Reconnection
**Steps:**
1. Join lobby and select class (e.g., Warrior)
2. Wait for other players or start game
3. Close browser tab during class selection
4. Rejoin with same username

**Expected:**
- Class should still be selected
- Should see "Reconnected as [Class]" message
- Game should continue normally

---

### Test 3: Combat Action Reconnection
**Steps:**
1. Start game and reach combat
2. Wait for your turn
3. When action options appear, disconnect
4. Reconnect within 90 seconds

**Expected:**
- Action options should reappear
- Can select action normally
- Combat continues from where you left off

---

### Test 4: Multi-Action Reconnection
**Steps:**
1. Equip item with `grantAdditionalActions` (e.g., Haste Boots)
2. Enter combat
3. Select first action and target
4. Disconnect before selecting second action
5. Reconnect

**Expected:**
- Should see second action options
- Already selected actions should show as disabled
- Can complete multi-action turn

---

### Test 5: Loot Phase Reconnection
**Steps:**
1. Complete combat encounter
2. When loot appears, disconnect
3. Reconnect

**Expected:**
- Loot options should reappear
- Can roll or pass normally
- Loot results process correctly

---

### Test 6: Skill Learning Reconnection
**Steps:**
1. Reach level 5, 10, or 15
2. When skill options appear, disconnect
3. Reconnect

**Expected:**
- Skill options should reappear
- Can select skill normally
- Skill gets added to character

---

### Test 7: Camp Phase Reconnection
**Steps:**
1. Complete encounter and reach camp
2. When camp actions appear, disconnect
3. Reconnect

**Expected:**
- Camp options should reappear
- Can select camp action normally
- Camp results process correctly

---

### Test 8: Grace Period Expiry
**Steps:**
1. Join game and select class
2. Disconnect
3. Wait 95 seconds (past 90-second grace period)
4. Try to reconnect

**Expected:**
- Should join as new player
- Previous character removed
- Must select class again

---

### Test 9: Multiple Player Reconnection
**Steps:**
1. Start game with 3+ players
2. Have 2 players disconnect
3. Have both reconnect

**Expected:**
- Both players restore correctly
- No conflicts or data corruption
- Game continues normally

---

### Test 10: Inventory Persistence
**Steps:**
1. Collect 2-3 items from loot
2. Disconnect
3. Reconnect
4. Check inventory tab

**Expected:**
- All items still present
- Item effects still active
- Stats reflect items correctly

---

## Debugging Tips

### Check Server Console
Look for these log messages:
```
[RPG] Player [username] reconnected! Restoring state...
[RECONNECT] Sending full game state to [username]
[RECONNECT] Phase: [phase]
```

### Check Browser Console
Look for these messages:
```
Received gameState: { phase: '...', playerData: {...} }
```

### Common Issues

**Issue:** Player joins as new character
- **Cause:** Username doesn't match exactly
- **Fix:** Use exact same username (case-sensitive)

**Issue:** Action options don't appear
- **Cause:** Not player's turn
- **Fix:** Wait for turn in combat order

**Issue:** "Player not found" error
- **Cause:** Grace period expired
- **Fix:** Reconnect within 90 seconds

**Issue:** Items missing after reconnect
- **Cause:** Possible state sync issue
- **Fix:** Check server logs for errors

---

## Success Indicators

✅ **Reconnection Successful:**
- Server logs show "reconnected" message
- Player data intact (health, items, class)
- Can continue gameplay immediately
- No duplicate players in lobby

❌ **Reconnection Failed:**
- Joins as new player
- Must select class again
- Previous items/progress lost
- Server shows "new player joined"

---

## Advanced Testing

### Stress Test
1. Have player disconnect/reconnect 5 times in a row
2. Verify no memory leaks or state corruption

### Edge Cases
1. Disconnect during animation
2. Disconnect during enemy turn
3. Disconnect while charging ability
4. Disconnect during loot roll resolution
5. Disconnect during camp action resolution

### Multi-Phase Test
1. Disconnect in combat
2. Reconnect
3. Complete combat
4. Disconnect in camp
5. Reconnect
6. Complete camp
7. Verify full continuity

---

## Performance Checks

- Reconnection should be instant (<1 second)
- No lag or stuttering after reconnect
- Memory usage stable after multiple reconnects
- No duplicate socket connections

---

## Reporting Issues

If you find a bug, please note:
1. **Phase:** What phase were you in?
2. **Action:** What were you doing?
3. **Username:** What username did you use?
4. **Timing:** How long between disconnect and reconnect?
5. **Error:** Any error messages in console?
6. **Expected:** What should have happened?
7. **Actual:** What actually happened?


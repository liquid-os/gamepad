# 🧪 Testing Co-op RPG Quest

## Quick Start Testing

### 1. Add Game to Database

First, you need to populate the game in your MongoDB database:

```bash
npm run populate-games
```

This will scan the `games/` folder and add the RPG game to your database.

### 2. Grant Access (Optional)

To make the game free for all users:

```bash
npm run grant-free-games
```

Or you can purchase it in the game store with coins.

### 3. Start the Server

```bash
npm start
# or for development
npm run dev
```

### 4. Testing Workflow

#### A. Solo Testing (Same Device)
1. Open browser tab 1: `http://localhost:3000`
2. Login/register
3. Click "Host Game (TV Screen)" - opens in new tab
4. Note the 4-letter lobby code
5. Open browser tab 2: `http://localhost:3000`
6. Click "Join as Player"
7. Enter lobby code
8. Select a class
9. **Important:** Open more tabs to add more players (minimum 2 required)

#### B. Multi-Device Testing (Recommended)
1. **Computer:** Open `http://localhost:3000` or `http://YOUR_IP:3000`
   - Host a game
   - Display on TV/monitor
2. **Phone 1:** Open same URL
   - Join with lobby code
   - Select Knight
3. **Phone 2:** Open same URL  
   - Join with lobby code
   - Select Wizard
4. **Phone 3+:** Add more players (up to 6 total)

### 5. What to Test

#### Class Selection Phase
- [ ] All 6 classes display correctly
- [ ] Only 1 player can select each class
- [ ] "Taken" status updates for all players
- [ ] Game starts when all players select classes

#### Combat Phase
- [ ] Initiative rolls show for all players/enemies
- [ ] Turn order displays correctly
- [ ] Each player gets 3 random actions
- [ ] Action buttons work and show descriptions
- [ ] Target selection appears for targeted actions
- [ ] "Waiting for others" shows after selection

#### Combat Resolution
- [ ] Actions execute in turn order
- [ ] Damage numbers are accurate
- [ ] Health bars update correctly
- [ ] Healing works properly
- [ ] Enemy AI attacks random players
- [ ] Combat log displays all actions

#### End Conditions
- [ ] Victory shows when all enemies defeated
- [ ] Defeat shows when all players defeated
- [ ] Final stats display correctly

## Expected Behavior

### Class Selection
```
Player 1: Chooses Knight ✅
Player 2: Tries to choose Knight ❌ (shows "Taken")
Player 2: Chooses Wizard ✅
All players ready → Combat starts
```

### Combat Round Flow
```
1. Initiative roll (everyone rolls 1d20)
2. Turn order established
3. Players select actions (3 options each)
4. Players select targets (if needed)
5. Wait for all players
6. Actions resolve in turn order
7. Combat log updates
8. Next round or end combat
```

### Sample Combat Log
```
Knight uses Slash
  → Orc takes 15 damage!

Wizard uses Fireball
  → Goblin takes 25 damage!
  → Goblin is defeated!

Orc attacks
  → Wizard takes 12 damage!

Cleric uses Heal
  → Wizard healed for 20 HP!
```

## Common Issues & Fixes

### Game Doesn't Appear in Store
**Problem:** RPG not showing in game selection  
**Fix:** Run `npm run populate-games` to add to database

### Can't Select Actions
**Problem:** Action buttons not appearing  
**Fix:** Make sure you're a player (not host) and class was selected

### Host Screen Not Updating
**Problem:** Host view not showing game state  
**Fix:** Check `hostGameUpdate` events in browser console

### Players Can't Join
**Problem:** "Lobby not found" error  
**Fix:** 
- Verify lobby code is correct (4 letters)
- Make sure host is still connected
- Check Socket.IO connection in browser console

### Combat Doesn't Start
**Problem:** Stuck in class selection  
**Fix:** All players must select a class (need minimum 2 players)

## Debug Mode

Enable detailed logging in browser console:

```javascript
// In player.js, add this at the top
console.log('Debug mode enabled');

// Check socket connection
socket.on('connect', () => {
  console.log('Socket connected:', socket.id);
});

socket.on('disconnect', () => {
  console.log('Socket disconnected');
});
```

## Performance Testing

### Load Testing
- Test with 6 players (max)
- Multiple combat rounds
- Watch for memory leaks
- Check socket disconnection handling

### Mobile Testing
- Test on iOS Safari
- Test on Android Chrome
- Check touch interactions
- Verify responsive design

## Known Limitations

1. **Single Combat Only**: Currently only one combat phase implemented
2. **No Save/Load**: Game state not persisted
3. **Basic Enemy AI**: Enemies attack randomly
4. **No Items Yet**: Item system not implemented
5. **No Reconnection**: Players can't rejoin if disconnected during combat

## Next Steps After Testing

Once basic combat works:
1. Add camp phase (rest between combats)
2. Add shop phase (buy items)
3. Add puzzle phase (team challenges)
4. Implement item system
5. Add boss battles
6. Create story campaign

## Reporting Issues

When reporting issues, include:
- Browser/device used
- Number of players
- Phase when error occurred
- Console error messages
- Steps to reproduce

## Success Criteria

✅ Game is playable end-to-end  
✅ All classes are balanced  
✅ Combat feels tactical and fun  
✅ UI is clear and responsive  
✅ No major bugs or crashes  
✅ Players understand mechanics  

---

**Ready to test? Let's make this RPG legendary!** ⚔️✨


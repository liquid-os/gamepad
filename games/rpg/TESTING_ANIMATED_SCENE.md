# 🧪 Testing the Animated Battle Scene

## Quick Test Guide

### Issue: Still Seeing Old UI?

If you're still seeing boxes instead of the animated scene, follow these steps:

### 1. Restart Your Server

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm start
```

### 2. Clear Browser Cache

**Chrome/Edge:**
- Press `Ctrl + Shift + Delete`
- Select "Cached images and files"
- Click "Clear data"

Or **Hard Refresh:**
- Press `Ctrl + F5` on the host screen

### 3. Test the Animated Scene Directly

Open this URL directly to test the scene:
```
http://localhost:3000/games/rpg/client/host-scene.html
```

You should see:
- Purple gradient background (or forest image if you added one)
- "Choose Your Hero" overlay initially
- No old UI boxes

### 4. Test Full Flow

1. **Host game:**
   - Go to `http://localhost:3000`
   - Login (adam.shannon098@gmail.com)
   - Click "📺 Host Game (TV Screen)"
   - Note the lobby code

2. **Join as player:**
   - New tab/device
   - Go to `http://localhost:3000`
   - Login or use same account
   - Click "📱 Join as Player"
   - Enter lobby code

3. **Select RPG game:**
   - Player screen shows available games
   - Click "Co-op RPG Quest"
   
4. **Watch host screen:**
   - Should switch to **full-screen animated scene**
   - Background fills entire screen
   - Class selection overlay appears
   - Old UI disappears completely

### What You Should See

**Before Game Starts (Lobby):**
```
Traditional UI with:
- Lobby code box
- Player list
- Game selection
```

**After RPG Game Selected:**
```
Full-screen animated scene:
- Background image (or gradient)
- "⚔️ Heroes Assembling..." title
- Class cards in grid
- No boxes or UI elements from before
```

**During Combat:**
```
Full-screen battle:
- Background
- Sprites on left (players)
- Sprites on right (enemies)
- Combat log at bottom
- Health bars above sprites
```

## Debugging

### Check Browser Console

Press `F12` on the host screen and look for:

```javascript
// Should see:
"RPG animated scene loaded"
"=== RPG Host Scene Debug ==="
"Socket available: true"
"Lobby code: ABCD"
```

### If Socket Not Available:

```javascript
// In console, check:
window.socket  // Should show Socket object
window.currentCode  // Should show lobby code

// If missing:
window.parent.socket  // Check parent
```

### If Iframe Not Loading:

```javascript
// In console:
document.getElementById('rpgHostFrame')  // Should show iframe element

// Check iframe src:
const iframe = document.getElementById('rpgHostFrame');
console.log(iframe.src);  // Should be host-scene.html URL
```

## Common Issues

### Issue: Old UI Still Showing

**Cause:** Browser cache or server not restarted

**Fix:**
1. Restart server
2. Hard refresh (Ctrl+F5)
3. Clear browser cache
4. Try incognito window

### Issue: Blank Screen After Selecting RPG

**Cause:** Iframe not loading properly

**Fix:**
1. Check browser console for errors
2. Verify file exists: `games/rpg/client/host-scene.html`
3. Try accessing file directly in browser
4. Check file permissions

### Issue: "Class Selection" Shows But No Classes

**Cause:** Socket not connected or events not firing

**Fix:**
1. Check console for socket errors
2. Verify game actually started
3. Check that `hostGameUpdate` event is firing
4. Look for JavaScript errors

### Issue: Sprites Are Just Emoji

**Cause:** No sprite images added (this is normal!)

**Fix:** This is the fallback system working correctly!
- Game is fully playable with emoji
- Add sprite images when ready
- See `ASSETS_GUIDE.md` for how to add sprites

## Expected Behavior

### Timeline:

```
t=0s:   Host opens host.html
        See lobby UI with code

t=10s:  Players join
        See player list update

t=20s:  Player selects RPG game
        🎬 ANIMATED SCENE LOADS
        Full screen takes over
        Class selection overlay appears

t=30s:  Players select classes
        Classes appear on screen
        Sprites positioned

t=40s:  All classes selected
        "Combat has begun!"
        Sprites appear with health bars

t=45s:  Initiative rolled
        Turn order displays

t=50s:  Combat starts
        Animations play
        Sprites move/shake
        Health bars update
```

### Visual Transition:

```
Before RPG starts:
┌─────────────────────┐
│ Lobby Code: ABCD    │
│ Players: 2          │
│ Waiting...          │
└─────────────────────┘

After RPG starts:
┌─────────────────────────────────────┐
│  FULL SCREEN                        │
│  Background image fills everything  │
│  No borders or boxes                │
│  ⚔️ Heroes Assembling...            │
│                                     │
│  [Class selection grid]             │
└─────────────────────────────────────┘
```

## Quick Verification Steps

1. ✅ Server restarted?
2. ✅ Browser cache cleared?
3. ✅ RPG game selected by player?
4. ✅ Browser console shows "RPG animated scene loaded"?
5. ✅ Full screen (no old UI visible)?
6. ✅ Background fills screen?
7. ✅ Classes display when selected?

## If Still Not Working

### Nuclear Option (Fresh Start):

1. **Close all browser tabs**
2. **Restart server:**
   ```bash
   npm start
   ```
3. **Open incognito/private window**
4. **Host game:** `http://localhost:3000`
5. **Join on another device** (not same browser)
6. **Select RPG game**
7. **Should work!**

### Manual Test:

Open directly: `http://localhost:3000/games/rpg/client/host-scene.html`

If this works:
- ✅ File exists and loads
- ✅ Scene is functional
- ❌ Integration issue with host.html

If this doesn't work:
- ❌ File path issue
- ❌ Server not serving files correctly

## Expected Files

Verify these files exist:

```
✅ games/rpg/client/host-scene.html
✅ games/rpg/client/host-scene.js  
✅ games/rpg/server.js (updated)
✅ public/host.html (updated)
```

## Server Logs

When RPG game starts, server should show:
```
[DEBUG] selectGame called: code=ABCD, gameId=rpg
[DEBUG] Starting game: Co-op RPG Quest
```

## Browser Console Logs

When animated scene loads:
```
RPG animated scene loaded
=== RPG Host Scene Debug ===
Socket available: true
Socket connected: true
Lobby code: ABCD
===========================
```

---

## 🎯 Summary

The animated scene should load **automatically** when the RPG game is selected!

**If you see the old UI:**
1. Restart server
2. Clear cache (Ctrl+F5)
3. Test in incognito window

**The animated scene has:**
- Full-screen background
- Sprite-based characters
- Smooth animations
- Combat log overlay
- No UI boxes!

**Still issues?** Check the console logs and verify all files exist!

---

**Once it loads, you'll see the epic animated battle!** 🎬⚔️


# 💥 Impact GIF Animations - Complete!

## Overview

Generic impact GIF animations now play over sprites when they take damage!

## Implementation

### Directional Impact GIFs

**Two separate GIF files:**
- `assets/effects/impact_left.gif` - Plays when **heroes** take damage (left side)
- `assets/effects/impact_right.gif` - Plays when **enemies** take damage (right side)

**Why directional?**
- Impacts can show proper hit direction
- Left GIF: Impact comes from right (enemy hitting player)
- Right GIF: Impact comes from left (player hitting enemy)
- More realistic combat feel!

## How It Works

### When Any Character Takes Damage:

```
1. Damage is dealt
   ↓
2. Determine sprite type (player or enemy)
   ↓
3. Load appropriate GIF (impact_left or impact_right)
   ↓
4. Position GIF over sprite center
   ↓
5. GIF plays once (auto-loops handled by removal)
   ↓
6. Remove GIF after 800ms
   ↓
7. Shake sprite simultaneously
   ↓
8. Show floating damage number
```

### Visual Layering:

```
Z-Index Layers (bottom to top):
- Background: -1
- Sprites: 10
- Projectiles: 50
- Effect overlays: 60
- Impact GIFs: 65  ← NEW! (over effects)
- Floating text: 70
- Action popup: 90
```

**Result:** Impact GIF appears on top of sprite, below floating numbers

## Specifications

### GIF Requirements:

**File Paths:**
- `games/rpg/assets/effects/impact_left.gif`
- `games/rpg/assets/effects/impact_right.gif`

**Recommended Specs:**
- **Size:** 150x150 pixels
- **Duration:** 0.5-1.0 seconds
- **Loop:** No loop (or set to play once)
- **Transparency:** Yes (alpha channel)
- **Style:** Impact slash, hit spark, explosion burst

**File Size:**
- Keep under 100KB each
- Optimize for web
- Use limited colors if needed

## Timing

**Impact Animation Timeline:**
```
0.0s: Damage dealt
      ↓
0.0s: Impact GIF appears over sprite
      GIF starts playing
      ↓
0.0s: Sprite shake begins (0.5s duration)
      ↓
0.0s: Floating damage number appears
      ↓
0.5s: Sprite shake ends
      Sprite returns to normal
      ↓
0.8s: Impact GIF removed from DOM
      ↓
      Clean!
```

**Perfect sync:** GIF plays during shake, both finish around same time!

## Visual Examples

### Player Takes Damage:
```
Before:
  🛡️ Knight
  ████ 100/120
  
Impact moment:
  🛡️ Knight
  💥 [impact_left.gif playing]
  [Shaking]
  "12" ⬆️ (red damage)
  
After (0.8s):
  🛡️ Knight
  ███ 88/120
```

### Enemy Takes Damage:
```
Before:
  👹 Orc
  ████ 60/60
  
Impact moment:
  👹 Orc
  💥 [impact_right.gif playing]
  [Shaking]
  "25" ⬆️ (red damage)
  
After (0.8s):
  👹 Orc
  ██ 35/60
```

### Multiple Hits (AOE):
```
Wizard's Arcane Blast hits all enemies:

  👹 Orc        👹 Goblin     👹 Wolf
  💥 GIF        💥 GIF        💥 GIF
  [Shake]       [Shake]       [Shake]
  15⬆️          18⬆️          12⬆️
  
All impact GIFs play simultaneously!
```

## Code Implementation

### Function Added:
```javascript
function showImpactAnimation(sprite, isPlayer) {
  // Create impact overlay
  const impact = document.createElement('div');
  impact.className = 'impact-overlay';
  
  const impactGif = document.createElement('img');
  // Use directional GIF
  impactGif.src = isPlayer 
    ? '/games/rpg/assets/effects/impact_left.gif'
    : '/games/rpg/assets/effects/impact_right.gif';
  
  // Fallback if GIF doesn't exist
  impactGif.onerror = () => {
    impact.remove();  // Silently remove if no GIF
  };
  
  impact.appendChild(impactGif);
  
  // Position over sprite center (150x150, so offset by 75)
  const rect = sprite.getBoundingClientRect();
  impact.style.left = (rect.left + rect.width / 2 - 75) + 'px';
  impact.style.top = (rect.top + rect.height / 2 - 75) + 'px';
  
  spritesContainer.appendChild(impact);
  
  // Remove after 800ms (GIF plays once)
  setTimeout(() => {
    impact.remove();
  }, 800);
}
```

### Called From:
```javascript
function shakeSpriteOnDamage(sprite) {
  // Determine sprite type
  const isPlayer = sprite.dataset.type === 'player';
  
  // Show impact GIF
  showImpactAnimation(sprite, isPlayer);  // ← Called here!
  
  // Also shake sprite
  sprite.classList.add('damage');
  // ... rest of shake logic
}
```

**Triggered by:** Every instance of damage across all animation types!

## Customization

### Adjust GIF Duration

If your GIF is longer/shorter:

```javascript
// Current: 800ms
setTimeout(() => {
  impact.remove();
}, 800);

// For 500ms GIF:
setTimeout(() => {
  impact.remove();
}, 500);

// For 1200ms GIF:
setTimeout(() => {
  impact.remove();
}, 1200);
```

### Change GIF Size

In CSS:
```css
/* Current: 150x150 */
.impact-overlay {
  width: 150px;
  height: 150px;
}

/* Larger (200x200): */
.impact-overlay {
  width: 200px;
  height: 200px;
}

/* Smaller (100x100): */
.impact-overlay {
  width: 100px;
  height: 100px;
```

Remember to adjust the offset in JavaScript too:
```javascript
// Current offset: 75 (half of 150)
impact.style.left = (rect.left + rect.width / 2 - 75) + 'px';

// For 200x200 GIF:
impact.style.left = (rect.left + rect.width / 2 - 100) + 'px';
```

### Use Same GIF for Both

If you want one GIF for all impacts:
```javascript
impactGif.src = '/games/rpg/assets/effects/impact.gif';
// Remove the isPlayer check
```

### Add Different GIF for Crits

```javascript
function showImpactAnimation(sprite, isPlayer, isCrit) {
  const impactGif = document.createElement('img');
  
  if (isCrit) {
    impactGif.src = '/games/rpg/assets/effects/impact_crit.gif';
  } else {
    impactGif.src = isPlayer 
      ? '/games/rpg/assets/effects/impact_left.gif'
      : '/games/rpg/assets/effects/impact_right.gif';
  }
  
  // ... rest of function
}
```

## Creating Impact GIFs

### Recommended Tools:

**Free:**
- **GIMP** - Export as animated GIF
- **Photopea** - Online Photoshop alternative
- **Piskel** - Pixel art GIF creator
- **Ezgif.com** - GIF editor online

**Paid:**
- **Aseprite** - Best for pixel art GIFs
- **After Effects** - Professional animations

### Quick Creation:

#### Option 1: Pixel Art (Easy)
1. Create 5-8 frames of impact animation
2. Each frame: 150x150 pixels
3. Frame 1: Small impact
4. Frame 2-3: Growing impact
5. Frame 4-5: Full impact
6. Frame 6-8: Fading out
7. Export as GIF (0.1s per frame = 0.8s total)

#### Option 2: Photo Manipulation
1. Find impact/slash effect images
2. Stack in layers
3. Create keyframes
4. Export as animated GIF
5. Optimize size

#### Option 3: AI Generation
```
Prompt for AI:
"Impact slash effect animation, 
action RPG combat hit,
coming from the right side,
transparent background,
150x150 pixels,
8 frames,
orange and white colors,
game VFX"
```

Generate both directions:
- "...coming from the left..."
- "...coming from the right..."

### GIF Settings:
- **Frame rate:** 10-15 FPS
- **Loop count:** 1 (play once)
- **Optimize:** Reduce colors if too large
- **Transparency:** Yes (transparent background)

## Fallback Behavior

### If GIFs Don't Exist:
- Impact overlay creation attempted
- `onerror` handler triggers
- Impact overlay removed silently
- Combat continues normally
- Shake still works
- Floating numbers still work
- **No errors or broken visuals!**

**Result:** Game works without GIFs, looks better with them!

## Expected Visual

### With Impact GIFs:
```
Knight attacks Orc:
  1. Knight slides forward
  2. Knight sprite → attack pose
  3. Hit moment:
     💥 Impact GIF plays on Orc
     Orc shakes
     "25" floats up (red)
  4. Impact GIF disappears
  5. Knight returns
  6. Orc back to normal
```

### Without Impact GIFs (Fallback):
```
Knight attacks Orc:
  1. Knight slides forward
  2. Knight sprite → attack pose
  3. Hit moment:
     Orc shakes
     "25" floats up (red)
  4. Knight returns
  5. Orc back to normal
  
Still looks good! Just no extra GIF.
```

## Testing

### Create Test GIFs (Quick):

**Simple test GIF:**
1. Open Piskel or Ezgif
2. Create 4-frame animation:
   - Frame 1: Small white circle
   - Frame 2: Medium orange burst
   - Frame 3: Large red explosion
   - Frame 4: Fading out
3. Export as GIF
4. Save as `impact_right.gif` and `impact_left.gif`
5. Test!

### Test Without GIFs:
1. Don't add any GIF files
2. Combat works normally
3. No errors
4. Shake and numbers still show

### Test With GIFs:
1. Add `impact_left.gif` to `assets/effects/`
2. Add `impact_right.gif` to `assets/effects/`
3. Restart server
4. Combat → damage occurs
5. ✨ Impact GIF plays!

## Performance

**Optimized:**
- GIF loads once per damage instance
- Removed after 800ms
- No memory leaks
- Multiple impacts handled well
- Smooth performance

**Max Concurrent:**
- 6 characters could all take damage at once
- 6 impact GIFs playing
- Still smooth!

## Advanced: Different Impacts Per Damage Type

```javascript
function showImpactAnimation(sprite, isPlayer, damageType) {
  let gifPath = '';
  
  switch(damageType) {
    case 'slash':
      gifPath = `/games/rpg/assets/effects/impact_slash_${isPlayer ? 'left' : 'right'}.gif`;
      break;
    case 'fire':
      gifPath = '/games/rpg/assets/effects/impact_fire.gif';
      break;
    case 'ice':
      gifPath = '/games/rpg/assets/effects/impact_ice.gif';
      break;
    default:
      gifPath = isPlayer 
        ? '/games/rpg/assets/effects/impact_left.gif'
        : '/games/rpg/assets/effects/impact_right.gif';
  }
  
  impactGif.src = gifPath;
}
```

Then pass damage type from animations!

## Files Modified

1. **`games/rpg/client/host-scene.html`**
   - Added `.impact-overlay` CSS
   - 150x150 size
   - Z-index 65 (above effects, below floating text)

2. **`games/rpg/client/host-scene.js`**
   - Created `showImpactAnimation()` function
   - Integrated into `shakeSpriteOnDamage()`
   - Directional GIF selection
   - Auto-cleanup after 800ms

## Asset Checklist

To use this feature:
- [ ] Create `impact_left.gif` (150x150)
- [ ] Create `impact_right.gif` (150x150)
- [ ] Save to `games/rpg/assets/effects/`
- [ ] Test in combat
- [ ] Adjust timing if needed (line 720)

**Or:** Leave it without GIFs, system gracefully handles missing files!

## Summary

**Impact GIF Features:**
- ✅ Plays on every damage instance
- ✅ Directional (left for heroes, right for enemies)
- ✅ Positioned perfectly over sprite
- ✅ Plays once then removes
- ✅ 800ms default duration
- ✅ Graceful fallback if missing
- ✅ Works with shake and floating numbers
- ✅ Professional visual punch!

**Result:** Combat impacts have extra visual oomph! 💥

---

**Place your GIF files in `games/rpg/assets/effects/` and they'll automatically play on every hit!** 🎬✨


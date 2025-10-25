# 🎨 RPG Asset Guide - Sprites & Animations

## Overview

The RPG game now uses an animated battle scene with sprites, backgrounds, and visual effects!

## Asset Structure

```
games/rpg/assets/
├── backgrounds/           # Battle environment images
│   ├── forest.jpg        # Forest battleground
│   ├── cave.jpg          # Cave environment
│   ├── castle.jpg        # Castle interior
│   └── dungeon.jpg       # Dark dungeon
├── sprites/              # Player class sprites
│   ├── knight_idle.png   # Knight standing
│   ├── knight_attack.png # Knight attacking
│   ├── knight_cast.png   # Knight using ability
│   ├── knight_hurt.png   # Knight taking damage
│   ├── wizard_idle.png
│   ├── wizard_attack.png
│   ├── wizard_cast.png
│   ├── wizard_hurt.png
│   ├── cleric_idle.png
│   ├── cleric_attack.png
│   ├── cleric_cast.png
│   ├── cleric_hurt.png
│   ├── rogue_idle.png
│   ├── rogue_attack.png
│   ├── rogue_cast.png
│   ├── rogue_hurt.png
│   ├── archer_idle.png
│   ├── archer_attack.png
│   ├── archer_cast.png
│   ├── archer_hurt.png
│   ├── druid_idle.png
│   ├── druid_attack.png
│   ├── druid_cast.png
│   ├── druid_hurt.png
│   └── enemies/          # Enemy sprites
│       ├── goblin_idle.png
│       ├── goblin_attack.png
│       ├── goblin_hurt.png
│       ├── orc_idle.png
│       ├── orc_attack.png
│       ├── orc_hurt.png
│       ├── skeleton_idle.png
│       ├── troll_idle.png
│       ├── wolf_idle.png
│       └── dark_wizard_idle.png
└── effects/              # Spell effects and projectiles
    ├── projectile_arrow_shot.png
    ├── projectile_fireball.png
    ├── projectile_ice_spike.png
    ├── projectile_lightning.png
    ├── effect_fireball.png
    ├── effect_heal.png
    ├── effect_shield.png
    └── effect_buff.png
```

## Sprite States

Each character has 4 sprite states:

### 1. **idle** (Default)
- Character standing/waiting
- Shown when not taking action
- Loops continuously

### 2. **attack** (Melee)
- Attack pose for melee actions
- Shows weapon swing/strike
- Used for: Slash, Backstab, etc.

### 3. **cast** (Ranged/Magic)
- Spellcasting or bow-drawing pose
- Used for projectiles and spells
- Used for: Fireball, Heal, Arrow Shot, etc.

### 4. **hurt** (Taking Damage)
- Recoiling from damage
- Brief flash when hit
- Returns to idle quickly

## Sprite Specifications

### Player Sprites
- **Size:** 120x120 pixels
- **Format:** PNG with transparency
- **Background:** Transparent
- **Style:** Pixel art, cartoon, or realistic
- **Facing:** Right (attacking right side)

### Enemy Sprites
- **Size:** 140x140 pixels
- **Format:** PNG with transparency
- **Background:** Transparent
- **Facing:** Left (attacking left side)

### Background Images
- **Size:** 1920x1080 pixels (16:9 ratio)
- **Format:** JPG or PNG
- **Style:** Fantasy battle scenes
- **Lighting:** Not too dark (sprites need to be visible)

### Effect Images
- **Size:** 100x100 pixels
- **Format:** PNG with transparency
- **Style:** Semi-transparent effects
- **Duration:** Fade in quickly, fade out over 2 seconds

### Projectile Images
- **Size:** 40x40 pixels
- **Format:** PNG with transparency
- **Style:** Arrow, fireball, ice shard, etc.
- **Orientation:** Pointing right →

## Animation System

### Animation Types

#### 1. Melee Attacks
```
Flow:
1. Change attacker sprite to "attack" state
2. Move sprite 60% toward target
3. Wait 400ms
4. Move sprite back to original position
5. Wait 300ms
6. Change sprite back to "idle"
7. Shake target sprite (if hit)

Total: ~1 second
```

**Actions:** Slash, Backstab, Shield Bash, Charge, Quick Strike, Smite

#### 2. Projectile Attacks
```
Flow:
1. Change attacker sprite to "attack" state
2. Wait 200ms
3. Create projectile at attacker position
4. Animate projectile to target (800ms)
5. Remove projectile
6. Change attacker back to "idle"
7. Shake target sprite (if hit)

Total: ~1.5 seconds
```

**Actions:** Arrow Shot, Aimed Shot, Volley, Multi Shot, Ice Spike, Lightning

#### 3. Spell/Magic Attacks
```
Flow:
1. Change caster sprite to "cast" state
2. Wait 500ms (casting time)
3. Show effect image over target
4. Fade in effect (50ms)
5. Keep visible for 2 seconds
6. Fade out effect
7. Change caster back to "idle"
8. Shake target sprite (if hit)

Total: ~3 seconds
```

**Actions:** Fireball, Arcane Blast, Nature's Wrath, Wild Shape, Holy Light, Entangle

#### 4. Support Abilities
```
Flow:
1. Change caster sprite to "cast" state
2. Wait 500ms
3. Show effect image over target (healing glow, shield, etc.)
4. Fade in effect (50ms)
5. Keep visible for 1.5 seconds
6. Fade out effect
7. Change caster back to "idle"

Total: ~2.5 seconds
```

**Actions:** Heal, Prayer, Bless, Defend, Magic Shield, etc.

#### 5. Taking Damage
```
Flow:
1. Change sprite to "hurt" state
2. Shake sprite up/down for 500ms
3. Change sprite back to "idle"

Total: 500ms
```

**Triggered:** When any character takes damage

### Customizing Animations

#### Change Animation Speed

In `host-scene.js`, adjust timing values:

```javascript
// Melee attack timing
await sleep(400);  // Time moving toward target
await sleep(300);  // Time returning

// Projectile speed
projectile.style.transition = 'all 0.8s linear';  // Flight time

// Effect duration
await sleep(2000);  // How long effect shows
```

#### Add New Animation Type

```javascript
// In ANIMATION_TYPES object
newtype: ['action_id1', 'action_id2'],

// In playActionAnimation()
case 'newtype':
  await playNewTypeAnimation(actorSprite, targetSprite, actionId, hit, crit);
  break;

// Create animation function
async function playNewTypeAnimation(actor, target, actionId, hit, crit) {
  // Your custom animation here
  changeSpriteState(actor, 'cast');
  await sleep(1000);
  changeSpriteState(actor, 'idle');
}
```

## Creating Sprites

### Recommended Tools

**Free Options:**
- **Piskel** - Browser-based pixel art editor
- **GIMP** - Free image editor
- **Krita** - Free painting software
- **Aseprite** - Pixel art tool (paid but cheap)

**AI Generation:**
- **Midjourney** - Generate sprite sheets
- **DALL-E** - Create character sprites
- **Stable Diffusion** - Free AI art

### Sprite Checklist

For each class, create 4 images:
- [ ] `classname_idle.png` - Standing pose
- [ ] `classname_attack.png` - Melee attack pose
- [ ] `classname_cast.png` - Casting/shooting pose
- [ ] `classname_hurt.png` - Damage reaction pose

**Pro Tip:** Create one base sprite, then modify for different poses!

### Quick Sprite Creation

#### Option 1: Pixel Art (Easy)
1. Open Piskel (https://www.piskelapp.com)
2. Create 120x120 canvas
3. Draw simple character
4. Export each pose as PNG
5. Save with correct naming

#### Option 2: AI Generation (Fastest)
```
Prompt for Midjourney/DALL-E:

"RPG game character sprite, knight with sword and shield, 
pixel art style, transparent background, standing idle pose,
front-facing view, 120x120 pixels, video game asset"

Then create variations:
- "...attacking pose with sword raised..."
- "...casting magic pose with hands glowing..."
- "...hurt pose recoiling from damage..."
```

#### Option 3: Use Emoji (Temporary)
The system already falls back to emoji if images are missing!
- No sprites needed to start testing
- Just shows emoji characters
- Add real sprites later

## Background Images

### Finding Backgrounds

**Free Sources:**
- **Unsplash** - Free high-quality photos
- **Pixabay** - Free images and art
- **OpenGameArt** - Free game assets
- **Itch.io** - Free/paid game art

**Search Terms:**
- "fantasy forest battle"
- "dungeon background game"
- "castle interior RPG"
- "cave battleground"

### Background Requirements

- **Resolution:** At least 1920x1080
- **Format:** JPG or PNG
- **Style:** Should match sprite style
- **Lighting:** Not too dark
- **Contrast:** Sprites should be visible

### Example Backgrounds

**Forest:**
- Green trees, grass
- Dappled sunlight
- Natural setting
- Good for goblins, wolves

**Cave:**
- Dark rocks, stalactites
- Torchlight
- Mysterious atmosphere
- Good for skeletons, bats

**Castle:**
- Stone walls, banners
- Grand interior
- Epic feel
- Good for bosses

**Dungeon:**
- Dark corridors
- Prison cells
- Ominous
- Good for undead

## Effect Images

### Projectiles
Simple arrow, fireball, ice shard images
- Small (40x40px)
- Clear silhouette
- Transparent background

### Spell Effects
Visual impact when spell hits
- Medium (100x100px)
- Semi-transparent
- Glowing/magical appearance

**Examples:**
- Fireball: Orange/red explosion
- Heal: Green sparkles
- Ice: Blue crystals
- Lightning: Yellow bolts

## Fallback System

### If Images Missing

The system automatically falls back to:
- **Player Sprites:** Class emoji (🛡️ 🧙 ✨ 🗡️ 🏹 🌿)
- **Enemy Sprites:** Monster emoji (👹)
- **Background:** Purple-blue gradient
- **Effects:** Emoji (💥 ✨ 💚)

This means **the game works immediately** without any images!

### Progressive Enhancement

1. **Start:** Use emoji fallbacks (works now!)
2. **Add backgrounds:** Download a few battle scenes
3. **Add sprites:** Create/find character sprites
4. **Add effects:** Polish with spell effects
5. **Refine:** Adjust and improve

## Quick Start (No Assets Needed!)

The game is already playable with emoji fallbacks!

Just use the new host scene:

```javascript
// In public/host.html, change the game iframe to:
const gameUrl = `/games/rpg/client/host-scene.html`;
```

Or keep using the UI version while you create assets.

## Asset Checklist

### Minimum (Playable):
- [ ] 1 background image (any fantasy scene)
- [ ] 6 idle sprites (one per class)
- [ ] 6 enemy idle sprites

### Recommended (Good Experience):
- [ ] 3-4 backgrounds (variety)
- [ ] All 4 poses for each class (idle, attack, cast, hurt)
- [ ] Attack/hurt poses for common enemies
- [ ] Basic projectile images (arrow, fireball)

### Complete (Professional):
- [ ] Multiple backgrounds
- [ ] All sprite states for all classes
- [ ] All enemy sprite states
- [ ] All projectile images
- [ ] All spell effect images
- [ ] Sound effects (future)

## Testing Without Assets

1. Use `host-scene.html` - it works with emoji!
2. Test all animations
3. Verify timing and positioning
4. Then add real sprites later

## Adding Your First Asset

### Step 1: Add a Background

1. Find/create a 1920x1080 fantasy image
2. Name it `forest.jpg`
3. Save to `games/rpg/assets/backgrounds/`
4. Refresh host screen
5. ✨ Background appears!

### Step 2: Add a Knight Sprite

1. Create/find 120x120 knight image
2. Name it `knight_idle.png`
3. Save to `games/rpg/assets/sprites/`
4. Refresh host screen
5. ✨ Knight sprite appears!

### Step 3: Add Attack Sprite

1. Create knight in attack pose
2. Name it `knight_attack.png`
3. Save to `games/rpg/assets/sprites/`
4. When knight attacks, sprite changes!

## File Naming Convention

**IMPORTANT:** Names must match exactly!

### Player Sprites:
```
{classname}_{state}.png

Examples:
knight_idle.png
knight_attack.png
wizard_cast.png
rogue_hurt.png
```

### Enemy Sprites:
```
enemies/{enemyname}_{state}.png

Examples:
enemies/goblin_idle.png
enemies/orc_attack.png
enemies/troll_hurt.png
```

### Effects:
```
effect_{actionid}.png
projectile_{actionid}.png

Examples:
effect_fireball.png
projectile_arrow_shot.png
effect_heal.png
```

### Backgrounds:
```
backgrounds/{scenename}.jpg

Examples:
backgrounds/forest.jpg
backgrounds/dungeon.jpg
```

## Sprite Positioning

### Automatic Layout

**Players (Left Side):**
```
Position 0: (150, 300)
Position 1: (150, 440)
Position 2: (150, 580)
Position 3: (150, 720)
Position 4: (150, 860)
Position 5: (150, 1000)
```

**Enemies (Right Side):**
```
Position 0: (window.width - 250, 300)
Position 1: (window.width - 250, 440)
Position 2: (window.width - 250, 580)
Position 3: (window.width - 250, 720)
```

**Spacing:** 140px vertical between each sprite

### Adjusting Positions

In `host-scene.js`, modify `SPRITE_CONFIG`:

```javascript
player: {
  startX: 150,        // Distance from left
  startYBase: 300,    // First sprite height
  spacing: 140        // Space between sprites
},
enemy: {
  startX: window.innerWidth - 250,  // Distance from right
  startYBase: 300,
  spacing: 140
}
```

## Animation Timing

Current timings (adjustable):

| Animation | Duration | Adjustable In |
|-----------|----------|---------------|
| Melee attack | ~1s | `playMeleeAnimation()` |
| Projectile | ~1.5s | `playProjectileAnimation()` |
| Spell | ~3s | `playSpellAnimation()` |
| Support | ~2.5s | `playSupportAnimation()` |
| Damage shake | 0.5s | CSS `@keyframes shake` |
| Effect fade | 2s | CSS `.effect-overlay` |

## Recommended Asset Packs

### Free Resources:
1. **OpenGameArt.org** - Free RPG sprites
2. **Itch.io** - Many free asset packs
3. **Kenny.nl** - Simple, clean sprites
4. **Craftpix** - Some free packs

### Paid (High Quality):
1. **Itch.io Premium Packs** - $5-20
2. **Unity Asset Store** - Professional assets
3. **GameDev Market** - Various styles

### AI-Generated:
1. Generate consistent style with Midjourney
2. Create entire sprite sets at once
3. Maintain visual coherence

## Sample Prompts for AI Generation

### Character Sprites:
```
"pixel art RPG knight character sprite, 
blue armor with sword and shield, 
idle standing pose, transparent background,
front-facing, 120x120 pixels, game asset,
simple clean style"
```

### Backgrounds:
```
"fantasy forest battleground for RPG game,
green trees and grass, dappled sunlight,
16:9 aspect ratio, suitable for game background,
high detail, fantasy art style"
```

### Effects:
```
"fireball spell effect, 
orange and red flames,
transparent background,
magical explosion,
100x100 pixels, game VFX"
```

## Tips for Good Sprites

1. **Consistent Style:** All sprites should match
2. **Clear Silhouettes:** Easy to identify
3. **Proper Size:** 120x120 for players, 140x140 for enemies
4. **Transparency:** Use PNG with alpha channel
5. **Readable:** Should be clear at small sizes
6. **Distinct:** Each class should look different
7. **Animated Feel:** Poses should show action

## Testing Sprites

### Test Checklist:
- [ ] Place image in correct folder
- [ ] Use exact naming convention
- [ ] Refresh host screen
- [ ] Sprite appears in battle
- [ ] Sprite changes during attacks
- [ ] Sprite shakes when damaged
- [ ] Effects display correctly

### Debug:
```javascript
// In browser console:
// Check if image loaded
document.querySelectorAll('.sprite img').forEach(img => {
  console.log(img.src, img.complete);
});
```

## Common Issues

### Sprite Not Showing
- Check file name matches exactly (case-sensitive!)
- Verify image is in correct folder
- Check browser console for 404 errors
- Ensure PNG has transparency

### Animation Not Playing
- Verify sprite state images exist
- Check action is in correct category
- Look for JavaScript errors in console

### Background Not Loading
- Check file path in CSS
- Verify image dimensions
- Try JPG instead of PNG
- Check file permissions

## Next Steps

1. **Start with emoji** - Test the system works
2. **Add one background** - See the scene come alive
3. **Add one sprite set** - Watch animations work
4. **Iterate and improve** - Add more assets over time

---

**The animation system is ready! Add assets at your own pace.** 🎨✨

For now, the game works beautifully with emoji fallbacks while you create or find sprites!


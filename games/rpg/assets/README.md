# 🎨 RPG Game Assets

This folder contains all visual assets for the Co-op RPG Quest animated battle scene.

## Folder Structure

```
assets/
├── backgrounds/          # Battle environment backgrounds
│   ├── forest.jpg       # Forest battleground (1920x1080)
│   ├── cave.jpg         # Cave environment
│   ├── castle.jpg       # Castle interior
│   └── dungeon.jpg      # Dark dungeon
│
├── sprites/             # Player class sprites (120x120 PNG)
│   ├── knight_idle.png
│   ├── knight_attack.png
│   ├── knight_cast.png
│   ├── knight_hurt.png
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
│   └── enemies/         # Enemy sprites (140x140 PNG)
│       ├── goblin_idle.png
│       ├── goblin_attack.png
│       ├── goblin_hurt.png
│       ├── orc_idle.png
│       ├── orc_attack.png
│       ├── orc_hurt.png
│       ├── skeleton_idle.png
│       ├── skeleton_attack.png
│       ├── skeleton_hurt.png
│       ├── troll_idle.png
│       ├── troll_attack.png
│       ├── troll_hurt.png
│       ├── wolf_idle.png
│       ├── wolf_attack.png
│       ├── wolf_hurt.png
│       ├── dark_wizard_idle.png
│       ├── dark_wizard_attack.png
│       └── dark_wizard_hurt.png
│
└── effects/             # Visual effects (PNG with transparency)
    ├── projectile_arrow_shot.png      # 40x40
    ├── projectile_aimed_shot.png
    ├── projectile_volley.png
    ├── projectile_ice_spike.png
    ├── projectile_lightning.png
    ├── effect_fireball.png            # 100x100
    ├── effect_arcane_blast.png
    ├── effect_heal.png
    ├── effect_prayer.png
    ├── effect_shield.png
    └── effect_buff.png
```

## Important: Fallback System

**The game works WITHOUT any assets!**

If images are missing:
- Background → Purple gradient
- Player sprites → Emoji (🛡️ 🧙 ✨ 🗡️ 🏹 🌿)
- Enemy sprites → Emoji (👹)
- Effects → Emoji (💥 ✨)

You can add assets progressively - the game adapts!

## Quick Start

### Minimum Setup (5 minutes):
1. Find 1 fantasy background (1920x1080)
2. Save as `backgrounds/forest.jpg`
3. **Done!** Game looks much better

### Recommended Setup (1 hour):
1. Add background images (3-4 different scenes)
2. Add idle sprites for all 6 classes
3. Test and enjoy!

### Complete Setup (1 day):
1. All backgrounds
2. All sprite states (idle, attack, cast, hurt) for classes
3. Enemy sprites (at least idle and attack)
4. Basic effect images
5. Professional-looking game!

## Asset Specifications

### Backgrounds
- **Size:** 1920x1080 (16:9 ratio)
- **Format:** JPG (smaller file size)
- **Style:** Fantasy battle scenes
- **Quality:** Medium-high (not too large)

### Player Sprites
- **Size:** 120x120 pixels
- **Format:** PNG with transparency
- **States:** idle, attack, cast, hurt
- **Facing:** Right (toward enemies)

### Enemy Sprites
- **Size:** 140x140 pixels
- **Format:** PNG with transparency
- **States:** idle, attack, hurt (cast optional)
- **Facing:** Left (toward players)

### Effects
- **Projectiles:** 40x40 PNG
- **Spell Effects:** 100x100 PNG
- **Transparency:** Yes (alpha channel)
- **Style:** Glowing, semi-transparent

## Where to Find Assets

### Free Resources:
- **OpenGameArt.org** - Tons of free RPG assets
- **Kenny.nl** - Simple, clean style
- **Itch.io** - Many free packs
- **Pixabay** - Free backgrounds

### AI Generation:
- **Midjourney** - High quality sprites
- **DALL-E** - Quick generation
- **Stable Diffusion** - Free alternative

### Commission:
- **Fiverr** - $5-50 for sprite sets
- **UpWork** - Professional artists
- **r/gameDevClassifieds** - Find artists

## File Naming Rules

**CRITICAL:** File names must match exactly!

```
✅ Correct:
   knight_idle.png
   wizard_attack.png
   enemies/goblin_hurt.png

❌ Wrong:
   Knight_Idle.png         (wrong capitalization)
   wizard-attack.png       (wrong separator)
   goblin_hurt.png         (wrong folder)
```

## Testing Assets

### Add First Background:
1. Get image: `fantasy_forest_1920x1080.jpg`
2. Rename to: `forest.jpg`
3. Move to: `games/rpg/assets/backgrounds/`
4. Open host scene: Background appears! ✨

### Add First Sprite:
1. Get image: `knight_character.png` (120x120)
2. Rename to: `knight_idle.png`
3. Move to: `games/rpg/assets/sprites/`
4. Host game with Knight class
5. Knight sprite appears instead of emoji! ✨

### Verify:
```
Open browser console (F12)
Look for image load errors (404)
Fix file names if needed
```

## Asset Priority

**What to add first:**

1. **Backgrounds** (Biggest visual impact)
   - `forest.jpg` - Main background
   - `cave.jpg` - Variety
   - `dungeon.jpg` - Dark atmosphere

2. **Player Idle Sprites** (Characters appear)
   - `knight_idle.png`
   - `wizard_idle.png`
   - `cleric_idle.png`
   - `rogue_idle.png`
   - `archer_idle.png`
   - `druid_idle.png`

3. **Player Attack Sprites** (Basic animation)
   - `knight_attack.png`
   - `wizard_cast.png` (for spells)
   - `archer_attack.png`
   - etc.

4. **Enemy Sprites** (Opponents look good)
   - `enemies/goblin_idle.png`
   - `enemies/orc_idle.png`
   - `enemies/troll_idle.png`

5. **Effects** (Polish)
   - `projectile_arrow_shot.png`
   - `effect_fireball.png`
   - `effect_heal.png`

## Example Asset Pack

If using AI generation, generate all at once:

**Prompt Set:**
```
1. "fantasy RPG battle background, forest clearing, 1920x1080"
2. "pixel art knight sprite, idle pose, 120x120, transparent background"
3. "pixel art knight sprite, sword attack pose, 120x120, transparent"
4. "pixel art wizard sprite, casting spell pose, 120x120, transparent"
5. "fireball spell effect, transparent, 100x100, orange glow"
```

Generate all sprites in same session for consistent style!

## Common Questions

**Q: Do I need all sprites to start?**
A: No! Works with emoji. Add sprites over time.

**Q: What if I don't have attack sprites?**
A: System uses idle sprites for all states (no problem!).

**Q: Can I use different art styles?**
A: Yes, but consistent style looks better.

**Q: How big should files be?**
A: Sprites: 10-50KB, Backgrounds: 100-500KB, Effects: 20-100KB

**Q: Do animations work without sprite images?**
A: Yes! Emoji fallbacks still animate (move, shake, etc.)

## Tips

1. **Start simple** - One background goes a long way
2. **AI generation** - Fastest way to get full asset set
3. **Consistency** - Keep art style uniform
4. **Test often** - Add one asset, test, repeat
5. **Optimize** - Compress images for web

## Support

See `ASSETS_GUIDE.md` for complete documentation on:
- Creating sprites
- Animation system details
- Technical specifications
- Troubleshooting

---

**The game works NOW with emoji. Add sprites to make it beautiful!** 🎨✨


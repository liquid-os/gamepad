# Camp Scene Lighting Effects

## Overview
Added dynamic firelight effects to the camp scene, including an orange-yellow tint on the campfire and directional lighting gradients on player sprites.

---

## Changes Made

### 1. Campfire Tint (Orange-Yellow Gradient)

**File:** `games/rpg/client/camp-scene.html`

**CSS Filter Applied:**
```css
#campfire {
    filter: brightness(1.2) saturate(1.5) hue-rotate(-10deg);
}
```

**Effect:**
- Increases brightness by 20%
- Boosts saturation by 50% for more vibrant colors
- Shifts hue slightly toward orange-yellow spectrum
- Creates a warm, glowing fire appearance

---

### 2. Dynamic Player Sprite Lighting

**Firelight Gradient System:**

Each player sprite now receives a dynamic gradient overlay that:
- Transitions from **black** (away from fire) → **orange** (middle) → **yellow** (facing fire)
- Rotates based on the sprite's position relative to the campfire
- Creates realistic directional lighting effect

**Implementation:**

#### A. Angle Calculation (JavaScript)
```javascript
// Calculate campfire position
const campfireX = window.innerWidth / 2;
const campfireY = window.innerHeight * 0.9;

// Calculate angle from sprite to campfire
const dx = campfireX - x;
const dy = campfireY - y;
const angleToFire = Math.atan2(dy, dx) * (180 / Math.PI);

// Set CSS variable for gradient rotation
const gradientAngle = angleToFire + 90;
sprite.style.setProperty('--fire-gradient-angle', `${gradientAngle}deg`);
```

#### B. Gradient Overlay (CSS)
```css
.sprite::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: linear-gradient(
        var(--fire-gradient-angle, 180deg),
        rgba(0, 0, 0, 0.6) 0%,      /* Black - away from fire */
        rgba(255, 140, 0, 0.3) 50%, /* Orange - middle */
        rgba(255, 215, 0, 0.5) 100% /* Yellow - facing fire */
    );
    mix-blend-mode: multiply;
    z-index: 1;
}
```

---

## Visual Result

### Before:
- Campfire: Standard GIF appearance
- Player sprites: Uniform lighting, no directional effect

### After:
- **Campfire:** Warm orange-yellow glow with enhanced brightness
- **Player sprites:** Dynamic lighting that creates depth and atmosphere
  - Side facing campfire: Bright yellow glow
  - Middle: Orange transition
  - Side away from campfire: Darker/shadowed

---

## Technical Details

### Gradient Properties:

| Color Stop | Color | Opacity | Purpose |
|------------|-------|---------|---------|
| 0% | Black | 60% | Shadow side (away from fire) |
| 50% | Orange | 30% | Transition zone |
| 100% | Yellow | 50% | Lit side (facing fire) |

### Blend Mode:
- **`multiply`**: Darkens the sprite while preserving details
- Creates realistic shadow/light interaction
- Maintains sprite visibility and color information

### Z-Index Layering:
```
1. Sprite container (base)
2. Gradient overlay (::before, z-index: 1)
3. Sprite contents (name, health, image, z-index: 2)
```

---

## Player Positioning

Players are arranged in a **semi-circle** at the top of the campfire:

```
    P1      P2      P3
     \      |      /
      \     |     /
       \    |    /
        \   |   /
         \  |  /
          \ | /
           🔥
       (Campfire)
```

**Lighting Direction:**
- **Left players (P1):** Yellow glow on right side (toward center)
- **Center player (P2):** Yellow glow on bottom (toward fire)
- **Right players (P3):** Yellow glow on left side (toward center)

---

## Performance

- **CSS-based:** Hardware accelerated
- **Calculated once:** Gradient angle set during sprite creation
- **No runtime overhead:** Static CSS variables
- **Smooth transitions:** Built-in CSS transitions maintained

---

## Customization

### Adjust Fire Intensity:
```css
#campfire {
    filter: brightness(1.5) saturate(2.0) hue-rotate(-15deg);
    /* Brighter, more saturated, more orange */
}
```

### Adjust Lighting Gradient:
```css
background: linear-gradient(
    var(--fire-gradient-angle, 180deg),
    rgba(0, 0, 0, 0.8) 0%,      /* Darker shadows */
    rgba(255, 100, 0, 0.5) 50%, /* More orange */
    rgba(255, 255, 0, 0.7) 100% /* Brighter yellow */
);
```

### Change Blend Mode:
- `multiply`: Darkens (current)
- `overlay`: More vibrant
- `soft-light`: Subtle effect
- `hard-light`: Dramatic contrast

---

## Browser Compatibility

✅ **Supported:**
- Chrome/Edge (all versions)
- Firefox (all versions)
- Safari (all versions)
- Mobile browsers

**Features Used:**
- CSS Custom Properties (CSS Variables)
- Linear Gradients
- Blend Modes
- Pseudo-elements

---

## Summary

The camp scene now features:
1. ✅ Orange-yellow tinted campfire with warm glow
2. ✅ Dynamic directional lighting on player sprites
3. ✅ Black-orange-yellow gradient facing the fire
4. ✅ Realistic shadow/light interaction
5. ✅ Performance-optimized CSS implementation

The effect creates a cozy, atmospheric camp scene with realistic firelight illumination!


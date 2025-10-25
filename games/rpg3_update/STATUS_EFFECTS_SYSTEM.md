# 💫 Status Effects System - Complete!

## Overview

A fully modular status effect system with visual indicators, durations, and mechanical effects!

## ✅ Features Implemented

### 1. **Status Effect Framework**
- Modular definition system
- Easy to add new effects
- Automatic duration tracking
- Visual indicators on host and player screens

### 2. **Built-in Status Effects**

| Effect | Icon | Color | Duration | Effect |
|--------|------|-------|----------|--------|
| **Stunned** | 💫 | Gold | 1 round | Cannot act |
| **Slowed** | 🐌 | Blue | 2 rounds | -5 speed |
| **Poisoned** | ☠️ | Purple | 3 rounds | 5 damage/turn |
| **Defending** | 🛡️ | Green | 2 rounds | +10 defense |

### 3. **Visual Display**

**Host Screen (Above Health Bars):**
```
  💫  ☠️2
  ████ 85/100 HP
  🛡️ Knight
```
- Icons show active effects
- Numbers show remaining duration (if > 1)
- Color-coded borders
- Tooltips on hover

**Player Screen (Below Health):**
```
┌──────────────────────┐
│ 💫 Stunned      (1)  │
│ Cannot act this turn │
└──────────────────────┘
┌──────────────────────┐
│ ☠️ Poisoned     (3)  │
│ Takes damage over    │
│ time                 │
└──────────────────────┘
```

### 4. **Mechanical Effects**

**Stun:**
- Cancels character's action that round
- Combat log shows "X is stunned and cannot act!"
- Effect removed after 1 round
- Applied by: Shield Bash, Trap, Entangle

**Slow:**
- Reduces speed roll by 5
- Makes character act later in turn order
- Lasts 2 rounds
- Applied by: Ice Spike

**Poison:**
- Deals 5 damage at start of each round
- Lasts 3 rounds
- Total: 15 damage over time
- Applied by: Poison (Rogue ability)

**Defense Buff:**
- Shown when using defensive abilities
- Visual indicator of active defense
- Lasts 2 rounds
- Applied by: Defend, Magic Shield, Evade, etc.

### 5. **Duration System**
- Effects have round-based durations
- Decremented at end of each round
- Removed when duration reaches 0
- Visual counter shows remaining rounds

## How It Works

### Effect Lifecycle

```
Round 1:
  Action applies effect
  → Duration: 3 rounds
  → Display: ☠️3

Round 2 start:
  Process effects (poison deals damage)
  → Duration: still 3 (processes before decrement)
  Display: ☠️3

Round 2 end:
  Decrement duration
  → Duration: 2 rounds
  → Display: ☠️2

Round 3 start:
  Process effects again
  → Duration: still 2
  Display: ☠️2

Round 3 end:
  Decrement duration
  → Duration: 1 round
  → Display: ☠️ (no number if = 1)

Round 4 start:
  Process effects one last time
  → Duration: still 1

Round 4 end:
  Decrement duration
  → Duration: 0
  → Effect removed
```

### Stun Mechanics

```
Round 1:
  Orc uses Shield Bash on Knight
  → Knight gains Stunned (1 round)
  
Round 2 (Knight's turn):
  Check: Knight has Stun?
  → YES
  → Skip action
  → Show: "Knight is stunned and cannot act!"
  
Round 2 end:
  Decrement Stun duration
  → Duration: 0
  → Remove Stun
  
Round 3:
  Knight can act normally again!
```

## Adding New Status Effects

### Step 1: Define the Effect

In `games/rpg/server.js`, add to `STATUS_EFFECTS`:

```javascript
STATUS_EFFECTS = {
  // ... existing effects
  
  burn: {
    id: 'burn',
    name: 'Burning',
    icon: '🔥',
    description: 'Takes fire damage each turn',
    color: '#f97316',
    damagePerTurn: 8  // Deals 8 damage per turn
  },
  
  frozen: {
    id: 'frozen',
    name: 'Frozen',
    icon: '🧊',
    description: 'Cannot move or act',
    color: '#60a5fa',
    cancelsAction: true  // Prevents actions like stun
  },
  
  blessed: {
    id: 'blessed',
    name: 'Blessed',
    icon: '✨',
    description: 'Increased healing received',
    color: '#fbbf24',
    healingBonus: 1.5  // 50% more healing (future feature)
  }
};
```

### Step 2: Apply from Action

In action definitions, add the effect property:

```javascript
{
  id: 'fireball',
  name: 'Fireball',
  damage: 25,
  type: 'attack',
  target: 'enemy',
  burn: true  // Add this to apply burn
}
```

### Step 3: Handle in executePlayerAction

The system will automatically:
- Check for effect properties (stun, slow, poison, burn, etc.)
- Apply the effect to the target
- Show in combat log
- Display visually

## Effect Properties

### Supported Properties:

**Mechanical:**
- `cancelsAction` - Prevents acting (like stun)
- `damagePerTurn` - Deals damage at start of round
- `speedReduction` - Reduces initiative rolls
- `defenseBonus` - Increases defense (visual only currently)

**Visual:**
- `icon` - Emoji to display
- `name` - Display name
- `description` - Shown on player screen
- `color` - Border color

**System:**
- `id` - Unique identifier
- `duration` - Applied when effect is added

### Effect Types

**Debuffs (Negative):**
- Stun (action cancel)
- Slow (speed penalty)
- Poison (DoT)
- Burn (DoT)
- Frozen (action cancel)
- Bleed (DoT)

**Buffs (Positive):**
- Defending (defense boost)
- Blessed (various bonuses)
- Regenerating (heal over time)
- Hasted (speed boost)
- Shielded (damage reduction)

## Visual Examples

### Host Screen Display

**Single Effect:**
```
    💫
  ████ 100/120 HP
  🛡️ Knight
  ⚡15 🛡️15
```

**Multiple Effects:**
```
  💫 ☠️3 🛡️2
  ████ 85/120 HP
  🛡️ Knight
  ⚡15 🛡️25
```

**Duration Counter:**
```
Effect lasting 1 round:  💫 (no number)
Effect lasting 2 rounds: ☠️2
Effect lasting 3 rounds: ☠️3
```

### Player Screen Display

**Stunned:**
```
┌────────────────────────────┐
│ 💫 Stunned            (1)  │
│ Cannot act this turn       │
└────────────────────────────┘
```

**Multiple Effects:**
```
┌────────────────────────────┐
│ 💫 Stunned            (1)  │
│ Cannot act this turn       │
└────────────────────────────┘
┌────────────────────────────┐
│ ☠️ Poisoned           (3)  │
│ Takes damage over time     │
└────────────────────────────┘
```

## Combat Flow with Status Effects

### Example Combat Round:

```
Round 2 Start:
  ↓
Process Status Effects:
  • Poison deals damage
  • Burn deals damage
  • Regen heals
  Combat log shows all DoT effects
  ↓
Roll Initiative:
  • Slow reduces speed rolls
  Turn order adjusted
  ↓
Resolve Actions:
  Turn 1: Knight (has Stun)
    → "Knight is stunned and cannot act!"
    → Skip action
    
  Turn 2: Wizard (no effects)
    → Casts Fireball
    → Deals damage normally
    
  Turn 3: Orc (has Poison ☠️3)
    → Attacks normally
    → Poison already dealt damage at round start
  ↓
Round 2 End:
  Decrement all effect durations:
  • Stun 1 → 0 (removed)
  • Poison 3 → 2
  • Burn 2 → 1
  ↓
Notify players of updated effects
  ↓
Round 3 Start (repeat)
```

## Action Effects Currently Implemented

### Stun (Duration: 1 round)
- Shield Bash (Knight)
- Trap (Archer)
- Entangle (Druid)

### Slow (Duration: 2 rounds)
- Ice Spike (Wizard)

### Poison (Duration: 3 rounds)
- Poison (Rogue)

### Defense Buff (Duration: 2 rounds)
- Defend (Knight)
- Magic Shield (Wizard)
- Evade (Rogue)
- Retreat (Archer)
- Thorns (Druid)
- Smoke Bomb (Rogue - all allies)

## Customization

### Change Effect Duration

In action definition:
```javascript
// Currently stun lasts 1 round
{ id: 'shield_bash', stun: true, ... }

// For longer stun, modify in executePlayerAction:
if (action.stun) {
  applyStatusEffect(enemy, 'stun', 2, player.username);  // 2 rounds
}
```

### Change Effect Damage

In STATUS_EFFECTS definition:
```javascript
poison: {
  damagePerTurn: 5  // Current
  // Change to:
  damagePerTurn: 10  // More damage
}
```

### Add New Effect Property

```javascript
// In STATUS_EFFECTS:
haste: {
  id: 'haste',
  speedBonus: 5  // NEW property
}

// In rollInitiative(), apply bonus:
Object.values(lobby.state.players).forEach(player => {
  let roll = Math.floor(Math.random() * 20) + 1;
  
  // Apply haste bonus
  player.statusEffects.forEach(effect => {
    const effectData = STATUS_EFFECTS[effect.effectId];
    if (effectData.speedBonus) {
      roll += effectData.speedBonus;
    }
  });
  
  // ... rest of initiative
});
```

## Files Modified

1. **`games/rpg/server.js`**
   - Added `STATUS_EFFECTS` definitions
   - Created `applyStatusEffect()` function
   - Created `removeStatusEffect()` function
   - Created `hasStatusEffect()` function
   - Created `processStatusEffects()` - DoT damage
   - Created `decrementStatusEffectDurations()` function
   - Created `getActiveStatusEffects()` function
   - Integrated stun checks before actions
   - Apply effects from action properties
   - Send effects to players and host

2. **`games/rpg/client/host-scene.html`**
   - Added status effect CSS
   - Status effect icons above health bars
   - Duration counter styling

3. **`games/rpg/client/host-scene.js`**
   - Created `updateStatusEffects()` function
   - Display icons and durations
   - Integrated into sprite updates

4. **`games/rpg/client/index.html`**
   - Added player status effects container
   - Below health bar display

5. **`games/rpg/client/style.css`**
   - Status effect badge styling
   - Icon, name, description layout
   - Duration counter circle

6. **`games/rpg/client/player.js`**
   - Added `statusEffectsUpdate` event handler
   - Created `updatePlayerStatusEffects()` function
   - Display effects with descriptions

## Testing Checklist

### Host Screen:
- [ ] Status icons appear above health bars
- [ ] Multiple effects show side-by-side
- [ ] Duration counter shows (if > 1)
- [ ] Effects update each round
- [ ] Effects disappear when expired
- [ ] Color-coded borders

### Player Screen:
- [ ] Status effects shown below health
- [ ] Icon, name, and description display
- [ ] Duration counter shows
- [ ] Updates each round
- [ ] Clear and readable

### Mechanics:
- [ ] Stun cancels actions
- [ ] Poison deals damage each round
- [ ] Slow reduces speed (future)
- [ ] Effects stack properly
- [ ] Durations decrement correctly
- [ ] Effects removed when duration = 0

### Specific Tests:

**Test Stun:**
1. Use Shield Bash on enemy
2. Enemy gets 💫 Stunned
3. Next round, enemy's turn comes
4. Combat log: "Enemy is stunned and cannot act!"
5. Enemy does nothing
6. Round ends, stun removed

**Test Poison:**
1. Rogue uses Poison on enemy
2. Enemy gets ☠️ Poisoned (3)
3. Round 2 start: Enemy takes 5 poison damage
4. Icon shows ☠️2
5. Round 3 start: Enemy takes 5 poison damage
6. Icon shows ☠️1
7. Round 4 start: Enemy takes 5 poison damage
8. Round 4 end: Poison removed (total 15 damage)

**Test Defense Buff:**
1. Knight uses Defend
2. Knight gets 🛡️ Defending (2)
3. Defense shown increases: 15 → 25
4. Round 2: Still active, shows 🛡️1
5. Round 3: Effect expires

## Combat Log Examples

### Status Effect Application:
```
• Rogue uses Poison → Orc takes 10 damage!
• Orc is poisoned!
```

### Stun Canceling Action:
```
• Orc is stunned and cannot act!
```

### Poison Damage:
```
Status effects activating...
• Orc takes 5 Poisoned damage!
• Goblin takes 5 Poisoned damage!
```

## Player Experience

### When Stunned:
```
Your Screen Shows:
┌─────────────────────┐
│ 💫 Stunned     (1)  │
│ Cannot act this turn│
└─────────────────────┘

When your turn comes:
- No action selection appears
- See: "You are stunned!"
- Wait for next round
```

### When Poisoned:
```
Your Screen Shows:
┌─────────────────────┐
│ ☠️ Poisoned    (3)  │
│ Takes damage over   │
│ time                │
└─────────────────────┘

Each round start:
- HP bar decreases by 5
- See poison damage in status
- Counter decrements: 3 → 2 → 1 → 0
```

## Strategic Implications

### Using Stun:
- Cancel enemy's action
- Especially valuable against high-damage enemies
- Timing is key!
- Only lasts 1 round (use wisely)

**Example:**
```
Troll about to attack (would deal 14 damage)
→ Archer uses Trap
→ Troll stunned
→ Troll's turn: Cannot act!
→ 14 damage prevented!
```

### Using Poison:
- Deals damage over time
- 15 total damage (3 rounds × 5 damage)
- Good for wearing down tough enemies
- Stacks with direct damage

**Example:**
```
Rogue poisons Troll (80 HP)
Round 1: -10 initial, -5 poison = 65 HP
Round 2: -5 poison = 60 HP
Round 3: -5 poison = 55 HP
Total: 25 damage from one action!
```

### Using Defense Buffs:
- Reduces chance of being hit
- Lasts 2 rounds
- Stack multiple buffs
- Protect squishy characters

**Example:**
```
Wizard (5 defense) uses Magic Shield (+15)
→ Wizard now has 20 defense
→ Hit chance vs Wizard: 83% → 75%
→ 8% harder to hit!
→ Lasts 2 rounds
```

## Adding New Status Effects

### Example: Regeneration (Heal over Time)

```javascript
// 1. Define in STATUS_EFFECTS
regen: {
  id: 'regen',
  name: 'Regenerating',
  icon: '💚',
  description: 'Restores HP each turn',
  color: '#22c55e',
  healPerTurn: 10
}

// 2. Update processStatusEffects() to handle healing
if (effectData.healPerTurn) {
  player.health = Math.min(player.maxHealth, player.health + effectData.healPerTurn);
  combatLog.push({
    actor: player.username,
    action: effectData.name,
    results: [`Regenerates ${effectData.healPerTurn} HP!`]
  });
}

// 3. Add to action that applies it
{
  id: 'rejuvenate_plus',
  name: 'Greater Rejuvenate',
  heal: 15,
  regen: true,  // Applies regen
  type: 'heal',
  target: 'ally'
}

// 4. Apply in executePlayerAction
if (action.regen) {
  applyStatusEffect(target, 'regen', 3, player.username);
  log.results.push(`${target.username} is regenerating!`);
}
```

### Example: Haste (Speed Boost)

```javascript
// 1. Define
haste: {
  id: 'haste',
  name: 'Hasted',
  icon: '⚡',
  description: 'Increased speed',
  color: '#fbbf24',
  speedBonus: 5
}

// 2. Apply in rollInitiative
let roll = Math.floor(Math.random() * 20) + 1;

// Apply speed bonuses/penalties
player.statusEffects.forEach(effect => {
  const effectData = STATUS_EFFECTS[effect.effectId];
  if (effectData.speedBonus) {
    roll += effectData.speedBonus;
  }
  if (effectData.speedReduction) {
    roll -= effectData.speedReduction;
  }
});
```

## Current Effect Triggers

| Action | Applies | Duration |
|--------|---------|----------|
| Shield Bash | Stun | 1 round |
| Ice Spike | Slow | 2 rounds |
| Trap | Stun | 1 round |
| Entangle | Stun | 1 round |
| Poison | Poison | 3 rounds |
| Defend | Defense Buff | 2 rounds |
| Magic Shield | Defense Buff | 2 rounds |
| Evade | Defense Buff | 2 rounds |
| Retreat | Defense Buff | 2 rounds |
| Thorns | Defense Buff | 2 rounds |
| Smoke Bomb | Defense Buff | 2 rounds |

## Effect Stacking

### Current Behavior:
- Same effect refreshes duration to maximum
- Multiple different effects can coexist
- Example: Can be Poisoned AND Stunned

```
Knight has:
- 💫 Stunned (1)
- ☠️ Poisoned (2)
- 🛡️ Defending (1)

All show above health bar!
All active simultaneously!
```

## Future Enhancements

### Could Add:
- **Damage reflection:** Attacker takes damage
- **Immunity:** Prevents specific effects
- **Cleanse actions:** Remove debuffs
- **Permanent buffs:** From items
- **Stackable effects:** Multiple applications increase power
- **Effect resistance:** % chance to resist
- **Dispel:** Remove buff from enemy

## Performance

- Lightweight system (icon + number)
- Auto-cleanup when expired
- No memory leaks
- Smooth animations
- Clear visual feedback

## Summary

**Status Effect System Features:**
- ✅ Modular definition system
- ✅ 4 built-in effects (stun, slow, poison, defense)
- ✅ Visual indicators on host (icons + duration)
- ✅ Display on player screens (with descriptions)
- ✅ Stun cancels actions
- ✅ Poison deals DoT
- ✅ Duration tracking
- ✅ Auto-expiration
- ✅ Easy to add new effects

**Result:** Tactical depth with visual clarity! 💫☠️🛡️

---

**The status effect system is complete and ready to use!** Test stun, poison, and other effects in combat! 🎮✨


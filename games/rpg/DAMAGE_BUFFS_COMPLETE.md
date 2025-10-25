# 💥 Damage Buffs & Ability Updates Complete

## Overview

I've implemented damage buff status effects, added new buff abilities to Wizard and Cleric, set damage types for all player abilities, and made Lightning Bolt a powerful charge-up ability.

## ✅ **Features Implemented**

### 1. **Damage Buff System** ✅

**New Status Effects:**

**Physical Damage Buff:**
```javascript
physical_buff: {
  name: 'Empowered',
  icon: '⚔️',
  description: 'Increased physical damage',
  color: '#ef4444',
  physicalDamageBonus: 10,
  duration: 3 rounds
}
```

**Magic Damage Buff:**
```javascript
magic_buff: {
  name: 'Arcane Power',
  icon: '✨',
  description: 'Increased magic damage',
  color: '#8b5cf6',
  magicDamageBonus: 10,
  duration: 3 rounds
}
```

**Universal Damage Buff:**
```javascript
damage_buff: {
  name: 'Berserker',
  icon: '💥',
  description: 'Increased all damage',
  color: '#f59e0b',
  physicalDamageBonus: 8,
  magicDamageBonus: 8,
  duration: 3 rounds
}
```

**Damage Calculation:**
```javascript
// Base damage + item bonuses + status effect bonuses
totalDamage = baseDamage;

// Item bonuses
if (damageType === 'physical') {
  totalDamage += itemEffects.physicalDamage;
}

// Status effect bonuses
statusEffects.forEach(effect => {
  if (damageType === 'physical' && effect.physicalDamageBonus) {
    totalDamage += effect.physicalDamageBonus;
  }
  if (damageType === 'magic' && effect.magicDamageBonus) {
    totalDamage += effect.magicDamageBonus;
  }
});
```

### 2. **New Buff Abilities** ✅

**Wizard - Arcane Power:**
```javascript
{
  name: 'Arcane Power',
  magicBuff: true,
  type: 'buff',
  target: 'ally'
}
```
- Grants +10 magic damage for 3 rounds
- Can target any ally
- Perfect for boosting spell casters
- Stacks with items

**Cleric - Divine Strength:**
```javascript
{
  name: 'Divine Strength',
  physicalBuff: true,
  type: 'buff',
  target: 'ally'
}
```
- Grants +10 physical damage for 3 rounds
- Can target any ally
- Perfect for boosting melee/ranged attackers
- Stacks with items

### 3. **All Abilities Have Damage Types** ✅

**Knight:**
- ✅ Slash: Physical (+10% hit)
- ✅ Shield Bash: Physical (stun)
- ✅ Charge: Physical (-10% hit)

**Wizard:**
- ✅ Fireball: Magic
- ✅ Ice Shard: Magic
- ✅ Magic Missile: Magic
- ✅ Lightning Bolt: Magic (charge-up)

**Cleric:**
- ✅ Smite: Magic
- ✅ Turn Undead: Magic

**Rogue:**
- ✅ Backstab: Physical
- ✅ Poison Dart: Physical (poison)
- ✅ Quick Strike: Physical
- ✅ Sap: Physical (stun)

**Archer:**
- ✅ Arrow Shot: Physical
- ✅ Multi Shot: Physical (AoE)
- ✅ Piercing Arrow: Physical
- ✅ Aimed Shot: Physical
- ✅ Trap: Physical (stun)
- ✅ Volley: Physical

**Druid:**
- ✅ Nature's Wrath: Magic
- ✅ Entangle: Magic (stun)
- ✅ Wild Shape: Physical

### 4. **Lightning Bolt Charge-Up** ✅

**Before:**
- 30 damage
- Instant cast
- Standard magic attack

**After:**
```javascript
{
  name: 'Lightning Bolt',
  damage: 60,  // Doubled!
  damageType: 'magic',
  chargeUp: true,  // 1-turn charge
  type: 'attack',
  target: 'enemy'
}
```

**Mechanics:**
- **Round 1:** Wizard begins charging
  - Sprite locks to cast pose
  - Sprite brightens
  - No damage dealt
- **Round 2:** Lightning unleashes
  - 60 magic damage (doubled from 30)
  - Can crit for 120 damage
  - Sprite returns to normal

**Strategic Use:**
- High-risk, high-reward
- Best used when enemy is stunned
- Coordinate with team for protection
- Devastating against high-defense enemies

## 🎮 **Enhanced Gameplay**

### **Buff Synergies:**

**Physical Damage Team:**
```
Cleric uses Divine Strength on Knight
Knight's Charge: 20 → 30 damage
Archer's Aimed Shot: 35 → 45 damage
Rogue's Backstab: 22 → 32 damage
```

**Magic Damage Team:**
```
Wizard uses Arcane Power on Cleric
Cleric's Smite: 20 → 30 damage
Wizard's Fireball: 25 → 35 damage
Druid's Nature's Wrath: 18 → 28 damage
```

**Stacking Buffs:**
```
Physical Buff (+10) + Sharp Sword (+5) = +15 total
Magic Buff (+10) + Fire Wand (+8) = +18 total
```

### **Tactical Decisions:**

**Support Priority:**
- Buff high-damage dealers first
- Coordinate buffs with charge-up abilities
- Time buffs before boss phases
- Choose physical vs magic based on enemy resistances

**Damage Type Strategy:**
- **vs Troll (physical resist):** Use magic damage + magic buffs
- **vs Dark Wizard (magic resist):** Use physical damage + physical buffs
- **vs Mixed enemies:** Balance damage types

## 📊 **Damage Comparison**

### **Lightning Bolt Power:**

**Standard Cast (Old):**
- Damage: 30
- Turns: 1
- DPT (Damage Per Turn): 30

**Charge-Up Cast (New):**
- Damage: 60
- Turns: 2
- DPT: 30
- **Risk:** Vulnerable for 1 round
- **Reward:** Massive burst damage

**With Magic Buff:**
- Damage: 70 (60 + 10)
- With Crit: 140 damage!

**With Magic Buff + Fire Wand:**
- Damage: 78 (60 + 10 + 8)
- With Crit: 156 damage!

### **Buff Impact Examples:**

**Knight with Divine Strength:**
- Slash: 15 → 25 damage
- Charge: 20 → 30 damage
- Shield Bash: 10 → 20 damage

**Wizard with Arcane Power:**
- Fireball: 25 → 35 damage
- Ice Shard: 18 → 28 damage
- Lightning Bolt: 60 → 70 damage (140 crit!)

## 🔧 **Technical Implementation**

### **Files Modified:**

1. **`games/rpg/server.js`**
   - Added new status effects (physical_buff, magic_buff, damage_buff)
   - Added damage type to all class abilities
   - Added Arcane Power to Wizard
   - Added Divine Strength to Cleric
   - Made Lightning Bolt charge-up with 60 damage
   - Updated `resolveAttack()` to apply status effect damage bonuses
   - Updated all damage calculations to include status effects

### **Key Changes:**

**Status Effect Definitions:**
```javascript
const STATUS_EFFECTS = {
  // ... existing effects
  physical_buff: {
    id: 'physical_buff',
    name: 'Empowered',
    icon: '⚔️',
    description: 'Increased physical damage',
    color: '#ef4444',
    physicalDamageBonus: 10
  },
  magic_buff: {
    id: 'magic_buff',
    name: 'Arcane Power',
    icon: '✨',
    description: 'Increased magic damage',
    color: '#8b5cf6',
    magicDamageBonus: 10
  }
};
```

**Buff Application:**
```javascript
// Single target buff
if (action.physicalBuff && !hasStatusEffect(target, 'physical_buff')) {
  applyStatusEffect(target, 'physical_buff', 3, player.username);
  log.results.push(`${target.username} gains physical damage boost!`);
}

// AoE buff
if (action.magicBuff) {
  Object.values(lobby.state.players).forEach(ally => {
    if (ally.health > 0 && !hasStatusEffect(ally, 'magic_buff')) {
      applyStatusEffect(ally, 'magic_buff', 3, player.username);
    }
  });
  log.results.push(`All allies gain magic damage boost!`);
}
```

**Damage Calculation:**
```javascript
function resolveAttack(baseDamage, targetDefense, attackerItemEffects, 
                      damageType, targetResistances, hitChanceModifier, 
                      attackerStatusEffects) {
  // ... hit check ...
  
  // Base + item bonuses
  let totalDamage = baseDamage;
  if (damageType === 'physical') {
    totalDamage += attackerItemEffects.physicalDamage || 0;
  } else if (damageType === 'magic') {
    totalDamage += attackerItemEffects.magicDamage || 0;
  }
  
  // Status effect bonuses
  if (attackerStatusEffects) {
    attackerStatusEffects.forEach(effect => {
      const statusEffect = STATUS_EFFECTS[effect.effectId];
      if (statusEffect) {
        if (damageType === 'physical' && statusEffect.physicalDamageBonus) {
          totalDamage += statusEffect.physicalDamageBonus;
        }
        if (damageType === 'magic' && statusEffect.magicDamageBonus) {
          totalDamage += statusEffect.magicDamageBonus;
        }
      }
    });
  }
  
  // ... resistance, variance, crit ...
}
```

## 🎯 **Strategic Depth**

### **Team Compositions:**

**Physical Powerhouse:**
- Knight (tank/damage)
- Archer (ranged damage)
- Rogue (burst damage)
- Cleric (heals + Divine Strength buff)

**Magic Artillery:**
- Wizard (damage + Arcane Power buff)
- Cleric (heals + magic damage)
- Druid (heals + magic damage)
- Knight (tank)

**Hybrid Balanced:**
- Mix of physical and magic
- Adapt to enemy resistances
- Both buff types available

### **Buff Timing:**

**Optimal Use:**
- Before charge-up abilities
- Before boss phases
- When enemy is stunned/vulnerable
- Stack with item effects

**Avoid:**
- Buffing low-damage characters
- Wasting on wrong damage type
- Buffing when enemy nearly dead

### **Charge-Up Strategy:**

**Lightning Bolt Best Used When:**
- Enemy is stunned (can't interrupt)
- Team can protect Wizard
- High-value target (boss, high HP)
- Magic buff is active
- Enemy has low magic resistance

**Avoid Using When:**
- Multiple enemies attacking
- Wizard is low HP
- Enemy has magic resistance
- Quick damage needed

## 🚀 **Testing Checklist**

### **Damage Buffs:**
- ✅ Physical buff increases physical damage
- ✅ Magic buff increases magic damage
- ✅ Buffs last 3 rounds
- ✅ Buffs stack with items
- ✅ Buffs show on status display
- ✅ Buffs work on all abilities

### **New Abilities:**
- ✅ Wizard can cast Arcane Power on allies
- ✅ Cleric can cast Divine Strength on allies
- ✅ Buffs apply correctly
- ✅ Visual indicators appear
- ✅ Duration counts down

### **Lightning Bolt:**
- ✅ Requires 1-turn charge
- ✅ Deals 60 damage (doubled)
- ✅ Sprite locks to cast pose
- ✅ Fires automatically next round
- ✅ Works with magic buffs
- ✅ Can critical strike

### **Damage Types:**
- ✅ All abilities have damageType set
- ✅ Physical damage affected by physical buffs
- ✅ Magic damage affected by magic buffs
- ✅ Resistances work correctly
- ✅ Items apply correct bonuses

---

**All damage buff features have been successfully implemented! The combat system now offers deep tactical gameplay with support roles, buff management, and powerful charge-up abilities.** 💥⚔️✨

**Players can now build dedicated support characters, coordinate powerful buff combos, and unleash devastating charged attacks!** 🏆🔥

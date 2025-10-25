# 🛡️ Defense & Critical Strike Mechanics

## Overview

Combat is now more tactical with defense scores, hit/miss mechanics, and critical strikes!

## Defense System

### Defense Stats

**Heroes:**
| Class | HP | Defense | Notes |
|-------|-----|---------|-------|
| 🛡️ Knight | 120 | **15** | Highest defense (tank) |
| 🧙 Wizard | 80 | **5** | Lowest defense (glass cannon) |
| ✨ Cleric | 100 | **10** | Medium defense |
| 🗡️ Rogue | 90 | **12** | High dodge/evasion |
| 🏹 Archer | 95 | **8** | Light armor |
| 🌿 Druid | 105 | **11** | Nature protection |

**Enemies:**
| Enemy | HP | Damage | Defense | Notes |
|-------|-----|--------|---------|-------|
| Goblin | 40 | 8 | **8** | Quick but weak |
| Orc | 60 | 12 | **12** | Balanced |
| Skeleton | 45 | 10 | **10** | Medium |
| Wolf | 50 | 11 | **7** | Fast, low defense |
| Dark Wizard | 55 | 15 | **6** | High damage, low defense |
| Troll | 80 | 14 | **18** | Highest defense! |

### Hit Chance Formula

```
Base Hit Chance: 85%
Defense Reduction: Defense ÷ 2
Final Hit Chance: 85% - (Defense ÷ 2)

Minimum Hit Chance: 20%
Maximum Hit Chance: 95%
```

### Examples:

**Attacking a Goblin (Defense 8):**
- Hit Chance = 85% - (8 ÷ 2) = 85% - 4% = **81%**
- Miss Chance = **19%**

**Attacking a Troll (Defense 18):**
- Hit Chance = 85% - (18 ÷ 2) = 85% - 9% = **76%**
- Miss Chance = **24%**

**Attacking a Wizard (Defense 5):**
- Hit Chance = 85% - (5 ÷ 2) = 85% - 2.5% = **82.5%** → **83%**
- Miss Chance = **17%**

**Attacking a Knight (Defense 15):**
- Hit Chance = 85% - (15 ÷ 2) = 85% - 7.5% = **77.5%** → **78%**
- Miss Chance = **22%**

### Defense Buffs

Some actions increase defense:
- **Knight's Defend:** +10 defense
- **Wizard's Magic Shield:** +15 defense
- **Cleric's Bless:** +8 defense to ally
- **Rogue's Evade:** +20 defense (highest!)
- **Archer's Retreat:** +12 defense
- **Druid's Thorns:** +10 defense

**Example:**
```
Wizard uses Magic Shield
  Base Defense: 5
  + Magic Shield: +15
  = Total Defense: 20

Hit Chance against Wizard:
  Before buff: 83% (very likely to hit)
  After buff: 75% (harder to hit!)
```

## Critical Strike System

### Critical Hit Mechanics

- **Chance:** 5% (1 in 20 attacks)
- **Effect:** Double damage
- **Visual:** ⚡ CRITICAL HIT! displayed on host screen
- **Applies to:** All damage-dealing attacks (player and enemy)

### Critical Strike Examples:

**Normal Hit:**
```
Knight uses Slash (15 damage)
  → Orc takes 15 damage!
```

**Critical Hit:**
```
Knight uses Slash (15 damage)
  Roll: 3.2% (< 5%) = CRIT!
  → Orc takes 30 damage! ⚡ CRITICAL HIT!
```

**Devastating Crits:**
- Archer's Aimed Shot: 35 damage → **70 damage** on crit!
- Rogue's Backstab: 30 damage → **60 damage** on crit!
- Wizard's Fireball: 25 damage → **50 damage** on crit!

### Critical Strike Probability

With 5% crit chance:
- **In 20 attacks:** Expect ~1 critical hit
- **In 100 attacks:** Expect ~5 critical hits

## Player Experience

### When Selecting Targets

**Player Screen Shows:**
```
┌────────────────────────┐
│  Select Target         │
│                        │
│  👹 Orc                │
│  🎯 Hit Chance: 76%    │
│  🛡️ Defense: 12        │
│  [Select]              │
│                        │
│  👹 Troll              │
│  🎯 Hit Chance: 76%    │
│  🛡️ Defense: 18        │
│  [Select]              │
└────────────────────────┘
```

**Color Coding:**
- **Green (≥75%):** High hit chance - reliable
- **Yellow (50-74%):** Medium hit chance - risky
- **Red (<50%):** Low hit chance - very risky

### Strategic Implications

**Target Selection:**
- Low defense enemies = easier to hit
- High defense enemies = might miss
- Consider hit chance vs potential damage

**Defense Buffs:**
- Use before taking damage
- Stacks with base defense
- Makes you harder to hit
- Critical for keeping squishies alive!

## Host Screen Display

### What You'll See

**During Combat:**
```
🛡️ Knight (Adam)
  ████████░░ 88/120 HP ⚡18 🛡️25

👹 Orc
  ██████░░░░ 45/60 HP ⚡15 🛡️12
```

**Combat Log:**
```
📜 Combat Log:
  • Adam uses Slash → Orc takes 15 damage!
  • Orc attacks → Adam - MISS!
  • Sarah uses Fireball → Goblin takes 50 damage! ⚡ CRITICAL HIT!
  • Goblin is defeated!
```

**Miss Example:**
```
Adam uses Slash
  → Orc - MISS!
(Orc's defense was too high!)
```

**Critical Example:**
```
Sarah uses Fireball
  → Goblin takes 50 damage! ⚡ CRITICAL HIT!
  → Goblin is defeated!
(Normal: 25 damage, Crit: 50 damage)
```

## Tactical Strategies

### 1. Target Priority
- **High Defense Enemies (Troll):** Harder to hit, save for AOE or focus fire
- **Low Defense Enemies (Wizard, Wolf):** Easy targets, reliable damage
- **Medium Defense:** Balanced risk/reward

### 2. Defense Buffs
- **Wizard/Archer:** Use defensive buffs ASAP (low base defense)
- **Knight:** Already tanky, can skip defensive buffs
- **Rogue's Evade:** Best defensive buff (+20!)

### 3. Risk vs Reward
- **Low Hit Chance:** High risk, but if it lands...
- **High Hit Chance:** Reliable, consistent damage
- **Criticals:** Pure luck, but game-changing!

### 4. Team Composition
- **Need a Tank:** Knight has high defense
- **Protect the Wizard:** Lowest defense, needs help
- **Healer is Key:** Repair damage from misses/crits

## Game Balance

### Hit Chances at a Glance

**Attacking Enemies:**
- Goblin (8 def): **81%** hit
- Wolf (7 def): **82%** hit
- Dark Wizard (6 def): **82%** hit
- Skeleton (10 def): **80%** hit
- Orc (12 def): **79%** hit
- Troll (18 def): **76%** hit

**Enemies Attacking Heroes:**
- Wizard (5 def): **83%** hit - Wizard gets hit often!
- Archer (8 def): **81%** hit
- Cleric (10 def): **80%** hit
- Druid (11 def): **80%** hit
- Rogue (12 def): **79%** hit
- Knight (15 def): **78%** hit - Knight is hard to hit!

### Critical Strike Impact

**Average Damage Increase:**
- Without crits: 100% damage
- With 5% crit rate: 105% average damage
- Over many rounds: +5% total damage output

**Dramatic Moments:**
- Boss at 35 HP, Archer aims shot (35 dmg)
- Crit! 70 damage → Boss defeated in one hit! 
- Creates exciting, unpredictable moments

## Code Implementation

### Hit Chance Calculation
```javascript
function calculateHitChance(targetDefense) {
  const baseHitChance = 85;
  const defenseReduction = targetDefense / 2;
  const hitChance = Math.max(20, Math.min(95, baseHitChance - defenseReduction));
  return Math.round(hitChance);
}
```

### Attack Resolution
```javascript
function resolveAttack(baseDamage, targetDefense) {
  // Roll to hit
  const hitChance = calculateHitChance(targetDefense);
  const hitRoll = Math.random() * 100;
  
  if (hitRoll > hitChance) {
    return { hit: false, crit: false, damage: 0 };
  }
  
  // Roll for crit (5% chance)
  const critRoll = Math.random() * 100;
  const isCrit = critRoll < 5;
  const finalDamage = isCrit ? baseDamage * 2 : baseDamage;
  
  return { hit: true, crit: isCrit, damage: finalDamage };
}
```

## Files Modified

1. **`games/rpg/server.js`**
   - Added defense stats to all classes
   - Added defense stats to all enemies
   - Created `calculateHitChance()` function
   - Created `resolveAttack()` function
   - Updated `executePlayerAction()` for hit/miss/crit
   - Updated `executeEnemyAction()` for hit/miss/crit
   - Updated all combat updates to include defense
   - Updated target selection to include hit chance

2. **`games/rpg/client/player.js`**
   - Updated target buttons to show hit chance
   - Color-coded hit chance (green/yellow/red)
   - Shows defense value on targets

3. **`public/host.html`**
   - Display defense values for players
   - Display defense values for enemies
   - Format: HP ⚡Speed 🛡️Defense

## Expected Results

### What Players See

**Selecting Target:**
```
👹 Orc
🎯 Hit Chance: 79%  (green - good chance)
🛡️ Defense: 12

👹 Troll
🎯 Hit Chance: 76%  (yellow - risky)
🛡️ Defense: 18
```

### What Host Sees

**Combat Log:**
```
Round 1:
  • Knight uses Slash → Orc takes 15 damage!
  • Orc attacks → Knight - MISS!
  • Wizard uses Fireball → Goblin takes 50 damage! ⚡ CRITICAL HIT!
  • Goblin is defeated!
  • Cleric uses Smite → Troll - MISS!
  • Troll attacks → Wizard takes 14 damage!
```

**Health Bars:**
```
🛡️ Knight (Adam)
  ████████░░ 88/120 HP ⚡18 🛡️15

🧙 Wizard (Sarah)  
  ██████░░░░ 66/80 HP ⚡12 🛡️5
```

## Testing Checklist

- [ ] All classes show correct defense values
- [ ] All enemies show correct defense values
- [ ] Hit chance displays when selecting enemy targets
- [ ] Hit chance is color-coded (green/yellow/red)
- [ ] Attacks can miss (see "MISS!" in combat log)
- [ ] Critical hits occur (~5% of attacks)
- [ ] Critical hits show "⚡ CRITICAL HIT!" on host
- [ ] Critical damage is doubled
- [ ] Defense buffs increase hit avoidance
- [ ] Host screen shows all stats (HP, Speed, Defense)

## Balance Notes

### Why These Numbers?

**Base 85% Hit:**
- Most attacks should hit
- Defense makes a difference
- Still some risk of failure

**5% Crit Rate:**
- Rare enough to be exciting
- Frequent enough to see occasionally
- Game-changing without being OP

**Defense Values:**
- Spread from 5 to 18
- Meaningful differences (3-9% hit reduction)
- Tanks are noticeably harder to hit

### Adjusting Balance

**Make crits more common:**
```javascript
// In resolveAttack(), change:
const isCrit = critRoll < 5;  // 5% chance
// To:
const isCrit = critRoll < 10;  // 10% chance
```

**Make defense more impactful:**
```javascript
// In calculateHitChance(), change:
const defenseReduction = targetDefense / 2;
// To:
const defenseReduction = targetDefense;  // Full defense value
```

**Change base hit chance:**
```javascript
// Current: 85% base
const baseHitChance = 85;
// More reliable: 90% base
const baseHitChance = 90;
// More risky: 75% base
const baseHitChance = 75;
```

---

**Combat is now more dynamic with misses, crits, and tactical defense play!** ⚔️✨


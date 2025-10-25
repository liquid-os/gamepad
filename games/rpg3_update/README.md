# 🎮 Co-op RPG Quest

A cooperative RPG party game where players choose classes and battle enemies together!

## Game Overview

**Players:** 2-6  
**Duration:** 10-20 minutes per session  
**Type:** Co-op RPG, Turn-based Combat

## How to Play

### 1. Class Selection Phase

Each player chooses from 6 unique classes:

| Class | HP | Role | Special Abilities |
|-------|-----|------|-------------------|
| 🛡️ **Knight** | 120 | Tank | High defense, can taunt enemies |
| 🧙 **Wizard** | 80 | DPS | Powerful magic attacks, AoE damage |
| ✨ **Cleric** | 100 | Healer | Healing spells, can resurrect allies |
| 🗡️ **Rogue** | 90 | DPS | High damage, stealth attacks, poison |
| 🏹 **Archer** | 95 | DPS | Ranged attacks, multi-shot, traps |
| 🌿 **Druid** | 105 | Support | Healing, nature magic, shapeshifting |

**Important:** Only 1 player can be each class!

### 2. Combat Phase

#### Initiative System
- At the start of each round, everyone (players + enemies) rolls 1d20 for speed
- Turn order is determined by speed roll (highest goes first)
- Speed is displayed above health bars

#### Action Selection
- Each player gets **3 random actions** from their class's action list each round
- Choose 1 action to perform that round
- Some actions require selecting a target (enemy or ally)

#### Combat Resolution
- Actions are resolved in turn order
- Damage, healing, and buffs are applied
- Combat continues until all enemies or all players are defeated

### 3. Victory or Defeat

**Victory:** Defeat all enemies!  
**Defeat:** All players reach 0 HP

## Class Actions

### Knight Actions
- **Slash** - 15 damage to enemy
- **Shield Bash** - 10 damage + stun
- **Defend** - +10 defense to self
- **Taunt** - Force enemy to target you
- **Charge** - 20 damage to enemy
- **Rally** - Heal all allies for 5 HP

### Wizard Actions
- **Fireball** - 25 damage to enemy
- **Ice Spike** - 18 damage + slow
- **Lightning** - 22 damage to enemy
- **Magic Shield** - +15 defense to self
- **Arcane Blast** - 15 damage to all enemies
- **Mana Restore** - Heal self for 10 HP

### Cleric Actions
- **Heal** - 20 HP to ally
- **Smite** - 18 damage to enemy
- **Prayer** - Heal all allies for 10 HP
- **Bless** - +8 defense to ally
- **Holy Light** - 15 damage to enemy + heal self 10 HP
- **Resurrect** - Revive a defeated ally

### Rogue Actions
- **Backstab** - 30 damage to enemy (high damage!)
- **Poison** - 10 damage + 5 damage over time
- **Evade** - +20 defense to self
- **Steal** - Special effect
- **Smoke Bomb** - +15 defense to all allies
- **Quick Strike** - 12 damage to enemy

### Archer Actions
- **Arrow Shot** - 20 damage to enemy
- **Multi Shot** - 12 damage to all enemies
- **Aimed Shot** - 35 damage to enemy (highest single-target!)
- **Trap** - 15 damage + stun
- **Retreat** - +12 defense to self
- **Volley** - 18 damage to enemy

### Druid Actions
- **Nature's Wrath** - 18 damage to enemy
- **Healing Touch** - 18 HP to ally
- **Entangle** - 12 damage + stun
- **Rejuvenate** - Heal all allies for 8 HP
- **Wild Shape** - 25 damage to enemy
- **Thorns** - +10 defense to self

## Enemy Types

Combat features 1-4 random enemies from:

- **Goblin** - 40 HP, 8 damage, 12 speed
- **Orc** - 60 HP, 12 damage, 8 speed
- **Skeleton** - 45 HP, 10 damage, 10 speed
- **Wolf** - 50 HP, 11 damage, 15 speed (fast!)
- **Dark Wizard** - 55 HP, 15 damage, 9 speed
- **Troll** - 80 HP, 14 damage, 6 speed (slow but tough)

## Strategy Tips

1. **Team Composition Matters**
   - Always have a Cleric for healing
   - Mix damage dealers with support classes
   - Knight is great for absorbing damage

2. **Action Economy**
   - You get 3 random actions each round
   - Plan based on what you're given
   - Coordinate with teammates

3. **Initiative is Key**
   - High speed roll = act first
   - Sometimes it's better to defend if you go early
   - Healers acting late can save lives

4. **Target Priority**
   - Focus fire on dangerous enemies
   - Protect low HP allies
   - Use crowd control effectively

## Technical Details

### Server Logic
- `server.js` - Game state management, combat resolution
- Classes defined with unique action lists
- Random action selection (3 per round)
- Turn-based combat with initiative rolls

### Client Interface
- `client/index.html` - Player UI structure
- `client/style.css` - Responsive styling
- `client/player.js` - Socket.IO communication

### Socket Events
- `selectClass` - Player chooses class
- `selectAction` - Player chooses action
- `selectTarget` - Player chooses target
- `combatStarted` - Combat phase begins
- `initiativeRolled` - Turn order determined
- `combatRoundResolved` - Round results
- `combatEnded` - Victory or defeat

## Future Enhancements

Planned features:
- ✅ Class selection
- ✅ Combat phase with initiative
- ✅ Action system with targeting
- ⏳ Camp phase (rest and level up)
- ⏳ Shop phase (buy items)
- ⏳ Puzzle phase (team challenges)
- ⏳ Items and equipment
- ⏳ Boss battles
- ⏳ Story campaign mode

## Development Notes

### Adding New Classes
1. Add class definition to `CLASSES` object in `server.js`
2. Define actions with types: attack, heal, buff, special
3. Add class icon to `CLASS_ICONS` in `player.js`

### Adding New Enemies
1. Add enemy template to `ENEMIES` array
2. Define health, damage, and speed stats
3. Optionally add special AI behaviors

### Adding New Actions
Actions can have these properties:
- `damage` - Damage dealt
- `heal` - HP restored
- `defense` - Defense bonus
- `stun` - Stun target
- `slow` - Slow target
- `dot` - Damage over time
- `target` - Who can be targeted (enemy, ally, self, all_allies, all_enemies)

## Credits

Created for the Party Game Hub platform  
Game Design: Co-op RPG Quest Team  
Framework: Node.js + Socket.IO + React

---

**Ready to embark on an epic adventure? Choose your class and let the quest begin!** ⚔️✨


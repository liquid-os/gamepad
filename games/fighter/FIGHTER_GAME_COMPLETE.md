# 🥊 Street Brawler - Complete Fighting Game

## Overview

A classic 2D fighting game where players use virtual controllers on their devices to control fighters displayed on the host screen (TV).

## 🎮 **Game Features**

### **Core Mechanics**
- **2 Players:** Head-to-head fighting
- **Virtual Controller:** D-pad + 3 attack buttons on player devices
- **Real-time Combat:** 60 FPS game loop
- **Physics:** Gravity, jumping, knockback
- **Attack System:** Light, medium, heavy attacks with different damage/range/cooldown

### **Fighter Selection**
- **2 Fighters:** Ryu and Ken
- **Unique Stats:** Different speed, jump power, and attack properties
- **One fighter per player**

### **Combat System**
- **Movement:** Left/right walking
- **Jumping:** Press up to jump
- **Attacks:** 3 buttons for different attack types
- **Range Detection:** Attacks only hit if in range
- **Facing Detection:** Must face opponent to hit
- **Knockback:** Successful hits push opponent back
- **Stun:** Brief stun on hit (300ms)
- **Cooldowns:** Prevent attack spam

## 🎯 **Fighter Stats**

### **Ryu** 🥋
- **Health:** 100
- **Speed:** 5
- **Jump Power:** 15
- **Color:** Red
- **Attacks:**
  - Light (A): 5 damage, 80 range, 300ms cooldown
  - Medium (B): 10 damage, 100 range, 500ms cooldown
  - Heavy (X): 20 damage, 120 range, 800ms cooldown

### **Ken** 🥊
- **Health:** 100
- **Speed:** 6 (faster!)
- **Jump Power:** 14
- **Color:** Blue
- **Attacks:**
  - Light (A): 6 damage, 70 range, 250ms cooldown
  - Medium (B): 12 damage, 90 range, 450ms cooldown
  - Heavy (X): 18 damage, 110 range, 750ms cooldown

**Balance:**
- Ken: Faster movement, faster attacks, slightly less damage
- Ryu: Slower but more powerful, longer range

## 📱 **Player Controller Interface**

### **Virtual Controller Layout:**
```
┌─────────────────────────────────┐
│        Player Name              │
│     [Health Bar: 100/100]       │
├─────────────────────────────────┤
│                                 │
│        D-Pad          Buttons   │
│          ▲                      │
│        ◄   ►          [A] Light │
│          ▼            [B] Medium│
│                       [X] Heavy │
│                                 │
└─────────────────────────────────┘
```

### **Controls:**
- **D-Pad:**
  - ◄ Left: Move left
  - ► Right: Move right
  - ▲ Up: Jump
  - ▼ Down: (Reserved for future)

- **Action Buttons:**
  - **A (Red):** Light attack (fast, low damage)
  - **B (Blue):** Medium attack (balanced)
  - **X (Green):** Heavy attack (slow, high damage)

### **Touch Support:**
- Full touch screen support
- Responsive button presses
- Visual feedback on press

## 🖥️ **Host Screen Display**

### **Visual Elements:**
- **Background:** Sky gradient + ground
- **Fighters:** Colored rectangles with heads
- **Health Bars:** Top corners with player names
- **Hit Effects:** Damage numbers pop up on hit
- **Animations:** Walking, jumping, attacking states
- **Auto-facing:** Fighters always face each other

### **HUD:**
```
┌────────────────────────────────────────┐
│ Player 1        [Timer: 99]    Player 2│
│ [████████░░] 80/100      100/100 [████]│
└────────────────────────────────────────┘
```

### **Announcements:**
- **"FIGHT!"** - Round start
- **"K.O.!"** - Fighter defeated
- **"[Winner] WINS!"** - Victory screen

## ⚔️ **Combat Mechanics**

### **Attack System:**
```javascript
Light Attack:
- Damage: 5-6
- Range: 70-80
- Cooldown: 250-300ms
- Use: Quick pokes, combos

Medium Attack:
- Damage: 10-12
- Range: 90-100
- Cooldown: 450-500ms
- Use: Balanced damage

Heavy Attack:
- Damage: 18-20
- Range: 110-120
- Cooldown: 750-800ms
- Use: Punish, big damage
```

### **Physics:**
- **Gravity:** 0.8 units/frame
- **Ground:** Fixed Y position
- **Bounds:** Fighters can't leave screen
- **Knockback:** 30 pixels on hit
- **Stun:** 300ms after being hit

### **Hit Detection:**
```javascript
// Must meet all conditions:
1. Opponent in attack range
2. Facing opponent
3. Attack active
4. Not on cooldown

if (distance <= attackRange && facingOpponent) {
  // HIT!
  dealDamage();
  applyKnockback();
  applyStun();
}
```

## 🎯 **Gameplay Flow**

### **Match Flow:**
```
1. Character Selection
   - Both players choose fighter
   
2. "FIGHT!" Announcement
   - 2-second countdown
   
3. Combat
   - Move with D-pad
   - Attack with buttons
   - First to 0 HP loses
   
4. "K.O.!" Announcement
   - Winner declared
   
5. "[Winner] WINS!"
   - 5-second victory screen
   
6. Return to Character Selection
```

### **Strategy:**
- **Spacing:** Stay at optimal range for your attacks
- **Timing:** Wait for opponent's attack cooldown
- **Movement:** Use mobility to dodge and position
- **Attack Choice:** Light for speed, heavy for damage
- **Knockback:** Use to create distance or corner opponent

## 🔧 **Technical Implementation**

### **Server-Side (60 FPS Game Loop):**
- Physics simulation
- Input processing
- Collision detection
- Health management
- Win condition checking
- State synchronization

### **Client-Side (Player):**
- Virtual controller interface
- Touch/mouse input handling
- Real-time input sending
- Health bar updates

### **Client-Side (Host):**
- Canvas rendering
- Fighter animation
- HUD display
- Hit effects
- Announcements

### **Real-Time Communication:**
- Input: Player → Server (every button press)
- Update: Server → Host (20 times/second)
- Events: Server → All (hits, KO, etc.)

## 📁 **File Structure**

```
games/fighter/
├── game.json                 # Game metadata
├── server.js                 # Server logic + game loop
├── client/
│   ├── index.html           # Player controller
│   ├── player.js            # Controller logic
│   ├── style.css            # Controller styles
│   ├── host-scene.html      # Fighting game display
│   └── host-scene.js        # Rendering + animations
└── assets/
    └── (future sprite images)
```

## 🚀 **Testing the Game**

### **Setup:**
1. Start server: `npm start`
2. Open host screen on TV
3. Create lobby
4. Join with 2 player devices

### **Test Checklist:**
- ✅ Character selection works
- ✅ Both players can choose fighters
- ✅ One fighter per player limit
- ✅ Controller appears after selection
- ✅ D-pad moves fighter
- ✅ Jump button works
- ✅ Attack buttons work
- ✅ Attacks deal damage
- ✅ Health bars update
- ✅ Knockback works
- ✅ Win condition triggers
- ✅ Game resets after match

## 🎯 **Future Enhancements**

### **Potential Additions:**
- More fighters with unique movesets
- Special moves (hadouken, etc.)
- Blocking/parrying
- Combo system
- Super meter
- Stage hazards
- Character sprites
- Sound effects
- Rounds system (best of 3)
- Tournament mode

## 📊 **Performance**

### **Optimizations:**
- 60 FPS server game loop
- Throttled updates to host (20 FPS)
- Efficient collision detection
- Canvas rendering
- Minimal network traffic

### **Latency Handling:**
- Immediate visual feedback on button press
- Server authoritative for hits
- Smooth interpolation

---

**🥊 Street Brawler is complete and ready to play! 🥊**

**Players can now enjoy classic 2D fighting action with virtual controllers, real-time combat, and competitive 1v1 battles!** 🎮⚔️🏆

**The game features responsive controls, smooth animations, and exciting fighting game mechanics!** 🔥✨

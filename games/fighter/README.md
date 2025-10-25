# 🥊 Street Brawler

## Quick Start

A classic 2D fighting game where players use virtual controllers on their phones/tablets to control fighters on the TV screen.

## 🎮 How to Play

### **Setup:**
1. Host creates a lobby on TV
2. Select "Street Brawler" game
3. 2 players join with their devices
4. Each player selects a fighter
5. Fight begins automatically!

### **Controls (Player Device):**
- **D-Pad:**
  - ◄ Move Left
  - ► Move Right
  - ▲ Jump
  
- **Action Buttons:**
  - **A (Red):** Light Attack - Fast, 5-6 damage
  - **B (Blue):** Medium Attack - Balanced, 10-12 damage
  - **X (Green):** Heavy Attack - Slow, 18-20 damage

### **Objective:**
Reduce opponent's health to 0 to win!

## 🥋 **Fighters**

### **Ryu** 🥋
- Balanced fighter
- Powerful attacks
- Good range
- Moderate speed

### **Ken** 🥊
- Speed fighter
- Fast attacks
- Shorter range
- High mobility

## 🎯 **Strategy Tips**

1. **Spacing:** Keep optimal distance for your attacks
2. **Timing:** Wait for opponent's cooldowns
3. **Movement:** Use mobility to dodge
4. **Attack Choice:** 
   - Light: Quick pokes, safe
   - Medium: Balanced damage
   - Heavy: Punish mistakes
5. **Knockback:** Use to create space or corner opponent

## 🔧 **Technical Details**

- **Game Loop:** 60 FPS server-side
- **Input:** Real-time controller input
- **Rendering:** Canvas-based on host
- **Physics:** Gravity, collision, knockback
- **Netcode:** Optimized for low latency

## 📁 **Files**

- `game.json` - Game metadata
- `server.js` - Game logic + physics
- `client/index.html` - Player controller
- `client/player.js` - Controller logic
- `client/style.css` - Controller styles
- `client/host-scene.html` - Fight display
- `client/host-scene.js` - Rendering

---

**Ready to fight! Choose your fighter and battle for victory!** 🥊⚔️🏆


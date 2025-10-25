// Street Brawler - Host Scene

// Get socket from parent window
const socket = window.parent.socket;
const currentCode = window.parent.currentCode;

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Game state
let fighters = [];
let gameActive = false;

// HUD elements
const player1Name = document.getElementById('player1Name');
const player1Health = document.getElementById('player1Health');
const player1HealthText = document.getElementById('player1HealthText');
const player2Name = document.getElementById('player2Name');
const player2Health = document.getElementById('player2Health');
const player2HealthText = document.getElementById('player2HealthText');

// Fighter colors
const FIGHTER_COLORS = {
  ryu: '#ef4444',
  ken: '#3b82f6'
};

// ========== SOCKET EVENTS ==========

socket.on('fightStarted', (data) => {
  console.log('Fight started:', data);
  fighters = data.fighters;
  gameActive = true;
  
  // Update HUD
  if (fighters.length >= 2) {
    player1Name.textContent = fighters[0].username;
    player2Name.textContent = fighters[1].username;
    updateHealthBars();
  }
  
  // Show round announcement
  showRoundAnnouncement('FIGHT!');
});

socket.on('gameUpdate', (data) => {
  if (!gameActive) return;
  
  fighters = data.fighters;
  updateHealthBars();
  render();
});

socket.on('attackHit', (data) => {
  console.log('Attack hit:', data);
  showHitEffect(data);
});

socket.on('fightEnded', (data) => {
  console.log('Fight ended:', data);
  gameActive = false;
  
  showKOAnnouncement();
  
  setTimeout(() => {
    showRoundAnnouncement(`${data.winner} WINS!`);
  }, 1500);
});

// ========== RENDERING ==========

function render() {
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw ground line
  ctx.strokeStyle = '#654321';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, canvas.height * 0.83);
  ctx.lineTo(canvas.width, canvas.height * 0.83);
  ctx.stroke();
  
  // Draw fighters
  fighters.forEach(fighter => {
    drawFighter(fighter);
  });
}

function drawFighter(fighter) {
  const scale = canvas.width / 1920; // Scale to screen size
  const x = fighter.x * scale;
  const y = fighter.y * scale;
  const width = 80 * scale;
  const height = 120 * scale;
  
  const color = FIGHTER_COLORS[fighter.fighterId] || '#ffffff';
  
  ctx.save();
  
  // Flip sprite if facing left
  if (!fighter.facingRight) {
    ctx.translate(x + width / 2, y + height / 2);
    ctx.scale(-1, 1);
    ctx.translate(-(x + width / 2), -(y + height / 2));
  }
  
  // Draw fighter body
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, height);
  
  // Draw head
  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.arc(x + width / 2, y + 20 * scale, 15 * scale, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw attack indicator
  if (fighter.isAttacking) {
    ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
    const attackRange = fighter.facingRight ? 1 : -1;
    ctx.fillRect(
      x + (fighter.facingRight ? width : -100 * scale),
      y + 40 * scale,
      100 * scale,
      40 * scale
    );
  }
  
  // Draw name
  ctx.fillStyle = 'white';
  ctx.font = `bold ${16 * scale}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText(fighter.username, x + width / 2, y - 10 * scale);
  
  ctx.restore();
}

function updateHealthBars() {
  if (fighters.length >= 2) {
    // Player 1
    const p1Percentage = (fighters[0].health / fighters[0].maxHealth) * 100;
    player1Health.style.width = p1Percentage + '%';
    player1HealthText.textContent = `${fighters[0].health}/${fighters[0].maxHealth}`;
    
    // Player 2
    const p2Percentage = (fighters[1].health / fighters[1].maxHealth) * 100;
    player2Health.style.width = p2Percentage + '%';
    player2HealthText.textContent = `${fighters[1].health}/${fighters[1].maxHealth}`;
  }
}

// ========== EFFECTS ==========

function showRoundAnnouncement(text) {
  const announcement = document.createElement('div');
  announcement.className = 'round-announcement';
  announcement.textContent = text;
  document.body.appendChild(announcement);
  
  setTimeout(() => {
    announcement.remove();
  }, 2000);
}

function showKOAnnouncement() {
  const ko = document.createElement('div');
  ko.className = 'ko-announcement';
  ko.textContent = 'K.O.!';
  document.body.appendChild(ko);
  
  setTimeout(() => {
    ko.remove();
  }, 2000);
}

function showHitEffect(data) {
  const fighter = fighters.find(f => f.id === data.targetId);
  if (!fighter) return;
  
  const scale = canvas.width / 1920;
  const x = fighter.x * scale;
  const y = fighter.y * scale;
  
  const hitText = document.createElement('div');
  hitText.className = 'hit-effect';
  hitText.textContent = `${data.damage}`;
  hitText.style.left = x + 'px';
  hitText.style.top = y + 'px';
  document.body.appendChild(hitText);
  
  setTimeout(() => {
    hitText.remove();
  }, 500);
}

// ========== ANIMATION LOOP ==========

function animate() {
  if (gameActive) {
    render();
  }
  requestAnimationFrame(animate);
}

// Start animation loop
animate();

console.log('Host scene initialized');


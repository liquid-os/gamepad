const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [20, 'Username must be less than 20 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  avatar: {
    type: String,
    default: '🎮' // Default avatar emoji
  },
  gamesPlayed: {
    type: Number,
    default: 0
  },
  totalScore: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  ownedGames: [{
    gameId: {
      type: String,
      required: true
    },
    purchasedAt: {
      type: Date,
      default: Date.now
    }
  }],
  coins: {
    type: Number,
    default: 100 // Starting coins for new users
  },
  freeGames: [{
    gameId: {
      type: String,
      required: true
    },
    grantedAt: {
      type: Date,
      default: Date.now
    }
  }]
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Update last login
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save();
};

// Grant free games to user
userSchema.methods.grantFreeGames = function(freeGameIds) {
  const config = require('../config');
  const gamesToGrant = freeGameIds || config.FREE_GAMES;
  
  gamesToGrant.forEach(gameId => {
    // Only add if not already owned or granted
    const alreadyOwned = this.ownedGames.some(owned => owned.gameId === gameId);
    const alreadyGranted = this.freeGames.some(free => free.gameId === gameId);
    
    if (!alreadyOwned && !alreadyGranted) {
      this.freeGames.push({
        gameId: gameId,
        grantedAt: new Date()
      });
    }
  });
  
  return this.save();
};

// Get all games user has access to (owned + free)
userSchema.methods.getAllAccessibleGames = function() {
  const ownedGameIds = this.ownedGames.map(owned => owned.gameId);
  const freeGameIds = this.freeGames.map(free => free.gameId);
  return [...new Set([...ownedGameIds, ...freeGameIds])];
};

module.exports = mongoose.model('User', userSchema);

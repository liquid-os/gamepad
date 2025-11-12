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
  
  // User roles and permissions
  role: {
    type: String,
    enum: ['player', 'creator', 'admin'],
    default: 'player'
  },
  
  // Creator-specific fields
  creatorProfile: {
    studioName: {
      type: String,
      trim: true,
      maxlength: [50, 'Studio name must be less than 50 characters']
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [500, 'Bio must be less than 500 characters']
    },
    website: {
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: 'Website must be a valid URL'
      }
    },
    verified: {
      type: Boolean,
      default: false
    },
    payoutEmail: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid payout email']
    }
  },
  
  // Creator statistics
  creatorStats: {
    gamesPublished: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    totalDownloads: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalReviews: {
      type: Number,
      default: 0
    }
  },
  
  // Financial
  creatorBalance: {
    type: Number,
    default: 0
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
  creatorSince: {
    type: Date
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
userSchema.methods.grantFreeGames = async function(freeGameIds) {
  const { getCoreGameIds } = require('../utils/coreGames');
  const gamesToGrant = freeGameIds || await getCoreGameIds();
  const uniqueGameIds = Array.from(new Set((gamesToGrant || []).filter(Boolean)));
  
  uniqueGameIds.forEach(gameId => {
    const alreadyOwned = this.ownedGames.some(owned => owned.gameId === gameId);
    const alreadyGranted = this.freeGames.some(free => free.gameId === gameId);
    
    if (!alreadyOwned && !alreadyGranted) {
      this.freeGames.push({
        gameId,
        grantedAt: new Date()
      });
    }
  });
  
  await this.save();
  return this;
};

// Get all games user has access to (owned + free)
userSchema.methods.getAllAccessibleGames = function() {
  const ownedGameIds = this.ownedGames.map(owned => owned.gameId);
  const freeGameIds = this.freeGames.map(free => free.gameId);
  return [...new Set([...ownedGameIds, ...freeGameIds])];
};

// Creator methods
userSchema.methods.promoteToCreator = function(creatorData = {}) {
  this.role = 'creator';
  this.creatorProfile = {
    ...this.creatorProfile,
    ...creatorData
  };
  if (!this.creatorSince) {
    this.creatorSince = new Date();
  }
  return this.save();
};

userSchema.methods.updateCreatorStats = function(stats) {
  this.creatorStats = {
    ...this.creatorStats,
    ...stats
  };
  return this.save();
};

userSchema.methods.canPublishGames = function() {
  return this.role === 'creator' || this.role === 'admin';
};

userSchema.methods.isVerifiedCreator = function() {
  return this.role === 'creator' && this.creatorProfile.verified;
};

// Indexes for better performance
userSchema.index({ role: 1 });
userSchema.index({ 'creatorProfile.verified': 1 });
userSchema.index({ 'creatorStats.totalRevenue': -1 });

// Set creatorSince when role changes to creator
userSchema.pre('save', function(next) {
  if (this.isModified('role') && this.role === 'creator' && !this.creatorSince) {
    this.creatorSince = new Date();
  }
  next();
});

module.exports = mongoose.model('User', userSchema);

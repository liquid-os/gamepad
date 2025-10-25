const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    default: 0
  },
  minPlayers: {
    type: Number,
    required: true,
    default: 2
  },
  maxPlayers: {
    type: Number,
    required: true,
    default: 8
  },
  category: {
    type: String,
    enum: ['strategy', 'trivia', 'word', 'action', 'puzzle', 'rpg'],
    default: 'strategy'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  thumbnail: {
    type: String,
    default: '🎮'
  },
  logo: {
    type: String,
    default: null // Path to logo file: /game-logos/{gameId}.png
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    caption: {
      type: String,
      default: ''
    },
    isMain: {
      type: Boolean,
      default: false
    }
  }],
  ratings: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    review: {
      type: String,
      default: ''
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalRatings: {
    type: Number,
    default: 0
  },
  searchKeywords: [{
    type: String
  }],
  
  // Dynamic loading fields
  serverCode: {
    type: String,
    required: false // Not required for existing games
  },
  clientCode: {
    type: String,
    required: false
  },
  assets: [{
    filename: {
      type: String,
      required: true
    },
    data: {
      type: Buffer,
      required: true
    },
    mimeType: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    }
  }],
  
  // Creator & Status
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Not required for existing games
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'rejected'],
    default: 'pending' // New games require approval
  },
  approved: {
    type: Boolean,
    default: false // Games need admin approval
  },
  submittedForApproval: {
    type: Boolean,
    default: false
  },
  hasPendingUpdate: {
    type: Boolean,
    default: false
  },
  pendingUpdatePath: {
    type: String,
    default: null
  },
  pendingUpdateSubmittedAt: {
    type: Date,
    default: null
  },
  version: {
    type: String,
    default: '1.0.0'
  },
  
  // Security & Validation
  codeHash: {
    type: String
  },
  lastValidated: {
    type: Date
  },
  validationErrors: [{
    type: String
  }],
  
  // Statistics
  downloadCount: {
    type: Number,
    default: 0
  },
  
  // Deployment tracking
  deployedAt: {
    type: Date,
    default: Date.now
  },
  folderPath: {
    type: String,
    default: null // Path to game folder in /games directory
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Method to update average rating
gameSchema.methods.updateAverageRating = function() {
  if (this.ratings.length === 0) {
    this.averageRating = 0;
    this.totalRatings = 0;
  } else {
    const sum = this.ratings.reduce((acc, rating) => acc + rating.rating, 0);
    this.averageRating = Math.round((sum / this.ratings.length) * 10) / 10; // Round to 1 decimal
    this.totalRatings = this.ratings.length;
  }
  return this.save();
};

// Method to add or update a rating
gameSchema.methods.addRating = async function(userId, rating, review = '') {
  // Remove existing rating from this user
  this.ratings = this.ratings.filter(r => !r.userId.equals(userId));
  
  // Add new rating
  this.ratings.push({
    userId,
    rating,
    review
  });
  
  // Update average rating
  await this.updateAverageRating();
  return this;
};

// Static method to search games
gameSchema.statics.searchGames = function(query, category, sortBy = 'averageRating') {
  let searchQuery = { isActive: true };
  
  // Add category filter
  if (category && category !== 'all') {
    searchQuery.category = category;
  }
  
  // Add text search
  if (query && query.trim()) {
    const searchRegex = new RegExp(query.trim(), 'i');
    searchQuery.$or = [
      { name: searchRegex },
      { description: searchRegex },
      { searchKeywords: { $in: [searchRegex] } }
    ];
  }
  
  // Sort options
  let sort = {};
  switch (sortBy) {
    case 'averageRating':
      sort = { averageRating: -1, totalRatings: -1, createdAt: -1 };
      break;
    case 'newest':
      sort = { createdAt: -1 };
      break;
    case 'price_low':
      sort = { price: 1 };
      break;
    case 'price_high':
      sort = { price: -1 };
      break;
    case 'name':
      sort = { name: 1 };
      break;
    default:
      sort = { averageRating: -1, totalRatings: -1, createdAt: -1 };
  }
  
  return this.find(searchQuery).sort(sort);
};

// Static method to get approved games for dynamic loading
gameSchema.statics.getApprovedGames = function() {
  return this.find({ 
    approved: true,
    isActive: true 
  }).populate('creatorId', 'username creatorProfile.studioName');
};

// Method to validate game code
gameSchema.methods.validateCode = function() {
  const crypto = require('crypto');
  const errors = [];
  
  // Check if server code exists and is valid
  if (!this.serverCode) {
    errors.push('Server code is required');
  } else {
    // Basic syntax validation
    try {
      new Function(this.serverCode);
    } catch (error) {
      errors.push(`Server code syntax error: ${error.message}`);
    }
  }
  
  // Check if client code exists
  if (!this.clientCode) {
    errors.push('Client code is required');
  }
  
  // Update validation results
  this.validationErrors = errors;
  this.lastValidated = new Date();
  this.codeHash = crypto.createHash('sha256').update(this.serverCode + this.clientCode).digest('hex');
  
  return errors.length === 0;
};

// Method to increment download count
gameSchema.methods.incrementDownloads = function() {
  this.downloadCount += 1;
  return this.save();
};

// Method to check if game is deployed to file system
gameSchema.methods.isDeployed = function() {
  const path = require('path');
  const fs = require('fs');
  
  if (!this.folderPath) {
    return false;
  }
  
  const fullPath = path.join(__dirname, '..', 'games', this.id);
  const serverPath = path.join(fullPath, 'server.js');
  
  return fs.existsSync(serverPath);
};

// Method to get deployment path
gameSchema.methods.getDeploymentPath = function() {
  const path = require('path');
  return path.join(__dirname, '..', 'games', this.id);
};

// Indexes for better performance
gameSchema.index({ status: 1 });
gameSchema.index({ creatorId: 1 });
gameSchema.index({ 'creatorId': 1, status: 1 });

module.exports = mongoose.model('Game', gameSchema);

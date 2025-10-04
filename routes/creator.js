const express = require('express');
const multer = require('multer');
const JSZip = require('jszip');
const crypto = require('crypto');
const path = require('path');
const User = require('../models/User');
const Game = require('../models/Game');
const { requireAuth } = require('../middleware/auth');
const gameLoader = require('../utils/DynamicGameLoader');
const router = express.Router();

// File upload configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/zip' || file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP files are allowed'), false);
    }
  }
});

// Middleware to check if user can publish games
const requireCreator = (req, res, next) => {
  if (!req.user || !req.user.canPublishGames()) {
    return res.status(403).json({
      success: false,
      message: 'Creator permissions required'
    });
  }
  next();
};

// Validate game file structure and content
async function validateGameFile(buffer) {
  const errors = [];
  const warnings = [];
  
  try {
    const zip = await JSZip.loadAsync(buffer);
    const files = Object.keys(zip.files);
    
    // Check for required files
    const requiredFiles = ['server.js', 'client/index.html', 'client/player.js'];
    const missingFiles = requiredFiles.filter(file => !files.includes(file));
    
    if (missingFiles.length > 0) {
      errors.push(`Missing required files: ${missingFiles.join(', ')}`);
    }
    
    // Check for server.js
    if (files.includes('server.js')) {
      try {
        const serverCode = await zip.files['server.js'].async('string');
        
        // Basic validation
        if (!serverCode.trim()) {
          errors.push('server.js is empty');
        } else {
          // Check for required exports
          const requiredExports = ['meta', 'onInit', 'onPlayerJoin', 'onAction'];
          const missingExports = requiredExports.filter(exp => !serverCode.includes(`exports.${exp}`) && !serverCode.includes(`module.exports.${exp}`));
          
          if (missingExports.length > 0) {
            errors.push(`server.js missing required exports: ${missingExports.join(', ')}`);
          }
          
          // Check for dangerous code patterns
          const dangerousPatterns = [
            /require\s*\(\s*['"`]fs['"`]\s*\)/,
            /require\s*\(\s*['"`]child_process['"`]\s*\)/,
            /require\s*\(\s*['"`]os['"`]\s*\)/,
            /require\s*\(\s*['"`]net['"`]\s*\)/,
            /require\s*\(\s*['"`]http['"`]\s*\)/,
            /process\./,
            /global\./,
            /__dirname/,
            /__filename/
          ];
          
          dangerousPatterns.forEach(pattern => {
            if (pattern.test(serverCode)) {
              errors.push(`server.js contains dangerous code pattern: ${pattern.source}`);
            }
          });
        }
      } catch (error) {
        errors.push(`Error reading server.js: ${error.message}`);
      }
    }
    
    // Check file sizes
    const maxFileSize = 5 * 1024 * 1024; // 5MB per file
    for (const [filename, file] of Object.entries(zip.files)) {
      if (!file.dir && file.uncompressedSize > maxFileSize) {
        warnings.push(`File ${filename} is larger than 5MB (${Math.round(file.uncompressedSize / 1024 / 1024)}MB)`);
      }
    }
    
    // Check for too many files
    if (files.length > 50) {
      warnings.push(`Game contains ${files.length} files, which is quite large`);
    }
    
  } catch (error) {
    errors.push(`Invalid ZIP file: ${error.message}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// Extract and sanitize game files
async function extractGameFiles(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const files = Object.keys(zip.files);
  
  const result = {
    serverCode: '',
    clientCode: '',
    assets: []
  };
  
  // Extract server code
  if (files.includes('server.js')) {
    result.serverCode = await zip.files['server.js'].async('string');
  }
  
  // Extract client code
  if (files.includes('client/index.html')) {
    result.clientCode = await zip.files['client/index.html'].async('string');
  }
  
  // Extract assets
  for (const [filename, file] of Object.entries(zip.files)) {
    if (!file.dir && filename.startsWith('assets/')) {
      const data = await file.async('nodebuffer');
      const mimeType = getMimeType(filename);
      
      result.assets.push({
        filename: path.basename(filename),
        data: data,
        mimeType: mimeType,
        size: data.length
      });
    }
  }
  
  return result;
}

// Get MIME type from filename
function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm'
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}

// Sanitize game code
function sanitizeGameCode(code) {
  // Remove potentially dangerous patterns
  let sanitized = code;
  
  // Remove comments that might contain dangerous code
  sanitized = sanitized.replace(/\/\*[\s\S]*?\*\//g, '');
  sanitized = sanitized.replace(/\/\/.*$/gm, '');
  
  // Basic cleanup
  sanitized = sanitized.trim();
  
  return sanitized;
}

// Promote user to creator
router.post('/become-creator', requireAuth, async (req, res) => {
  try {
    const { studioName, bio, website, payoutEmail } = req.body;
    
    if (req.user.role === 'creator' || req.user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'User is already a creator'
      });
    }
    
    // Validate required fields
    if (!studioName || studioName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Studio name is required (minimum 2 characters)'
      });
    }
    
    await req.user.promoteToCreator({
      studioName: studioName.trim(),
      bio: bio?.trim() || '',
      website: website?.trim() || '',
      payoutEmail: payoutEmail?.trim() || ''
    });
    
    res.json({
      success: true,
      message: 'Successfully became a creator!',
      user: {
        role: req.user.role,
        creatorProfile: req.user.creatorProfile
      }
    });
    
  } catch (error) {
    console.error('Become creator error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to become creator'
    });
  }
});

// Upload game
router.post('/upload-game', requireAuth, requireCreator, upload.single('gameFile'), async (req, res) => {
  try {
    const { name, description, price, minPlayers, maxPlayers, category } = JSON.parse(req.body.gameData);
    const gameFile = req.file;
    
    // Validate input
    if (!gameFile) {
      return res.status(400).json({
        success: false,
        message: 'Game file is required'
      });
    }
    
    if (!name || !description) {
      return res.status(400).json({
        success: false,
        message: 'Game name and description are required'
      });
    }
    
    // Validate game file
    const validation = await validateGameFile(gameFile.buffer);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Game validation failed',
        errors: validation.errors,
        warnings: validation.warnings
      });
    }
    
    // Extract game files
    const extractedGame = await extractGameFiles(gameFile.buffer);
    const sanitizedCode = sanitizeGameCode(extractedGame.serverCode);
    
    // Generate unique game ID
    const gameId = name.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    // Check if game ID already exists
    const existingGame = await Game.findOne({ id: gameId });
    if (existingGame) {
      return res.status(400).json({
        success: false,
        message: 'A game with this name already exists. Please choose a different name.'
      });
    }
    
    // Create game
    const game = new Game({
      id: gameId,
      name: name.trim(),
      description: description.trim(),
      price: parseInt(price) || 0,
      minPlayers: parseInt(minPlayers) || 2,
      maxPlayers: parseInt(maxPlayers) || 8,
      category: category || 'strategy',
      creatorId: req.user._id,
      status: req.user.role === 'admin' ? 'approved' : 'pending',
      serverCode: sanitizedCode,
      clientCode: extractedGame.clientCode,
      assets: extractedGame.assets,
      thumbnail: '🎮' // Default thumbnail
    });
    
    // Validate game code
    const codeValid = game.validateCode();
    if (!codeValid) {
      return res.status(400).json({
        success: false,
        message: 'Game code validation failed',
        errors: game.validationErrors
      });
    }
    
    await game.save();
    
    // If admin uploaded, load the game immediately
    if (req.user.role === 'admin') {
      await gameLoader.reloadGame(game.id);
    }
    
    // Update creator stats
    await req.user.updateCreatorStats({
      gamesPublished: req.user.creatorStats.gamesPublished + 1
    });
    
    res.json({
      success: true,
      message: req.user.role === 'admin' ? 'Game uploaded and approved!' : 'Game uploaded successfully! It will be reviewed before approval.',
      game: {
        id: game.id,
        name: game.name,
        status: game.status
      }
    });
    
  } catch (error) {
    console.error('Upload game error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload game'
    });
  }
});

// Get creator's games
router.get('/my-games', requireAuth, requireCreator, async (req, res) => {
  try {
    const { status } = req.query;
    
    const query = { creatorId: req.user._id };
    if (status) {
      query.status = status;
    }
    
    const games = await Game.find(query)
      .sort({ createdAt: -1 })
      .select('-serverCode -clientCode -assets');
    
    res.json({
      success: true,
      games: games
    });
    
  } catch (error) {
    console.error('Get my games error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get games'
    });
  }
});

// Update game
router.put('/game/:gameId', requireAuth, requireCreator, async (req, res) => {
  try {
    const { gameId } = req.params;
    const { name, description, price, minPlayers, maxPlayers, category } = req.body;
    
    const game = await Game.findOne({ id: gameId, creatorId: req.user._id });
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }
    
    // Update fields
    if (name) game.name = name.trim();
    if (description) game.description = description.trim();
    if (price !== undefined) game.price = parseInt(price);
    if (minPlayers !== undefined) game.minPlayers = parseInt(minPlayers);
    if (maxPlayers !== undefined) game.maxPlayers = parseInt(maxPlayers);
    if (category) game.category = category;
    
    await game.save();
    
    res.json({
      success: true,
      message: 'Game updated successfully'
    });
    
  } catch (error) {
    console.error('Update game error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update game'
    });
  }
});

// Delete game
router.delete('/game/:gameId', requireAuth, requireCreator, async (req, res) => {
  try {
    const { gameId } = req.params;
    
    const game = await Game.findOne({ id: gameId, creatorId: req.user._id });
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }
    
    await Game.deleteOne({ id: gameId });
    
    // Remove from game loader if it's loaded
    if (gameLoader.hasGame(gameId)) {
      gameLoader.games.delete(gameId);
    }
    
    // Update creator stats
    await req.user.updateCreatorStats({
      gamesPublished: Math.max(0, req.user.creatorStats.gamesPublished - 1)
    });
    
    res.json({
      success: true,
      message: 'Game deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete game error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete game'
    });
  }
});

// Get creator stats
router.get('/stats', requireAuth, requireCreator, async (req, res) => {
  try {
    const games = await Game.find({ creatorId: req.user._id });
    
    const stats = {
      totalGames: games.length,
      approvedGames: games.filter(g => g.status === 'approved').length,
      pendingGames: games.filter(g => g.status === 'pending').length,
      totalDownloads: games.reduce((sum, g) => sum + g.downloadCount, 0),
      totalRevenue: req.user.creatorStats.totalRevenue,
      averageRating: req.user.creatorStats.averageRating,
      totalReviews: req.user.creatorStats.totalReviews
    };
    
    res.json({
      success: true,
      stats: stats
    });
    
  } catch (error) {
    console.error('Get creator stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get creator stats'
    });
  }
});

module.exports = router;

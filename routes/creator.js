const express = require('express');
const multer = require('multer');
const JSZip = require('jszip');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const Game = require('../models/Game');
const { requireAuth } = require('../middleware/auth');
const gameLoader = require('../utils/DynamicGameLoader');
const router = express.Router();

// File upload configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 200 * 1024 * 1024, // 200MB limit
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
    const requiredFiles = ['server.js', 'client/index.html', 'client/player.js', 'logo.png'];
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
          // Check for required exports with comprehensive pattern matching
          const requiredExports = ['meta', 'onInit', 'onPlayerJoin', 'onAction'];
          const missingExports = requiredExports.filter(exp => {
            // Check for various export patterns
            const hasExport = 
              // Direct exports
              serverCode.includes(`exports.${exp}`) ||
              serverCode.includes(`module.exports.${exp}`) ||
              
              // Object exports (most common pattern)
              serverCode.includes(`${exp}:`) ||
              
              // Function declarations
              serverCode.includes(`function ${exp}(`) ||
              serverCode.includes(`const ${exp} =`) ||
              serverCode.includes(`let ${exp} =`) ||
              serverCode.includes(`var ${exp} =`) ||
              
              // Arrow functions
              serverCode.includes(`${exp}:`) ||
              
              // Simple patterns
              serverCode.includes(`${exp} =`) ||
              serverCode.includes(`${exp}(`);
            
            return !hasExport;
          });
          
          if (missingExports.length > 0) {
            errors.push(`server.js missing required exports: ${missingExports.join(', ')}`);
          }
          
          // SECURITY: Validate game code for dangerous patterns
          const codeValidation = validateGameCode(serverCode);
          if (!codeValidation.valid) {
            errors.push(...codeValidation.errors);
          }
          if (codeValidation.warnings.length > 0) {
            warnings.push(...codeValidation.warnings);
          }
        }
      } catch (error) {
        errors.push(`Error reading server.js: ${error.message}`);
      }
    }
    
    // Check for logo.png
    if (files.includes('logo.png')) {
      try {
        const logoBuffer = await zip.files['logo.png'].async('nodebuffer');
        
        // Basic PNG validation (check PNG signature)
        if (logoBuffer.length < 8 || 
            logoBuffer[0] !== 0x89 || 
            logoBuffer[1] !== 0x50 || 
            logoBuffer[2] !== 0x4E || 
            logoBuffer[3] !== 0x47) {
          errors.push('logo.png is not a valid PNG file');
        } else {
          // For now, we'll skip dimension validation since image-size package isn't installed
          // In production, you would validate 200x200px dimensions here
          console.log('Logo validation: PNG format confirmed');
        }
      } catch (error) {
        errors.push(`Error reading logo.png: ${error.message}`);
      }
    }
    
    const maxFileSize = 50 * 1024 * 1024; // 50MB per file
    for (const [filename, file] of Object.entries(zip.files)) {
      if (!file.dir && file.uncompressedSize > maxFileSize) {
        warnings.push(`File ${filename} is larger than 50MB (${Math.round(file.uncompressedSize / 1024 / 1024)}MB)`);
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

// Deploy game files to file system
async function deployGameToFileSystem(gameId, buffer) {
  try {
    const gamesDir = path.join(__dirname, '..', 'games');
    const gameDir = path.join(gamesDir, gameId);
    
    // Create game directory if it doesn't exist
    if (!fs.existsSync(gameDir)) {
      fs.mkdirSync(gameDir, { recursive: true });
    }
    
    // Create game-logos directory if it doesn't exist
    const logosDir = path.join(__dirname, '..', 'public', 'game-logos');
    if (!fs.existsSync(logosDir)) {
      fs.mkdirSync(logosDir, { recursive: true });
    }
    
    const zip = await JSZip.loadAsync(buffer);
    const files = Object.keys(zip.files);
    
    // Extract all files to game directory
    for (const [filename, file] of Object.entries(zip.files)) {
      if (!file.dir) {
        const filePath = path.join(gameDir, filename);
        const fileDir = path.dirname(filePath);
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(fileDir)) {
          fs.mkdirSync(fileDir, { recursive: true });
        }
        
        // Write file
        const data = await file.async('nodebuffer');
        fs.writeFileSync(filePath, data);
        
        // If this is logo.png, also copy it to game-logos directory
        if (filename === 'logo.png') {
          const logoPath = path.join(logosDir, `${gameId}.png`);
          fs.writeFileSync(logoPath, data);
          console.log(`Logo saved to: ${logoPath}`);
        }
      }
    }
    
    // Verify essential files exist
    const serverPath = path.join(gameDir, 'server.js');
    const clientPath = path.join(gameDir, 'client', 'index.html');
    
    if (!fs.existsSync(serverPath)) {
      throw new Error('server.js not found in extracted files');
    }
    
    if (!fs.existsSync(clientPath)) {
      throw new Error('client/index.html not found in extracted files');
    }
    
    console.log(`[Creator] Successfully deployed game ${gameId} to ${gameDir}`);
    return gameDir;
    
  } catch (error) {
    console.error(`[Creator] Failed to deploy game ${gameId}:`, error);
    throw error;
  }
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

// SECURITY: Validate game code for dangerous patterns
function validateGameCode(code) {
  const errors = [];
  const warnings = [];
  
  // Check for dangerous require statements
  const dangerousRequires = [
    'fs', 'child_process', 'os', 'net', 'http', 'https', 'crypto',
    'path', 'util', 'stream', 'cluster', 'worker_threads', 'perf_hooks',
    'v8', 'vm', 'repl', 'readline', 'tty', 'url', 'querystring'
  ];
  
  dangerousRequires.forEach(module => {
    const patterns = [
      new RegExp(`require\\s*\\(\\s*['"\`]${module}['"\`]\\s*\\)`, 'gi'),
      new RegExp(`import\\s+.*\\s+from\\s+['"\`]${module}['"\`]`, 'gi'),
      new RegExp(`import\\s*['"\`]${module}['"\`]`, 'gi')
    ];
    
    patterns.forEach(pattern => {
      if (pattern.test(code)) {
        errors.push(`Dangerous module import detected: ${module}. Games cannot access system modules.`);
      }
    });
  });
  
  // Check for dangerous global access
  const dangerousGlobals = [
    'process', 'global', 'globalThis', '__dirname', '__filename',
    'Buffer', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'
  ];
  
  dangerousGlobals.forEach(global => {
    const patterns = [
      new RegExp(`\\b${global}\\b`, 'g'),
      new RegExp(`${global}\\.`, 'g')
    ];
    
    patterns.forEach(pattern => {
      if (pattern.test(code)) {
        errors.push(`Dangerous global access detected: ${global}. Games cannot access system globals.`);
      }
    });
  });
  
  // Check for code injection patterns
  const injectionPatterns = [
    /eval\s*\(/gi,
    /Function\s*\(/gi,
    /setTimeout\s*\(/gi,
    /setInterval\s*\(/gi,
    /new\s+Function\s*\(/gi,
    /\.call\s*\(/gi,
    /\.apply\s*\(/gi
  ];
  
  injectionPatterns.forEach(pattern => {
    if (pattern.test(code)) {
      errors.push(`Code injection pattern detected: ${pattern.source}. Games cannot execute dynamic code.`);
    }
  });
  
  // Check for file system access attempts
  const fsPatterns = [
    /readFileSync/gi,
    /writeFileSync/gi,
    /readdirSync/gi,
    /mkdirSync/gi,
    /rmdirSync/gi,
    /unlinkSync/gi,
    /statSync/gi,
    /accessSync/gi,
    /chmodSync/gi,
    /chownSync/gi
  ];
  
  fsPatterns.forEach(pattern => {
    if (pattern.test(code)) {
      errors.push(`File system access detected: ${pattern.source}. Games cannot access the file system.`);
    }
  });
  
  // Check for network access attempts
  const networkPatterns = [
    /createServer/gi,
    /createConnection/gi,
    /request/gi,
    /get/gi,
    /post/gi,
    /fetch/gi,
    /XMLHttpRequest/gi,
    /WebSocket/gi
  ];
  
  networkPatterns.forEach(pattern => {
    if (pattern.test(code)) {
      errors.push(`Network access detected: ${pattern.source}. Games cannot make network requests.`);
    }
  });
  
  // Check for process manipulation
  const processPatterns = [
    /process\.exit/gi,
    /process\.kill/gi,
    /process\.spawn/gi,
    /process\.exec/gi,
    /process\.fork/gi,
    /child_process/gi,
    /spawn/gi,
    /exec/gi,
    /fork/gi
  ];
  
  processPatterns.forEach(pattern => {
    if (pattern.test(code)) {
      errors.push(`Process manipulation detected: ${pattern.source}. Games cannot manipulate processes.`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
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

    // Validate that game name doesn't contain '_update'
    if (name.toLowerCase().includes('_update')) {
      return res.status(400).json({
        success: false,
        message: 'Game names cannot contain "_update"'
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
    
    // Generate unique game ID based on name
    const baseId = name.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    // Ensure base ID doesn't contain '_update'
    if (baseId.includes('_update')) {
      return res.status(400).json({
        success: false,
        message: 'Game names cannot contain "_update"'
      });
    }
    
    // Find a unique ID by appending numbers if needed
    let gameId = baseId;
    let counter = 1;
    
    while (true) {
      const existingGame = await Game.findOne({ id: gameId });
      if (!existingGame) {
        break; // Found unique ID
      }
      gameId = `${baseId}${counter}`;
      counter++;
    }
    
    // Deploy game files to file system
    const gameDir = await deployGameToFileSystem(gameId, gameFile.buffer);
    
    // Extract game files for validation only (don't store large data in DB)
    const extractedGame = await extractGameFiles(gameFile.buffer);
    const sanitizedCode = sanitizeGameCode(extractedGame.serverCode);
    
    // Create game (don't store large code/assets in database)
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
      approved: req.user.role === 'admin', // Only admins can auto-approve games
      // Don't store large code/assets in database - they're in the file system
      folderPath: gameDir, // Track deployment path
      deployedAt: new Date(),
      thumbnail: '🎮', // Default thumbnail
      logo: `/game-logos/${gameId}.png` // Logo path
    });
    
    // Skip code validation since we're not storing code in database
    // The code is already validated during file validation
    
    await game.save();
    
    // Game is now deployed and available immediately
    console.log(`[Creator] Game ${gameId} deployed and available for use`);
    
    // Reload the game in the dynamic loader if it's approved
    if (game.approved) {
      const gameLoader = require('../utils/DynamicGameLoader');
      await gameLoader.reloadGame(gameId);
      console.log(`[Creator] Game ${gameId} reloaded in dynamic loader`);
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

// Deploy game endpoint (separate from upload for existing games)
router.post('/deploy-game', requireAuth, requireCreator, upload.single('gameFile'), async (req, res) => {
  try {
    const { gameId } = req.body;
    const gameFile = req.file;
    
    // Validate input
    if (!gameId) {
      return res.status(400).json({
        success: false,
        message: 'Game ID is required'
      });
    }
    
    if (!gameFile) {
      return res.status(400).json({
        success: false,
        message: 'Game file is required'
      });
    }
    
    // Check if game exists and user owns it
    const game = await Game.findOne({ id: gameId, creatorId: req.user._id });
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found or you do not have permission to deploy it'
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
    
    // Deploy game files to file system
    const gameDir = await deployGameToFileSystem(gameId, gameFile.buffer);
    
    // Update game record
    game.folderPath = gameDir;
    game.deployedAt = new Date();
    await game.save();
    
    res.json({
      success: true,
      message: 'Game deployed successfully!',
      game: {
        id: game.id,
        name: game.name,
        deployedAt: game.deployedAt
      }
    });
    
  } catch (error) {
    console.error('Deploy game error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deploy game'
    });
  }
});

// Get deployment status for a game
router.get('/game/:gameId/deployment-status', requireAuth, requireCreator, async (req, res) => {
  try {
    const { gameId } = req.params;
    
    const game = await Game.findOne({ id: gameId, creatorId: req.user._id });
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }
    
    const isDeployed = game.isDeployed();
    
    res.json({
      success: true,
      deployed: isDeployed,
      deployedAt: game.deployedAt,
      folderPath: game.folderPath
    });
    
  } catch (error) {
    console.error('Get deployment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get deployment status'
    });
  }
});

// Get creator's games
router.get('/my-games', requireAuth, requireCreator, async (req, res) => {
  try {
    const games = await Game.find({ creatorId: req.user._id })
      .sort({ createdAt: -1 });
    
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

// Get game details
router.get('/game/:gameId', requireAuth, requireCreator, async (req, res) => {
  try {
    const { gameId } = req.params;
    
    // Check if game exists and user owns it
    const game = await Game.findOne({ id: gameId, creatorId: req.user._id });
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found or you do not have permission to view it'
      });
    }
    
    res.json({
      success: true,
      game: {
        id: game.id,
        name: game.name,
        description: game.description,
        price: game.price,
        minPlayers: game.minPlayers,
        maxPlayers: game.maxPlayers,
        category: game.category,
        status: game.status,
        approved: game.approved,
        deployedAt: game.deployedAt,
        folderPath: game.folderPath,
        hasPendingUpdate: game.hasPendingUpdate,
        submittedForApproval: game.submittedForApproval,
        createdAt: game.createdAt
      }
    });
    
  } catch (error) {
    console.error('Get game details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load game details'
    });
  }
});

// Update game metadata
router.put('/game/:gameId', requireAuth, requireCreator, async (req, res) => {
  try {
    const { gameId } = req.params;
    const { description, minPlayers, maxPlayers, price, category } = req.body;
    
    // Check if game exists and user owns it
    const game = await Game.findOne({ id: gameId, creatorId: req.user._id });
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found or you do not have permission to update it'
      });
    }
    
    // Update allowed fields only
    if (description !== undefined) game.description = description;
    if (minPlayers !== undefined) game.minPlayers = parseInt(minPlayers);
    if (maxPlayers !== undefined) game.maxPlayers = parseInt(maxPlayers);
    if (price !== undefined) game.price = parseInt(price);
    if (category !== undefined) game.category = category;
    
    await game.save();
    
    res.json({
      success: true,
      message: 'Game updated successfully',
      game: game
    });
    
  } catch (error) {
    console.error('Update game error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update game'
    });
  }
});

// Upload game update
router.post('/game/:gameId/update', requireAuth, requireCreator, upload.single('gameFile'), async (req, res) => {
  try {
    const { gameId } = req.params;
    const gameFile = req.file;
    
    // Check if game exists and user owns it
    const game = await Game.findOne({ id: gameId, creatorId: req.user._id });
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found or you do not have permission to update it'
      });
    }
    
    if (!gameFile) {
      return res.status(400).json({
        success: false,
        message: 'Game file is required'
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
    
    // Deploy update to pending folder
    const updateDir = await deployGameUpdate(gameId, gameFile.buffer);
    
    // Update game record
    game.hasPendingUpdate = true;
    game.submittedForApproval = false; // Reset on new upload
    game.pendingUpdatePath = updateDir;
    game.pendingUpdateSubmittedAt = null;
    await game.save();
    
    res.json({
      success: true,
      message: 'Game update uploaded successfully!',
      game: {
        id: game.id,
        name: game.name,
        hasPendingUpdate: game.hasPendingUpdate,
        submittedForApproval: game.submittedForApproval
      }
    });
    
  } catch (error) {
    console.error('Upload game update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload game update'
    });
  }
});

// Submit update for approval
router.post('/game/:gameId/submit', requireAuth, requireCreator, async (req, res) => {
  try {
    const { gameId } = req.params;
    
    // Check if game exists and user owns it
    const game = await Game.findOne({ id: gameId, creatorId: req.user._id });
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found or you do not have permission to submit it'
      });
    }
    
    if (!game.hasPendingUpdate) {
      return res.status(400).json({
        success: false,
        message: 'No pending update to submit'
      });
    }
    
    // Mark as submitted for approval
    game.submittedForApproval = true;
    game.pendingUpdateSubmittedAt = new Date();
    await game.save();
    
    res.json({
      success: true,
      message: 'Update submitted for approval successfully!',
      game: {
        id: game.id,
        name: game.name,
        submittedForApproval: game.submittedForApproval,
        pendingUpdateSubmittedAt: game.pendingUpdateSubmittedAt
      }
    });
    
  } catch (error) {
    console.error('Submit for approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit for approval'
    });
  }
});

// Create test lobby for a game
// Helper function to deploy game update to pending folder
async function deployGameUpdate(gameId, buffer) {
  try {
    const gamesDir = path.join(__dirname, '..', 'games');
    const updateDir = path.join(gamesDir, `${gameId}_update`);
    
    // Delete existing update folder if exists
    if (fs.existsSync(updateDir)) {
      fs.rmSync(updateDir, { recursive: true });
    }
    
    // Create update directory
    fs.mkdirSync(updateDir, { recursive: true });
    
    // Create game-logos directory if it doesn't exist
    const logosDir = path.join(__dirname, '..', 'public', 'game-logos');
    if (!fs.existsSync(logosDir)) {
      fs.mkdirSync(logosDir, { recursive: true });
    }
    
    const zip = await JSZip.loadAsync(buffer);
    const files = Object.keys(zip.files);
    
    for (const [filename, file] of Object.entries(zip.files)) {
      if (!file.dir) {
        const filePath = path.join(updateDir, filename);
        const fileDir = path.dirname(filePath);
        
        if (!fs.existsSync(fileDir)) {
          fs.mkdirSync(fileDir, { recursive: true });
        }
        
        const data = await file.async('nodebuffer');
        fs.writeFileSync(filePath, data);
        
        // If this is logo.png, also copy it to game-logos directory
        if (filename === 'logo.png') {
          const logoPath = path.join(logosDir, `${gameId}.png`);
          fs.writeFileSync(logoPath, data);
          console.log(`Logo updated: ${logoPath}`);
        }
      }
    }
    
    const serverPath = path.join(updateDir, 'server.js');
    const clientPath = path.join(updateDir, 'client', 'index.html');
    
    if (!fs.existsSync(serverPath)) {
      throw new Error('server.js not found in extracted files');
    }
    
    if (!fs.existsSync(clientPath)) {
      throw new Error('client/index.html not found in extracted files');
    }
    
    console.log(`[Creator] Successfully deployed game update ${gameId} to ${updateDir}`);
    return updateDir;
    
  } catch (error) {
    console.error(`[Creator] Failed to deploy game update ${gameId}:`, error);
    throw error;
  }
}

module.exports = router;

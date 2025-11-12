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

// File upload configuration for game ZIP files
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

// Image upload configuration
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB per image
    files: 6
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
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
          // Support multiple export patterns:
          // 1. exports.meta = ... or module.exports.meta = ...
          // 2. module.exports = { meta: ..., onInit: ... } or module.exports = { meta, onInit, ... }
          // 3. exports['meta'] = ... or module.exports['meta'] = ...
          const requiredExports = ['meta', 'onInit', 'onPlayerJoin', 'onAction'];
          const missingExports = requiredExports.filter(exp => {
            // Pattern 1: Direct assignment exports.meta or module.exports.meta
            const directPattern = new RegExp(`(?:exports|module\\.exports)\\.${exp}\\s*[=:]`, 'm');
            
            // Pattern 2: Object literal - find module.exports = { then extract the object content
            // Handle nested braces by counting them
            const objectExportMatch = serverCode.match(/module\.exports\s*=\s*\{/);
            if (objectExportMatch) {
              let startPos = objectExportMatch.index + objectExportMatch[0].length;
              let braceCount = 1;
              let pos = startPos;
              let objectContent = '';
              
              // Extract the complete object content by counting braces
              while (pos < serverCode.length && braceCount > 0) {
                if (serverCode[pos] === '{') braceCount++;
                if (serverCode[pos] === '}') braceCount--;
                if (braceCount > 0) {
                  objectContent += serverCode[pos];
                }
                pos++;
              }
              
              // Check if export name appears as a property (meta: or 'meta': or "meta":) or as a method (onInit( or onInit:)
              // Also handle shorthand: meta, or 'meta',
              const inObjectPattern = new RegExp(`(['"]?${exp}['"]?\\s*[:,]|\\b${exp}\\s*[({])`, 'm');
              if (inObjectPattern.test(objectContent)) {
                return false; // Export found
              }
            }
            
            // Pattern 3: Bracket notation exports['meta'] or module.exports['meta']
            const bracketPattern = new RegExp(`(?:exports|module\\.exports)\\[['"]${exp}['"]\\]\\s*=`, 'm');
            
            // Check if export is found via any pattern
            return !directPattern.test(serverCode) && 
                   !bracketPattern.test(serverCode);
          });
          
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

// Deploy game files to file system
async function deployGameToFileSystem(gameId, buffer) {
  try {
    const gamesDir = path.join(__dirname, '..', 'games');
    const gameDir = path.join(gamesDir, gameId);
    
    // Create game directory if it doesn't exist
    if (!fs.existsSync(gameDir)) {
      fs.mkdirSync(gameDir, { recursive: true });
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

// Deploy update files to {gameId}_update directory
async function deployUpdateToFileSystem(gameId, buffer) {
  try {
    const gamesDir = path.join(__dirname, '..', 'games');
    const updateDir = path.join(gamesDir, `${gameId}_update`);
    
    // Remove existing update directory if it exists
    if (fs.existsSync(updateDir)) {
      fs.rmSync(updateDir, { recursive: true, force: true });
    }
    
    // Create update directory
    fs.mkdirSync(updateDir, { recursive: true });
    
    const zip = await JSZip.loadAsync(buffer);
    const files = Object.keys(zip.files);
    
    // Extract all files to update directory
    for (const [filename, file] of Object.entries(zip.files)) {
      if (!file.dir) {
        const filePath = path.join(updateDir, filename);
        const fileDir = path.dirname(filePath);
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(fileDir)) {
          fs.mkdirSync(fileDir, { recursive: true });
        }
        
        // Write file
        const data = await file.async('nodebuffer');
        fs.writeFileSync(filePath, data);
      }
    }
    
    // Verify essential files exist
    const serverPath = path.join(updateDir, 'server.js');
    const clientPath = path.join(updateDir, 'client', 'index.html');
    
    if (!fs.existsSync(serverPath)) {
      throw new Error('server.js not found in extracted files');
    }
    
    if (!fs.existsSync(clientPath)) {
      throw new Error('client/index.html not found in extracted files');
    }
    
    console.log(`[Creator] Successfully deployed update for game ${gameId} to ${updateDir}`);
    return updateDir;
    
  } catch (error) {
    console.error(`[Creator] Failed to deploy update for game ${gameId}:`, error);
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

// Helper function to save image to disk
async function saveImage(file, gameId, index) {
  const publicDir = path.join(__dirname, '..', 'public', 'game-images');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  
  const ext = path.extname(file.originalname) || '.jpg';
  const filename = `${gameId}-${index}${ext}`;
  const filepath = path.join(publicDir, filename);
  
  fs.writeFileSync(filepath, file.buffer);
  
  return `/game-images/${filename}`;
}

// Upload game
router.post('/upload-game', requireAuth, requireCreator, (req, res, next) => {
  // Use multer to handle both gameFile and images
  const uploadFields = multer({
    storage: multer.memoryStorage(),
    limits: { 
      fileSize: 200 * 1024 * 1024, // 200MB limit for game file
    }
  }).fields([
    { name: 'gameFile', maxCount: 1 },
    { name: 'images', maxCount: 6 }
  ]);
  
  uploadFields(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload error'
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { name, description, price, minPlayers, maxPlayers, category, mainImageIndex } = JSON.parse(req.body.gameData);
    const gameFile = req.files && req.files['gameFile'] ? req.files['gameFile'][0] : null;
    const imageFiles = req.files && req.files['images'] ? req.files['images'] : [];
    
    // Validate input
    if (!gameFile) {
      return res.status(400).json({
        success: false,
        message: 'Game file is required'
      });
    }
    
    // Validate game file is ZIP
    if (gameFile.mimetype !== 'application/zip' && !gameFile.originalname.endsWith('.zip')) {
      return res.status(400).json({
        success: false,
        message: 'Game file must be a ZIP file'
      });
    }
    
    if (!name || !description) {
      return res.status(400).json({
        success: false,
        message: 'Game name and description are required'
      });
    }
    
    // Validate images are actually image files and size limits
    if (imageFiles.length > 0) {
      const maxImageSize = 10 * 1024 * 1024; // 10MB per image
      for (const img of imageFiles) {
        if (!img.mimetype.startsWith('image/')) {
          return res.status(400).json({
            success: false,
            message: 'All uploaded files must be images'
          });
        }
        if (img.size > maxImageSize) {
          return res.status(400).json({
            success: false,
            message: `Image "${img.originalname}" exceeds 10MB size limit`
          });
        }
      }
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
    
    // Deploy game files to file system
    const gameDir = await deployGameToFileSystem(gameId, gameFile.buffer);
    
    // Extract game files for validation only (don't store large files in DB)
    const extractedGame = await extractGameFiles(gameFile.buffer);
    const sanitizedCode = sanitizeGameCode(extractedGame.serverCode);
    
    // Process and save images
    const gameImages = [];
    if (imageFiles && imageFiles.length > 0) {
      const mainIndex = mainImageIndex !== undefined ? parseInt(mainImageIndex) : 0;
      
      for (let i = 0; i < imageFiles.length; i++) {
        const imageUrl = await saveImage(imageFiles[i], gameId, i);
        gameImages.push({
          url: imageUrl,
          caption: '',
          isMain: i === mainIndex
        });
      }
    }
    
    // Create game (don't store assets or large code in MongoDB - they're on disk)
    // Only store a hash or truncated version for reference if needed
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
      approved: req.user.role === 'admin' ? true : false, // Only admins can auto-approve games
      images: gameImages,
      // Don't store large serverCode/clientCode or assets - they're already on disk
      // Only keep minimal metadata for validation reference
      folderPath: gameDir, // Track deployment path
      deployedAt: new Date(),
      thumbnail: '🎮' // Default thumbnail
    });
    
    // Code validation already happened in validateGameFile() above
    // No need to validate again since we're not storing code in DB
    await game.save();
    
    // Game is now deployed and available immediately (no need to reload)
    console.log(`[Creator] Game ${gameId} deployed and available for use`);
    
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

// Update game metadata
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

// Upload game update (ZIP file)
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
    
    // Validate file is provided
    if (!gameFile) {
      return res.status(400).json({
        success: false,
        message: 'Game file is required',
        errors: ['Please select a ZIP file to upload']
      });
    }
    
    // Validate game file structure and content
    const validation = await validateGameFile(gameFile.buffer);
    
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Game validation failed',
        errors: validation.errors,
        warnings: validation.warnings
      });
    }
    
    // Deploy update files to {gameId}_update directory
    let updateDir;
    try {
      updateDir = await deployUpdateToFileSystem(gameId, gameFile.buffer);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to deploy update',
        errors: [error.message]
      });
    }
    
    // Admin-authored updates are auto-approved and deployed immediately
    if (req.user.role === 'admin') {
      try {
        const gamesDir = path.join(__dirname, '..', 'games');
        const gameDir = path.join(gamesDir, gameId);
        const adminUpdateDir = path.join(gamesDir, `${gameId}_update`);
        
        if (fs.existsSync(gameDir)) {
          fs.rmSync(gameDir, { recursive: true, force: true });
        }
        
        if (fs.existsSync(adminUpdateDir)) {
          fs.renameSync(adminUpdateDir, gameDir);
        }
        
        await gameLoader.reloadGame(gameId);
        
        game.hasPendingUpdate = false;
        game.pendingUpdateFolderPath = null;
        game.pendingUpdateStatus = 'approved';
        game.submittedForApproval = false;
        game.folderPath = gameDir;
        game.deployedAt = new Date();
        await game.save();
        
        return res.json({
          success: true,
          message: 'Game update uploaded and published immediately (admin auto-approve).',
          warnings: validation.warnings.length > 0 ? validation.warnings : undefined
        });
      } catch (error) {
        console.error('Admin auto-approve update error:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to auto-approve admin update',
          errors: [error.message]
        });
      }
    }
    
    // Update game record with pending update info
    game.hasPendingUpdate = true;
    game.pendingUpdateFolderPath = updateDir;
    game.pendingUpdateSubmittedAt = new Date();
    game.pendingUpdateStatus = 'pending';
    game.submittedForApproval = false; // Creator can still edit before submitting
    await game.save();
    
    res.json({
      success: true,
      message: 'Game update uploaded successfully! The update is pending and can be submitted for approval.',
      warnings: validation.warnings.length > 0 ? validation.warnings : undefined
    });
    
  } catch (error) {
    console.error('Upload update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload update',
      errors: [error.message]
    });
  }
});

// Submit update for approval
router.post('/game/:gameId/submit', requireAuth, requireCreator, async (req, res) => {
  try {
    const { gameId } = req.params;
    
    const game = await Game.findOne({ id: gameId, creatorId: req.user._id });
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }
    
    if (!game.hasPendingUpdate) {
      return res.status(400).json({
        success: false,
        message: 'No pending update to submit'
      });
    }
    
    if (game.submittedForApproval) {
      return res.status(400).json({
        success: false,
        message: 'Update already submitted for approval'
      });
    }
    
    game.submittedForApproval = true;
    game.pendingUpdateStatus = 'pending';
    await game.save();
    
    res.json({
      success: true,
      message: 'Update submitted for approval successfully!'
    });
    
  } catch (error) {
    console.error('Submit update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit update'
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
    
    // Remove game folder from filesystem if it exists
    if (game.folderPath) {
      try {
        if (fs.existsSync(game.folderPath)) {
          fs.rmSync(game.folderPath, { recursive: true, force: true });
          console.log(`[Creator] Removed game folder: ${game.folderPath}`);
        }
      } catch (folderError) {
        console.error(`[Creator] Error removing game folder ${game.folderPath}:`, folderError);
        // Continue with deletion even if folder removal fails
      }
    }
    
    // Remove pending update folder if it exists
    if (game.pendingUpdateFolderPath) {
      try {
        if (fs.existsSync(game.pendingUpdateFolderPath)) {
          fs.rmSync(game.pendingUpdateFolderPath, { recursive: true, force: true });
          console.log(`[Creator] Removed pending update folder: ${game.pendingUpdateFolderPath}`);
        }
      } catch (folderError) {
        console.error(`[Creator] Error removing pending update folder ${game.pendingUpdateFolderPath}:`, folderError);
        // Continue with deletion even if folder removal fails
      }
    }
    
    // Also try removing by gameId pattern in case folderPath wasn't set correctly
    const gamesDir = path.join(__dirname, '..', 'games');
    const gameDir = path.join(gamesDir, gameId);
    const updateDir = path.join(gamesDir, `${gameId}_update`);
    
    if (fs.existsSync(gameDir)) {
      try {
        fs.rmSync(gameDir, { recursive: true, force: true });
        console.log(`[Creator] Removed game directory: ${gameDir}`);
      } catch (folderError) {
        console.error(`[Creator] Error removing game directory ${gameDir}:`, folderError);
      }
    }
    
    if (fs.existsSync(updateDir)) {
      try {
        fs.rmSync(updateDir, { recursive: true, force: true });
        console.log(`[Creator] Removed update directory: ${updateDir}`);
      } catch (folderError) {
        console.error(`[Creator] Error removing update directory ${updateDir}:`, folderError);
      }
    }
    
    // Remove game images from filesystem
    if (game.images && game.images.length > 0) {
      const publicImagesDir = path.join(__dirname, '..', 'public', 'game-images');
      game.images.forEach(image => {
        if (image.url) {
          // Extract filename from URL (e.g., /game-images/gameid-0.jpg)
          const filename = path.basename(image.url);
          const imagePath = path.join(publicImagesDir, filename);
          
          try {
            if (fs.existsSync(imagePath)) {
              fs.unlinkSync(imagePath);
              console.log(`[Creator] Removed game image: ${imagePath}`);
            }
          } catch (imageError) {
            console.error(`[Creator] Error removing image ${imagePath}:`, imageError);
            // Continue with deletion even if image removal fails
          }
        }
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

module.exports = router;

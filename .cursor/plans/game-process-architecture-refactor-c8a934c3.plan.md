<!-- c8a934c3-4481-4fbf-bdc5-31c9b9e48690 8733cff4-6ebe-470e-a6f9-b90bce05f2b3 -->
# Creator Dashboard Games System

## Overview
Implement a two-version game system (live and working) with creator testing, update management, and admin approval workflow.

## Database Schema Updates

### Update `models/Game.js`
Add new fields to track update submissions and pending updates:

```javascript
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
}
```

## Backend API Endpoints

### 1. Get Creator's Games - `GET /api/creator/my-games`
**File**: `routes/creator.js`

Return all games created by the authenticated user, regardless of approval status:
```javascript
router.get('/my-games', requireAuth, requireCreator, async (req, res) => {
  const games = await Game.find({ creatorId: req.user._id })
    .sort({ createdAt: -1 });
  // Include approval status, pending update status, etc.
});
```

### 2. Update Game Metadata - `PUT /api/creator/game/:gameId`
**File**: `routes/creator.js`

Allow editing: description, images, minPlayers, maxPlayers, price, category (exclude name and ID):
```javascript
router.put('/game/:gameId', requireAuth, requireCreator, async (req, res) => {
  // Verify creator owns the game
  // Update allowed fields only
  // Return updated game
});
```

### 3. Upload Game Update - `POST /api/creator/game/:gameId/update`
**File**: `routes/creator.js`

Upload new ZIP file as pending update:
```javascript
router.post('/game/:gameId/update', requireAuth, requireCreator, 
  upload.single('gameFile'), async (req, res) => {
  // Validate game ownership
  // Extract ZIP to /games/{gameId}_update/
  // Set hasPendingUpdate = true
  // Set submittedForApproval = false (reset on new upload)
  // Update pendingUpdatePath
});
```

### 4. Submit Update for Approval - `POST /api/creator/game/:gameId/submit`
**File**: `routes/creator.js`

Mark pending update as submitted for admin review:
```javascript
router.post('/game/:gameId/submit', requireAuth, requireCreator, async (req, res) => {
  // Verify pending update exists
  // Set submittedForApproval = true
  // Set pendingUpdateSubmittedAt = Date.now()
});
```

### 5. Admin Approve Update - `POST /api/admin/approve-update/:gameId`
**File**: `routes/admin.js`

Replace live version with pending update:
```javascript
router.post('/approve-update/:gameId', requireAuth, requireAdmin, async (req, res) => {
  // Delete /games/{gameId}/ folder
  // Rename /games/{gameId}_update/ to /games/{gameId}/
  // Set approved = true
  // Set hasPendingUpdate = false
  // Set submittedForApproval = false
  // Clear pendingUpdatePath
  // Reload game in gameLoader
});
```

### 6. Admin Reject Update - `POST /api/admin/reject-update/:gameId`
**File**: `routes/admin.js`

Reject pending update with reason:
```javascript
router.post('/reject-update/:gameId', requireAuth, requireAdmin, async (req, res) => {
  // Keep live version unchanged
  // Set submittedForApproval = false
  // Keep hasPendingUpdate = true (creator can resubmit)
  // Add rejection reason to validationErrors
});
```

## Creator Game Access System

### Update `server.js` - `getAvailableGamesForUser()` (line 74)
Modify to include creator's own games even if unapproved:

```javascript
async function getAvailableGamesForUser(userId) {
  // Get user's owned/free games (approved only)
  const accessibleGames = user.getAllAccessibleGames();
  
  // Add creator's own games (even if unapproved)
  const creatorGames = await Game.find({ 
    creatorId: userId,
    isActive: true 
  }).select('id');
  
  const creatorGameIds = creatorGames.map(g => g.id);
  
  // Merge and deduplicate
  const allGameIds = [...new Set([...accessibleGames, ...creatorGameIds])];
  
  // Return metadata (load from gameLoader or database)
}
```

### Update `utils/DynamicGameLoader.js`
Add method to load unapproved games for specific creators:

```javascript
async loadCreatorGame(gameId, creatorId) {
  // Load game metadata even if not approved
  // Check if creator owns the game
  // Return game metadata for testing
}

getGameForCreator(gameId, creatorId) {
  // Check if game is approved OR creator owns it
  // Return game if accessible
}
```

### Update `server.js` - `selectGame` handler (line 486)
Allow creators to select their own unapproved games:

```javascript
socket.on('selectGame', async ({ code, gameId }, callback) => {
  // Check if game is approved
  // OR check if current user is the creator
  const game = gameLoader.getGame(gameId);
  const gameDoc = await Game.findOne({ id: gameId });
  
  if (!game && gameDoc && gameDoc.creatorId.equals(userId)) {
    // Load creator's unapproved game
    await gameLoader.loadCreatorGame(gameId, userId);
  }
  
  // Continue with game spawning
});
```

## Frontend Updates

### Update `public/creator.html` - My Games Section (line 437)

**Add Update Button to Each Game Card:**
```html
<div class="game-card">
  <h3>${game.name}</h3>
  <p>Status: ${game.approved ? 'Approved' : 'Pending'}</p>
  ${game.hasPendingUpdate ? '<span class="badge">Update Pending</span>' : ''}
  <button onclick="openUpdateModal('${game.id}')">Update Game</button>
  ${game.hasPendingUpdate && !game.submittedForApproval ? 
    `<button onclick="submitForApproval('${game.id}')">Submit for Approval</button>` : ''}
</div>
```

**Add Update Modal:**
```html
<div id="updateModal" class="modal">
  <div class="modal-content">
    <h2>Update Game</h2>
    <form id="updateGameForm">
      <input type="text" name="description" placeholder="Description">
      <input type="number" name="minPlayers" placeholder="Min Players">
      <input type="number" name="maxPlayers" placeholder="Max Players">
      <input type="number" name="price" placeholder="Price">
      <select name="category">...</select>
      <input type="file" name="gameFile" accept=".zip">
      <button type="submit">Update</button>
    </form>
  </div>
</div>
```

**JavaScript Functions:**
```javascript
async function openUpdateModal(gameId) {
  // Fetch game details
  // Populate form
  // Show modal
}

async function submitUpdateForm(gameId, formData) {
  // If ZIP file included, upload to /api/creator/game/:gameId/update
  // Otherwise, just update metadata via PUT /api/creator/game/:gameId
  // Refresh game list
}

async function submitForApproval(gameId) {
  // POST to /api/creator/game/:gameId/submit
  // Show success message
  // Refresh game list
}
```

## Admin Panel Updates

### Update `public/admin.html` (or create if needed)

**Add Pending Updates Section:**
```html
<div class="pending-updates">
  <h2>Pending Game Updates</h2>
  <div id="pendingUpdatesList"></div>
</div>
```

**JavaScript to Load Pending Updates:**
```javascript
async function loadPendingUpdates() {
  const response = await fetch('/api/admin/pending-updates');
  const { updates } = await response.json();
  
  updates.forEach(game => {
    // Display game with approve/reject buttons
  });
}

async function approveUpdate(gameId) {
  await fetch(`/api/admin/approve-update/${gameId}`, { method: 'POST' });
  // Refresh list
}

async function rejectUpdate(gameId, reason) {
  await fetch(`/api/admin/reject-update/${gameId}`, {
    method: 'POST',
    body: JSON.stringify({ reason })
  });
  // Refresh list
}
```

## File System Operations

### Helper Functions in `routes/creator.js`

**Extract Update to Pending Folder:**
```javascript
async function deployGameUpdate(gameId, buffer) {
  const updateDir = path.join(__dirname, '..', 'games', `${gameId}_update`);
  
  // Delete existing update folder if exists
  if (fs.existsSync(updateDir)) {
    fs.rmSync(updateDir, { recursive: true });
  }
  
  // Extract ZIP to update folder
  // Same logic as deployGameToFileSystem but different path
}
```

**Promote Update to Live:**
```javascript
async function promoteUpdateToLive(gameId) {
  const liveDir = path.join(__dirname, '..', 'games', gameId);
  const updateDir = path.join(__dirname, '..', 'games', `${gameId}_update`);
  
  // Delete live folder
  if (fs.existsSync(liveDir)) {
    fs.rmSync(liveDir, { recursive: true });
  }
  
  // Rename update folder to live
  fs.renameSync(updateDir, liveDir);
}
```

## Testing Workflow

1. Creator uploads initial game → Extracted to `/games/{gameId}/`, `approved=false`, `submittedForApproval=false`
2. Creator can test their own game in lobbies
3. Creator uploads update → Extracted to `/games/{gameId}_update/`, `hasPendingUpdate=true`, `submittedForApproval=false`
4. Creator clicks "Submit for Approval" → `submittedForApproval=true`
5. Admin reviews and approves → `/games/{gameId}_update/` replaces `/games/{gameId}/`, `approved=true`
6. Game now available to all users

## Key Files to Modify

1. **models/Game.js** - Add update tracking fields
2. **routes/creator.js** - Add 4 new endpoints (my-games, update metadata, upload update, submit)
3. **routes/admin.js** - Add 2 new endpoints (approve-update, reject-update)
4. **server.js** - Modify getAvailableGamesForUser to include creator's games
5. **utils/DynamicGameLoader.js** - Add loadCreatorGame and getGameForCreator methods
6. **public/creator.html** - Add update modal and JavaScript functions
7. **public/admin.html** - Add pending updates section (create if needed)


### To-dos

- [ ] Add submittedForApproval, hasPendingUpdate, pendingUpdatePath fields to Game model
- [ ] Create GET /api/creator/my-games endpoint to return creator's games
- [ ] Create PUT /api/creator/game/:gameId endpoint for metadata updates
- [ ] Create POST /api/creator/game/:gameId/update endpoint for ZIP uploads
- [ ] Create POST /api/creator/game/:gameId/submit endpoint to submit for approval
- [ ] Create POST /api/admin/approve-update/:gameId endpoint to promote updates
- [ ] Create POST /api/admin/reject-update/:gameId endpoint to reject updates
- [ ] Create GET /api/admin/pending-updates endpoint to list games with pending updates
- [ ] Modify getAvailableGamesForUser in server.js to include creator's own games
- [ ] Add loadCreatorGame and getGameForCreator methods to DynamicGameLoader
- [ ] Modify selectGame handler to allow creators to test their unapproved games
- [ ] Add update modal and game cards with update buttons to creator.html
- [ ] Add JavaScript functions for update workflow in creator.html
- [ ] Add pending updates section to admin panel with approve/reject functionality
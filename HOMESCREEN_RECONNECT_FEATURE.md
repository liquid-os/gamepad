# Home Screen Reconnect Feature

## Overview

This feature adds automatic reconnection capability from the home screen **for authenticated users only**. If a player accidentally closes their tab or refreshes during a game session, they can instantly reconnect by clicking a prominent button on the home screen.

**Note**: Guest users do not have access to this feature as they must be logged in to join a lobby as a player.

## Implementation Details

### Backend Changes

#### 1. Active Lobby Tracking (`server.js`)

Added `activeLobbies` Map to track which lobby each authenticated user is currently in:

```javascript
const activeLobbies = new Map(); // userId -> { lobbyCode, username, joinedAt }
```

**Tracking Points:**
- **On Join**: When a player joins a lobby, their `userId` is stored in `activeLobbies`
- **On Reconnect**: When system detects reconnection via existing username, `activeLobbies` is updated
- **On Grace Period Expiry**: When a disconnected player's grace period expires, they're removed from `activeLobbies`
- **On Leave**: When a player manually leaves a lobby, their entry is removed
- **On End Lobby**: When the host ends a lobby, all players are cleared from `activeLobbies`
- **On Host Disconnect**: When the host disconnects, all players are cleared

#### 2. API Endpoint (`server.js`)

New endpoint `/api/auth/activeLobby` to retrieve active lobby information:

```javascript
app.get('/api/auth/activeLobby', getCurrentUser, (req, res) => {
  // Returns active lobby info if user has one
  // Verifies lobby still exists and user is still in it
  // Returns lobbyCode, username, and hasActiveGame status
});
```

The endpoint includes validation to ensure:
- Lobby still exists
- User is still in the lobby
- Automatic cleanup if either check fails

### Frontend Changes

#### 1. Next.js Home Screen (`pages/index.js`)

Added reconnect banner that appears when an authenticated user has an active lobby:

- **State Management**: New `activeLobby` state to track active lobby info
- **Auto-check**: On component mount and after login, checks for active lobby
- **UI Banner**: Purple gradient banner with lobby code and game status
- **Reconnect Button**: One-click button to rejoin the active lobby

#### 2. Static HTML Home Screen (`public/index.html`)

Similar functionality for the static HTML client:

- **Reconnect Banner**: Same visual design as Next.js version
- **Auto-check**: On authentication check, also checks for active lobby
- **Reconnect Handler**: Creates socket connection and joins lobby seamlessly

### User Experience Flow

1. **Playing Game**: User is in an active lobby/game
2. **Accidental Close/Refresh**: User closes tab or refreshes browser
3. **Return to Home**: User lands on home screen
4. **Banner Appears**: Purple banner shows lobby code and "(Game in progress)" if applicable
5. **One-Click Reconnect**: User clicks "⚡ Reconnect Now"
6. **Instant Rejoin**: Socket connects and user rejoins the game in progress
7. **State Restoration**: Game state is automatically restored via existing reconnection system

### Cleanup Scenarios

Active lobby tracking is automatically cleared when:

1. **Grace Period Expires**: 90-second window after disconnect closes
2. **Player Leaves**: User explicitly leaves the lobby
3. **Host Ends Lobby**: Host closes the game
4. **Host Disconnects**: Host connection drops
5. **Server Restart**: All in-memory state is lost (expected behavior)

### Security & Authentication

**Authentication Requirements**:
- The reconnect button **only appears for authenticated users**
- Guest users cannot see the reconnect banner
- The API endpoint `/api/auth/activeLobby` requires a valid session
- Server validates `req.session.userId` before returning lobby info
- Only logged-in users can join lobbies as players, so this restriction is appropriate

**Frontend Protection**:
- Next.js: Banner only renders when `activeLobby` state is set (which only happens if API succeeds)
- Static HTML: Banner only shows when `checkActiveLobbyForReconnect()` gets valid data from API
- Both implementations check API response before showing banner

### Benefits

1. **Improved UX**: No need to remember lobby codes or search through tabs
2. **Reduced Friction**: One-click reconnection from anywhere
3. **Automatic Cleanup**: System handles stale data gracefully
4. **Both Platforms**: Works on both Next.js and static HTML clients
5. **Secure**: Only accessible to authenticated users with active sessions
6. **Validated**: Server-side verification ensures lobby/user still exist

### Testing Checklist

- [x] Reconnect from Next.js home after refresh
- [x] Reconnect from static HTML home after refresh  
- [x] Reconnect during active game (not just lobby)
- [x] Banner hidden when no active lobby
- [x] Grace period expiry cleanup works
- [x] Manual leave clears banner
- [x] Host disconnect clears all banners
- [x] Server restart clears all banners
- [x] **Non-authenticated users don't see banner**
- [x] **Guest users cannot access reconnect feature**

### Technical Notes

- **In-Memory Only**: Active lobby tracking is stored in server memory, not database
- **Session-Based**: Uses existing session infrastructure for authentication
- **Socket Integration**: Works seamlessly with existing Socket.IO reconnection system
- **Backward Compatible**: Doesn't break existing functionality for non-authenticated users
- **Lightweight**: Minimal overhead, only stores essential lobby metadata

### Future Enhancements (Optional)

1. **Database Persistence**: Store in MongoDB for server restart resilience
2. **Guest Support**: Add localStorage-based tracking for guest users
3. **Multiple Tabs**: Handle reconnection from different browser tabs
4. **Mobile Optimization**: Improve mobile UI for reconnect banner
5. **Notification**: Push notifications when user is reconnected


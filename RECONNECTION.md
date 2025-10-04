# Mobile Reconnection System Documentation

## Overview

This document explains the comprehensive reconnection system implemented to handle mobile device disconnections, particularly when phone screens turn off during gameplay. The system ensures players can seamlessly rejoin games after temporary network interruptions.

## Problem Statement

When mobile phone screens turn off due to inactivity:
1. **Browser Power Management**: Browsers enter low-power mode
2. **WebSocket Disconnection**: Socket connections are terminated
3. **Game Interruption**: Players are kicked from active games
4. **Poor User Experience**: Players lose progress and must restart

## Solution Architecture

### 1. Grace Period System

#### Server-Side Grace Period
- **30-Second Grace Period**: Disconnected players remain in lobby for 30 seconds
- **Temporary Status**: Players show as "disconnected (reconnecting...)" to others
- **Automatic Cleanup**: Players permanently removed after grace period expires

#### Grace Period Conditions
- Only applies to **authenticated users** (have userId)
- Only applies when **game is active** (lobby.gameId exists)
- Anonymous users and lobby-only disconnections are handled immediately

### 2. Heartbeat/Ping-Pong Mechanism

#### Client-Side Heartbeat
```javascript
// Ping server every 30 seconds
setInterval(() => {
  if (socket && socket.connected) {
    socket.emit('ping');
  }
}, 30000);
```

#### Server-Side Response
```javascript
socket.on('ping', () => {
  socket.emit('pong');
});
```

#### Benefits
- **Early Detection**: Faster disconnection detection
- **Connection Health**: Monitor connection quality
- **Automatic Reconnection**: Socket.IO handles reconnection automatically

### 3. Session Persistence

#### Local Storage
- **Session Data**: Stored in browser localStorage
- **Data Included**: lobbyCode, userId, username, timestamp
- **Expiration**: Sessions expire after 1 hour
- **Automatic Cleanup**: Old sessions are automatically discarded

#### Session Storage Structure
```javascript
{
  lobbyCode: "ABCD",
  userId: "user-123",
  username: "PlayerName",
  timestamp: 1640995200000
}
```

### 4. Reconnection Flow

#### Step 1: Disconnection Detection
1. Socket disconnects (phone screen off, network issue)
2. Server detects disconnection
3. Player marked as "temporarily disconnected"
4. Other players notified of temporary disconnection

#### Step 2: Grace Period
1. Player remains in lobby for 30 seconds
2. Game state preserved
3. Other players see "reconnecting..." status
4. Server waits for reconnection attempt

#### Step 3: Reconnection Attempt
1. Phone screen turns on, browser reconnects
2. Socket.IO automatically reconnects
3. Client detects connection restoration
4. Automatic reconnection attempt sent

#### Step 4: Session Restoration
1. Server validates reconnection request
2. Player restored to lobby with new socket ID
3. Game state reinitialized for reconnected player
4. Other players notified of successful reconnection

#### Step 5: Game Continuation
1. Reconnected player receives current game state
2. Game continues normally
3. No progress lost
4. Seamless user experience

### 5. User Interface Updates

#### Reconnection Status Bar
- **Yellow Banner**: Shows during disconnection/reconnection
- **Messages**: "Disconnected. Attempting to reconnect..."
- **Auto-Hide**: Disappears when reconnection successful

#### Player Status Notifications
- **Temporary Disconnection**: "PlayerName disconnected (reconnecting...)"
- **Successful Reconnection**: "PlayerName has reconnected"
- **Permanent Disconnection**: "PlayerName has left the game"

#### Visual Indicators
- **Color Coding**: Different colors for different status types
- **Temporary Display**: Notifications auto-dismiss after 3 seconds
- **Non-Intrusive**: Doesn't block gameplay

## Implementation Details

### Server-Side Changes

#### Enhanced Disconnect Handler
```javascript
socket.on('disconnect', () => {
  // Check if player qualifies for grace period
  if (removedPlayer.userId && lobby.gameId) {
    // Store for potential reconnection
    disconnectedPlayers.set(removedPlayer.userId, {
      username: removedPlayer.username,
      userId: removedPlayer.userId,
      lobbyCode: code,
      disconnectedAt: Date.now(),
      gameId: lobby.gameId
    });
    
    // Start grace period timer
    setTimeout(() => {
      // Permanently remove if not reconnected
    }, 30000);
  }
});
```

#### Reconnection Handler
```javascript
socket.on('reconnect', ({ playerId, lobbyCode }, callback) => {
  const disconnectedPlayer = disconnectedPlayers.get(playerId);
  if (disconnectedPlayer && disconnectedPlayer.lobbyCode === lobbyCode) {
    // Restore player to lobby
    // Update socket ID
    // Reinitialize in game
    // Notify other players
    callback({ success: true, player: restoredPlayer });
  }
});
```

### Client-Side Changes

#### Automatic Reconnection
```javascript
socket.on('connect', () => {
  if (currentLobbyCode && currentUser) {
    attemptReconnection();
  }
});

function attemptReconnection() {
  socket.emit('reconnect', {
    playerId: currentUser.id,
    lobbyCode: currentLobbyCode
  }, (response) => {
    if (response?.success) {
      // Restore lobby state
      // Continue gameplay
    }
  });
}
```

#### Session Management
```javascript
function storeSessionData() {
  localStorage.setItem('gameSession', JSON.stringify({
    lobbyCode: currentLobbyCode,
    userId: currentUser.id,
    username: currentUser.username,
    timestamp: Date.now()
  }));
}
```

## Configuration Options

### Grace Period Duration
- **Default**: 30 seconds
- **Configurable**: Can be adjusted based on game type
- **Recommendation**: 15-60 seconds depending on game complexity

### Heartbeat Interval
- **Default**: 30 seconds
- **Configurable**: Can be adjusted for different network conditions
- **Recommendation**: 15-45 seconds for mobile networks

### Session Expiration
- **Default**: 1 hour
- **Configurable**: Can be adjusted based on game session length
- **Recommendation**: Match typical game session duration

## Error Handling

### Reconnection Failures
- **Invalid Session**: Player redirected to home page
- **Lobby Not Found**: Session cleared, player notified
- **Game Ended**: Player notified of game completion

### Network Issues
- **Persistent Disconnection**: Grace period expires, player removed
- **Multiple Reconnection Attempts**: Exponential backoff
- **Connection Timeout**: Automatic fallback to home page

### Edge Cases
- **Host Disconnection**: Lobby closes immediately (no grace period)
- **Game End During Disconnection**: Player notified when reconnecting
- **Lobby Full**: Reconnection denied if lobby at capacity

## Testing Scenarios

### Basic Reconnection
1. Join lobby and start game
2. Turn off phone screen
3. Wait for disconnection
4. Turn on phone screen
5. Verify automatic reconnection

### Grace Period Expiry
1. Join lobby and start game
2. Turn off phone screen
3. Wait longer than grace period
4. Turn on phone screen
5. Verify permanent disconnection

### Network Interruption
1. Join lobby and start game
2. Disable network connection
3. Re-enable network connection
4. Verify automatic reconnection

### Multiple Disconnections
1. Join lobby and start game
2. Disconnect and reconnect multiple times
3. Verify graceful handling
4. Verify game state preservation

## Performance Considerations

### Memory Usage
- **Minimal Overhead**: Disconnected players stored temporarily
- **Automatic Cleanup**: Grace period timers automatically clean up
- **Session Limits**: Old sessions automatically expire

### Network Traffic
- **Heartbeat Overhead**: Minimal ping-pong messages
- **Reconnection Efficiency**: Only necessary data transmitted
- **Bandwidth Optimization**: Compressed status updates

### Server Load
- **Grace Period Management**: Efficient timer handling
- **Session Storage**: In-memory with automatic cleanup
- **Scalability**: Designed for multiple concurrent games

## Security Considerations

### Session Validation
- **User ID Verification**: Only authenticated users get grace period
- **Lobby Code Matching**: Reconnection requires correct lobby code
- **Timestamp Validation**: Old sessions automatically rejected

### Abuse Prevention
- **Rate Limiting**: Reconnection attempts limited
- **Session Expiration**: Prevents indefinite session storage
- **User Verification**: Only original user can reconnect

## Future Enhancements

### Advanced Features
- **Predictive Reconnection**: Machine learning for disconnection prediction
- **Offline Mode**: Limited offline functionality
- **State Compression**: More efficient state transfer
- **Multi-Device Sync**: Reconnection across devices

### Analytics
- **Reconnection Success Rate**: Track reconnection effectiveness
- **Disconnection Patterns**: Identify common disconnection causes
- **Performance Metrics**: Monitor system performance impact

## Conclusion

The mobile reconnection system provides a robust solution for handling temporary disconnections during gameplay. By implementing grace periods, heartbeat mechanisms, session persistence, and automatic reconnection, players can seamlessly continue their games even when phone screens turn off or network connections are interrupted.

The system balances user experience with system performance, ensuring that temporary disconnections don't disrupt gameplay while preventing abuse and maintaining system stability.

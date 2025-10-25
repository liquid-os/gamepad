# Game Template

This is a comprehensive template for creating games on the BuddyBox.tv platform. Use this template as a starting point for your own games.

## 📁 File Structure

```
game-template/
├── game.json              # Game metadata and configuration
├── server.js              # Server-side game logic
├── logo.png               # Game logo (200x200px PNG)
└── client/
    ├── index.html         # Player interface
    ├── player.js          # Client-side logic
    ├── style.css          # Player styling
    ├── host-scene.html    # Host display (TV screen)
    └── host-scene.js      # Host display logic
```

## 🚀 Getting Started

1. **Copy the template**: Copy the entire `game-template` folder and rename it to your game's ID
2. **Update game.json**: Modify the metadata (id, name, description, etc.)
3. **Customize server.js**: Implement your game logic in the server file
4. **Design the UI**: Update the HTML and CSS files for your game's look and feel
5. **Test your game**: Upload and test your game on the platform

## 📋 Required Files

### logo.png
**REQUIRED**: Game logo image
- Must be exactly 200x200 pixels
- Must be PNG format
- Place in the root of your game folder
- This will be displayed on game cards throughout the platform

### game.json
Contains your game's metadata:
- `id`: Unique identifier (must match folder name)
- `name`: Display name
- `description`: Brief description
- `minPlayers`/`maxPlayers`: Player limits
- `category`: Game category
- `version`: Version number

### server.js
Must export an object with these required functions:
- `meta`: Game metadata object
- `onInit(lobby, api)`: Called when game starts
- `onPlayerJoin(lobby, api, player)`: Called when player joins
- `onAction(lobby, api, player, data)`: Called when player acts
- `onPlayerDisconnect(lobby, api, playerId)`: Called when player leaves (optional)
- `onEnd(lobby, api)`: Called when game ends (optional)

### client/index.html
The player interface that players see on their devices.

### client/player.js
Client-side JavaScript that handles:
- Socket communication with server
- UI updates based on game state
- Player input handling

### client/style.css
Styling for the player interface.

### client/host-scene.html & host-scene.js
Optional host display that shows on the TV screen.

## 🔧 API Reference

### Server API (api object)
- `api.sendToAll(event, data)`: Send message to all players
- `api.sendToPlayer(playerId, event, data)`: Send message to specific player
- `api.sendToHost(event, data)`: Send message to host display
- `api.setState(state)`: Update game state
- `api.getState()`: Get current game state

### Client Socket Events
Listen for:
- `gameState`: Game state updates
- `gameMessage`: Server messages
- `error`: Error messages

Send:
- `playerAction`: Player actions to server

## 🎮 Game Phases

The template includes these standard game phases:
- `waiting`: Waiting for players to join
- `ready`: All players joined, ready to start
- `playing`: Game in progress
- `finished`: Game completed

## 💡 Customization Tips

1. **Game Logic**: Modify the helper functions in server.js to implement your game mechanics
2. **UI Design**: Update the HTML structure and CSS to match your game's theme
3. **Player Actions**: Add new action types in the `onAction` handler
4. **Host Display**: Customize the host display for your game's needs
5. **Styling**: Use the existing CSS classes or create new ones for your design

## 📝 Example Game Flow

1. Players join the game
2. Game waits for minimum number of players
3. Players mark themselves as ready
4. Game starts when all players are ready
5. Players take turns or perform actions
6. Game checks for win conditions
7. Game ends and shows results

## 🔍 Testing

1. Upload your game ZIP file through the creator dashboard
2. Test with multiple players joining
3. Verify all game phases work correctly
4. Check that host display updates properly
5. Test error handling and edge cases

## 📚 Additional Resources

- Check existing games in the `/games` folder for more examples
- Review the platform documentation for advanced features
- Test your game thoroughly before submitting for approval

---

**Happy game development!** 🎮✨

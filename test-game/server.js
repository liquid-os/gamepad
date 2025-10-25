module.exports = {
  meta: {
    id: 'test-game',
    name: 'Test Game',
    minPlayers: 2,
    maxPlayers: 4,
    description: 'A simple test game for debugging'
  },
  
  onInit(lobby, api) {
    console.log('Test game initialized');
    api.broadcast('gameStarted', { message: 'Test game started!' });
  },
  
  onPlayerJoin(lobby, api, player) {
    console.log(`Player ${player.name} joined test game`);
    api.broadcast('playerJoined', { player: player.name });
  },
  
  onAction(lobby, api, player, data) {
    console.log(`Player ${player.name} performed action:`, data);
    api.broadcast('actionPerformed', { player: player.name, action: data });
  },
  
  onEnd(lobby, api) {
    console.log('Test game ended');
    api.broadcast('gameEnded', { message: 'Test game completed!' });
  }
};

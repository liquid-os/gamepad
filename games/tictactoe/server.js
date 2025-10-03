module.exports = {
  meta: {
    id: 'tictactoe',
    name: 'Tic Tac Toe',
    minPlayers: 2,
    maxPlayers: 2,
    description: 'Classic 3x3 grid strategy game'
  },

  onInit(lobby, api) {
    lobby.state = {
      board: Array(9).fill(null),
      currentTurn: null,
      winner: null,
      gamePhase: 'waiting', // waiting, playing, finished
      playerSymbols: {}
    };

    // Send initial host update
    api.sendToHost('hostGameUpdate', {
      gamePhase: 'waiting',
      board: lobby.state.board,
      currentTurn: null,
      winner: null,
      playerSymbols: {}
    });

    // Assign symbols to players
    if (lobby.players.length >= 2) {
      lobby.state.playerSymbols[lobby.players[0].id] = 'X';
      lobby.state.playerSymbols[lobby.players[1].id] = 'O';
      lobby.state.currentTurn = lobby.players[0].id;
      lobby.state.gamePhase = 'playing';
      
      api.sendToAll('gameMessage', { text: `Game started! ${lobby.players[0].username} (X) goes first.` });
      api.sendToAll('updateState', lobby.state);
      
      // Send host update
      api.sendToHost('hostGameUpdate', {
        gamePhase: 'playing',
        board: lobby.state.board,
        currentTurn: lobby.players[0].username,
        winner: null,
        playerSymbols: lobby.state.playerSymbols
      });
    }
  },

  onPlayerJoin(lobby, api, player) {
    // If more than 2 join, just spectators
    if (lobby.players.length > 2) {
      api.sendToPlayer(player.id, 'gameMessage', { text: 'You are spectating TicTacToe.' });
      api.sendToPlayer(player.id, 'updateState', lobby.state);
      return;
    }

    // Assign symbol to new player if game hasn't started
    if (lobby.state.gamePhase === 'waiting' && lobby.players.length === 2) {
      lobby.state.playerSymbols[lobby.players[0].id] = 'X';
      lobby.state.playerSymbols[lobby.players[1].id] = 'O';
      lobby.state.currentTurn = lobby.players[0].id;
      lobby.state.gamePhase = 'playing';
      
      api.sendToAll('gameMessage', { text: `Game started! ${lobby.players[0].username} (X) goes first.` });
      api.sendToAll('updateState', lobby.state);
      
      // Send host update
      api.sendToHost('hostGameUpdate', {
        gamePhase: 'playing',
        board: lobby.state.board,
        currentTurn: lobby.players[0].username,
        winner: null,
        playerSymbols: lobby.state.playerSymbols
      });
    }
  },

  onAction(lobby, api, player, data) {
    const state = lobby.state;
    
    // Game must be in playing phase
    if (state.gamePhase !== 'playing') {
      api.sendToPlayer(player.id, 'gameMessage', { text: 'Game is not in playing phase!' });
      return;
    }

    // Check if it's the player's turn
    if (player.id !== state.currentTurn) {
      api.sendToPlayer(player.id, 'gameMessage', { text: 'Not your turn!' });
      return;
    }

    const { index } = data;
    
    // Validate move
    if (index < 0 || index > 8) {
      api.sendToPlayer(player.id, 'gameMessage', { text: 'Invalid move!' });
      return;
    }

    if (state.board[index] !== null) {
      api.sendToPlayer(player.id, 'gameMessage', { text: 'That square is already taken!' });
      return;
    }

    // Make the move
    state.board[index] = player.id;
    
    // Check for win
    const winningCombos = [
      [0,1,2],[3,4,5],[6,7,8], // rows
      [0,3,6],[1,4,7],[2,5,8], // columns
      [0,4,8],[2,4,6] // diagonals
    ];

    for (let combo of winningCombos) {
      const [a,b,c] = combo;
      if (state.board[a] && state.board[a] === state.board[b] && state.board[a] === state.board[c]) {
        state.winner = player.id;
        state.gamePhase = 'finished';
        api.sendToAll('gameMessage', { text: `🎉 ${player.username} wins!` });
        api.sendToAll('updateState', state);
        
        // Send host update
        api.sendToHost('hostGameUpdate', {
          gamePhase: 'finished',
          board: state.board,
          currentTurn: null,
          winner: player.username,
          playerSymbols: state.playerSymbols
        });

        // Send game ended event
        const scores = {};
        lobby.players.forEach(p => {
          scores[p.username] = p.id === player.id ? 1 : 0;
        });
        api.sendToAll('gameEnded', {
          gameId: 'tictactoe',
          gameName: 'Tic Tac Toe',
          scores: scores,
          winner: player.username
        });
        return;
      }
    }

    // Check for tie
    if (state.board.every(cell => cell !== null)) {
      state.gamePhase = 'finished';
      api.sendToAll('gameMessage', { text: "It's a tie!" });
      api.sendToAll('updateState', state);
      
      // Send host update
      api.sendToHost('hostGameUpdate', {
        gamePhase: 'finished',
        board: state.board,
        currentTurn: null,
        winner: null,
        playerSymbols: state.playerSymbols
      });

      // Send game ended event for tie
      const scores = {};
      lobby.players.forEach(p => {
        scores[p.username] = 0; // Tie - no winner
      });
      api.sendToAll('gameEnded', {
        gameId: 'tictactoe',
        gameName: 'Tic Tac Toe',
        scores: scores,
        winner: null
      });
      return;
    }

    // Switch turn
    const otherPlayer = lobby.players.find(p => p.id !== player.id);
    if (otherPlayer) {
      state.currentTurn = otherPlayer.id;
      api.sendToAll('gameMessage', { text: `${otherPlayer.username}'s turn` });
    }

    api.setState(state);
    api.sendToAll('updateState', state);
    
    // Send host update
    api.sendToHost('hostGameUpdate', {
      gamePhase: 'playing',
      board: state.board,
      currentTurn: otherPlayer ? otherPlayer.username : null,
      winner: null,
      playerSymbols: state.playerSymbols
    });
  },

  onEnd(lobby, api) {
    api.sendToAll('gameMessage', { text: 'TicTacToe ended.' });
  }
};
  
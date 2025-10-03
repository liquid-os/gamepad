module.exports = {
  meta: {
    id: 'wordgame',
    name: 'Word Association',
    minPlayers: 2,
    maxPlayers: 8,
    description: 'Think of words that start with the given letter!'
  },

  onInit(lobby, api) {
    lobby.state = {
      currentLetter: null,
      round: 1,
      maxRounds: 5,
      gamePhase: 'waiting', // waiting, playing, results, finished
      playerWords: {},
      scores: {},
      roundStartTime: null,
      roundResults: []
    };

    // Initialize scores for all players
    lobby.players.forEach(player => {
      lobby.state.scores[player.id] = 0;
    });

    // Create scores with usernames for host display
    const scoresWithNames = {};
    lobby.players.forEach(player => {
      scoresWithNames[player.username] = 0;
    });

    // Send initial host update
    api.sendToHost('hostGameUpdate', {
      gamePhase: 'waiting',
      currentWord: null,
      round: 1,
      scores: scoresWithNames
    });

    api.sendToAll('gameMessage', { text: 'Word Association game started! Think of words that start with the given letter!' });
    api.sendToAll('updateState', lobby.state);
    
    // Start first round after a short delay
    setTimeout(() => {
      this.startNewRound(lobby, api);
    }, 2000);
  },

  onPlayerJoin(lobby, api, player) {
    // Add new player to scores
    lobby.state.scores[player.id] = 0;
    
    if (lobby.state.gamePhase === 'waiting') {
      api.sendToPlayer(player.id, 'gameMessage', { text: 'Welcome to Word Association! Waiting for the game to start...' });
    } else {
      api.sendToPlayer(player.id, 'gameMessage', { text: 'You joined mid-game! Current scores will be shown.' });
    }
    
    api.sendToPlayer(player.id, 'updateState', lobby.state);
  },

  onAction(lobby, api, player, data) {
    const state = lobby.state;
    
    if (state.gamePhase === 'playing' && data.word) {
      // Player submitted a word
      const word = data.word.toLowerCase().trim();
      
      if (word.length === 0) {
        api.sendToPlayer(player.id, 'gameMessage', { text: 'Please enter a valid word!' });
        return;
      }
      
      if (!word.startsWith(state.currentLetter.toLowerCase())) {
        api.sendToPlayer(player.id, 'gameMessage', { text: `Word must start with the letter "${state.currentLetter}"!` });
        return;
      }
      
      state.playerWords[player.id] = {
        word: word,
        time: Date.now() - state.roundStartTime,
        player: player.username
      };
      
      api.sendToPlayer(player.id, 'gameMessage', { text: `Great! You submitted "${word}"` });
      
      // Check if all players have submitted words
      const submittedCount = Object.keys(state.playerWords).length;
      if (submittedCount === lobby.players.length) {
        this.endRound(lobby, api);
      }
    }
  },

  onEnd(lobby, api) {
    api.sendToAll('gameMessage', { text: 'Word Association game ended. Thanks for playing!' });
  },

  startNewRound(lobby, api) {
    if (lobby.state.round > lobby.state.maxRounds) {
      // Game finished
      lobby.state.gamePhase = 'finished';
      this.showFinalScores(lobby, api);
      return;
    }

    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
    const randomLetter = letters[Math.floor(Math.random() * letters.length)];
    
    lobby.state.currentLetter = randomLetter;
    lobby.state.gamePhase = 'playing';
    lobby.state.playerWords = {};
    lobby.state.roundStartTime = Date.now();

    api.sendToAll('gameMessage', { text: `Round ${lobby.state.round}: Think of a word that starts with "${randomLetter}"!` });
    api.sendToAll('updateState', lobby.state);
    
    // Create scores with usernames for host display
    const scoresWithNames = {};
    lobby.players.forEach(player => {
      scoresWithNames[player.username] = lobby.state.scores[player.id] || 0;
    });

    // Send host update
    api.sendToHost('hostGameUpdate', {
      gamePhase: 'playing',
      currentWord: randomLetter,
      round: lobby.state.round,
      scores: scoresWithNames
    });
    
    // Auto-end round after 30 seconds
    setTimeout(() => {
      if (lobby.state.gamePhase === 'playing') {
        this.endRound(lobby, api);
      }
    }, 30000);
  },

  endRound(lobby, api) {
    const state = lobby.state;
    state.gamePhase = 'results';

    // Calculate scores for this round
    const wordCounts = {};
    Object.values(state.playerWords).forEach(entry => {
      const word = entry.word;
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    });

    // Award points: unique words get 10 points, duplicates get 5 points
    Object.keys(state.playerWords).forEach(playerId => {
      const entry = state.playerWords[playerId];
      const points = wordCounts[entry.word] === 1 ? 10 : 5;
      state.scores[playerId] += points;
    });

    // Store round results
    const roundResult = {
      letter: state.currentLetter,
      words: Object.values(state.playerWords).map(entry => ({
        player: entry.player,
        word: entry.word,
        points: wordCounts[entry.word] === 1 ? 10 : 5,
        unique: wordCounts[entry.word] === 1
      }))
    };
    
    state.roundResults.push(roundResult);

    api.sendToAll('gameMessage', { text: `Round ${state.round} results:` });
    api.sendToAll('showRoundResults', roundResult);
    api.sendToAll('updateState', state);
    
    // Create scores with usernames for host display
    const scoresWithNames = {};
    lobby.players.forEach(player => {
      scoresWithNames[player.username] = state.scores[player.id] || 0;
    });

    // Send host update
    api.sendToHost('hostGameUpdate', {
      gamePhase: 'results',
      currentWord: state.currentLetter,
      round: state.round,
      scores: scoresWithNames
    });

    // Move to next round after 5 seconds
    setTimeout(() => {
      state.round++;
      this.startNewRound(lobby, api);
    }, 5000);
  },

  showFinalScores(lobby, api) {
    const scores = Object.keys(lobby.state.scores)
      .map(playerId => ({
        player: lobby.players.find(p => p.id === playerId)?.username || 'Unknown',
        score: lobby.state.scores[playerId]
      }))
      .sort((a, b) => b.score - a.score);

    api.sendToAll('gameMessage', { text: '🎉 Game finished! Final scores:' });
    api.sendToAll('finalScores', scores);
    
    // Create scores with usernames for host display
    const scoresWithNames = {};
    lobby.players.forEach(player => {
      scoresWithNames[player.username] = lobby.state.scores[player.id] || 0;
    });

    // Send host update
    api.sendToHost('hostGameUpdate', {
      gamePhase: 'finished',
      currentWord: null,
      round: lobby.state.round,
      scores: scoresWithNames
    });

    // Send game ended event
    api.sendToAll('gameEnded', {
      gameId: 'wordgame',
      gameName: 'Word Association',
      scores: scoresWithNames,
      finalScores: scores
    });
  }
};


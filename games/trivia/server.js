// Helper functions
function startNextQuestion(lobby, api) {
  const questions = [
    {
      question: "What is the capital of France?",
      options: ["London", "Paris", "Berlin", "Madrid"],
      correct: 1
    },
    {
      question: "Which planet is known as the Red Planet?",
      options: ["Venus", "Mars", "Jupiter", "Saturn"],
      correct: 1
    },
    {
      question: "What is 2 + 2?",
      options: ["3", "4", "5", "6"],
      correct: 1
    },
    {
      question: "Which ocean is the largest?",
      options: ["Atlantic", "Indian", "Pacific", "Arctic"],
      correct: 2
    },
    {
      question: "What year did World War II end?",
      options: ["1944", "1945", "1946", "1947"],
      correct: 1
    }
  ];

  if (lobby.state.questionIndex >= questions.length) {
    // Game finished
    lobby.state.gamePhase = 'finished';
    showFinalScores(lobby, api);
    return;
  }

  const question = questions[lobby.state.questionIndex];
  lobby.state.currentQuestion = question;
  lobby.state.gamePhase = 'question';
  lobby.state.answers = {};
  lobby.state.questionStartTime = Date.now();

  api.sendToAll('gameMessage', { text: `Question ${lobby.state.questionIndex + 1}: ${question.question}` });
  api.sendToAll('updateState', lobby.state);
  
  // Create scores with usernames for host display
  const scoresWithNames = {};
  lobby.players.forEach(player => {
    scoresWithNames[player.username] = lobby.state.scores[player.id] || 0;
  });

  // Send host update
  api.sendToHost('hostGameUpdate', {
    gamePhase: 'question',
    currentQuestion: question,
    questionIndex: lobby.state.questionIndex,
    totalQuestions: 5,
    scores: scoresWithNames
  });
  
  // Auto-advance after 30 seconds
  setTimeout(() => {
    if (lobby.state.gamePhase === 'question') {
      showResults(lobby, api);
    }
  }, 30000);
}

function showResults(lobby, api) {
  const state = lobby.state;
  const question = state.currentQuestion;
  state.gamePhase = 'results';

  // Calculate scores
  Object.keys(state.answers).forEach(playerId => {
    const answer = state.answers[playerId];
    const isCorrect = answer.answer === question.correct;
    const timeBonus = Math.max(0, 10 - Math.floor(answer.time / 1000)); // Bonus for quick answers
    
    if (isCorrect) {
      state.scores[playerId] += 10 + timeBonus;
    }
  });

  // Send results
  const results = {
    question: question.question,
    correctAnswer: question.options[question.correct],
    playerAnswers: Object.keys(state.answers).map(playerId => ({
      player: lobby.players.find(p => p.id === playerId)?.username || 'Unknown',
      answer: question.options[state.answers[playerId].answer],
      correct: state.answers[playerId].answer === question.correct,
      time: state.answers[playerId].time
    })),
    scores: Object.keys(state.scores).map(playerId => ({
      player: lobby.players.find(p => p.id === playerId)?.username || 'Unknown',
      score: state.scores[playerId]
    }))
  };

  api.sendToAll('gameMessage', { text: `Correct answer: ${question.options[question.correct]}` });
  api.sendToAll('showResults', results);
  api.sendToAll('updateState', state);
  
  // Create scores with usernames for host display
  const scoresWithNames = {};
  lobby.players.forEach(player => {
    scoresWithNames[player.username] = state.scores[player.id] || 0;
  });

  // Send host update
  api.sendToHost('hostGameUpdate', {
    gamePhase: 'results',
    currentQuestion: question,
    questionIndex: state.questionIndex,
    totalQuestions: 5,
    scores: scoresWithNames
  });

  // Move to next question after 5 seconds
  setTimeout(() => {
    lobby.state.questionIndex++;
    startNextQuestion(lobby, api);
  }, 5000);
}

function showFinalScores(lobby, api) {
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
    currentQuestion: null,
    questionIndex: lobby.state.questionIndex,
    totalQuestions: 5,
    scores: scoresWithNames
  });

  // Send game ended event to all players
  api.sendToAll('gameEnded', {
    gameId: 'trivia',
    gameName: 'Quick Trivia',
    scores: scoresWithNames,
    finalScores: scores
  });
}

module.exports = {
  meta: {
    id: 'trivia',
    name: 'Quick Trivia',
    minPlayers: 2,
    maxPlayers: 8,
    description: 'Answer trivia questions and see who knows the most!'
  },

  onInit(lobby, api) {
    lobby.state = {
      currentQuestion: null,
      questionIndex: 0,
      scores: {},
      gamePhase: 'waiting', // waiting, question, results, finished
      answers: {},
      questionStartTime: null
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
      currentQuestion: null,
      questionIndex: 0,
      totalQuestions: 5,
      scores: scoresWithNames
    });

    api.sendToAll('gameMessage', { text: 'Trivia game started! Get ready for some questions!' });
    api.sendToAll('updateState', lobby.state);
    
    // Start first question after a short delay
    setTimeout(() => {
      startNextQuestion(lobby, api);
    }, 2000);
  },

  onPlayerJoin(lobby, api, player) {
    // Add new player to scores
    lobby.state.scores[player.id] = 0;
    
    if (lobby.state.gamePhase === 'waiting') {
      api.sendToPlayer(player.id, 'gameMessage', { text: 'Welcome to Trivia! Waiting for the game to start...' });
    } else {
      api.sendToPlayer(player.id, 'gameMessage', { text: 'You joined mid-game! Current scores will be shown.' });
    }
    
    api.sendToPlayer(player.id, 'updateState', lobby.state);
  },

  onAction(lobby, api, player, data) {
    console.log(`[Trivia] onAction called: player=${player.username}, data=`, data);
    const state = lobby.state;
    
    if (state.gamePhase === 'question' && data.answer !== undefined) {
      console.log(`[Trivia] Player ${player.username} submitted answer: ${data.answer}`);
      // Player submitted an answer
      state.answers[player.id] = {
        answer: data.answer,
        time: Date.now() - state.questionStartTime,
        player: player.username
      };
      
      api.sendToPlayer(player.id, 'gameMessage', { text: 'Answer submitted! Waiting for other players...' });
      
      // Send host update showing who answered
      const answeredPlayers = Object.values(state.answers).map(answer => answer.player);
      const remainingPlayers = lobby.players
        .filter(p => !state.answers[p.id])
        .map(p => p.username);
      
      // Create scores with usernames for host display
      const scoresWithNames = {};
      lobby.players.forEach(player => {
        scoresWithNames[player.username] = state.scores[player.id] || 0;
      });
      
      api.sendToHost('hostGameUpdate', {
        gamePhase: 'question',
        currentQuestion: state.currentQuestion,
        questionIndex: state.questionIndex,
        totalQuestions: 5,
        scores: scoresWithNames,
        answeredPlayers: answeredPlayers,
        remainingPlayers: remainingPlayers,
        questionStartTime: state.questionStartTime
      });
      
      // Check if all players have answered
      const answeredCount = Object.keys(state.answers).length;
      console.log(`[Trivia] Answered count: ${answeredCount}/${lobby.players.length}`);
      if (answeredCount === lobby.players.length) {
        console.log(`[Trivia] All players answered, showing results`);
        showResults(lobby, api);
      }
    } else {
      console.log(`[Trivia] Invalid action: gamePhase=${state.gamePhase}, answer=${data.answer}`);
    }
  },

  onEnd(lobby, api) {
    api.sendToAll('gameMessage', { text: 'Trivia game ended. Thanks for playing!' });
  }
};


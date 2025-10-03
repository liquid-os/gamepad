const mongoose = require('mongoose');
const Game = require('../models/Game');
const config = require('../config');

async function populateGames() {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing games
    await Game.deleteMany({});
    console.log('Cleared existing games');

    // Define games to add
    const games = [
      {
        id: 'tictactoe',
        name: 'Tic Tac Toe',
        description: 'Classic 3x3 grid strategy game for 2 players',
        price: 0, // Free game
        minPlayers: 2,
        maxPlayers: 2,
        category: 'strategy',
        thumbnail: '⭕'
      },
      {
        id: 'trivia',
        name: 'Quick Trivia',
        description: 'Answer trivia questions and see who knows the most!',
        price: 50,
        minPlayers: 2,
        maxPlayers: 8,
        category: 'trivia',
        thumbnail: '🧠'
      },
      {
        id: 'wordgame',
        name: 'Word Association',
        description: 'Think of words that start with the given letter!',
        price: 30,
        minPlayers: 2,
        maxPlayers: 8,
        category: 'word',
        thumbnail: '📝'
      }
    ];

    // Insert games
    for (const gameData of games) {
      const game = new Game(gameData);
      await game.save();
      console.log(`Added game: ${game.name}`);
    }

    console.log('Games populated successfully!');
    process.exit(0);

  } catch (error) {
    console.error('Error populating games:', error);
    process.exit(1);
  }
}

populateGames();

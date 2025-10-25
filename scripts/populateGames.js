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
      },
      {
        id: 'rpg',
        name: 'Co-op RPG Quest',
        description: 'Team up with friends in an epic RPG adventure! Choose your class, battle enemies, and conquer challenges together.',
        price: 100,
        minPlayers: 2,
        maxPlayers: 8,
        category: 'rpg',
        thumbnail: '⚔️',
        images: [
          {
            url: '/games/rpg/assets/thumbnail.png',
            caption: 'Co-op RPG Quest',
            isMain: true
          }
        ]
      },
      {
        id: 'fighter',
        name: 'Street Brawler',
        description: 'Classic 2D fighting game! Use your virtual controller to move, jump, and unleash combos against your opponent!',
        price: 50,
        minPlayers: 2,
        maxPlayers: 2,
        category: 'action',
        thumbnail: '🥊',
        images: [
          {
            url: '/games/fighter/assets/thumbnail.png',
            caption: 'Street Brawler',
            isMain: true
          }
        ]
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

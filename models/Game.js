const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    default: 0
  },
  minPlayers: {
    type: Number,
    required: true,
    default: 2
  },
  maxPlayers: {
    type: Number,
    required: true,
    default: 8
  },
  category: {
    type: String,
    enum: ['strategy', 'trivia', 'word', 'action', 'puzzle'],
    default: 'strategy'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  thumbnail: {
    type: String,
    default: '🎮'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Game', gameSchema);

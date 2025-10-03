const mongoose = require('mongoose');
const User = require('../models/User');
const config = require('../config');

async function grantFreeGamesToAllUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all users
    const users = await User.find({});
    console.log(`Found ${users.length} users`);

    // Grant free games to each user
    for (const user of users) {
      await user.grantFreeGames();
      console.log(`Granted free games to user: ${user.username}`);
    }

    console.log('Free games granted to all users successfully!');
    process.exit(0);

  } catch (error) {
    console.error('Error granting free games:', error);
    process.exit(1);
  }
}

grantFreeGamesToAllUsers();

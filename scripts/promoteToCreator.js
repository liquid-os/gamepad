const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function promoteUserToCreator() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gamepad');
    console.log('Connected to MongoDB');

    // Get username from command line argument
    const username = process.argv[2];
    if (!username) {
      console.log('Usage: node promoteToCreator.js <username>');
      process.exit(1);
    }

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      console.log(`User '${username}' not found`);
      process.exit(1);
    }

    // Promote to creator
    await user.promoteToCreator({
      studioName: 'Test Studio',
      bio: 'Test creator for development',
      website: '',
      payoutEmail: user.email
    });

    console.log(`Successfully promoted ${username} to creator`);
    console.log('User details:', {
      username: user.username,
      role: user.role,
      creatorProfile: user.creatorProfile
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

promoteUserToCreator();

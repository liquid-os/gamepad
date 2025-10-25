const mongoose = require('mongoose');
const User = require('../models/User');
const config = require('../config');

async function addCoins() {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.MONGODB_URI);
    console.log('Connected to MongoDB');

    const email = process.argv[2];
    const coinsToAdd = parseInt(process.argv[3]) || 0;

    if (!email) {
      console.error('Usage: node scripts/addCoins.js <email> <coins>');
      process.exit(1);
    }

    // Find user by email
    const user = await User.findOne({ email: email });

    if (!user) {
      console.error(`User not found with email: ${email}`);
      process.exit(1);
    }

    // Add coins
    const oldBalance = user.coins;
    user.coins += coinsToAdd;
    await user.save();

    console.log(`\n✅ Coins added successfully!`);
    console.log(`User: ${user.username} (${user.email})`);
    console.log(`Old balance: ${oldBalance} coins`);
    console.log(`Added: +${coinsToAdd} coins`);
    console.log(`New balance: ${user.coins} coins`);
    console.log('');

    process.exit(0);

  } catch (error) {
    console.error('Error adding coins:', error);
    process.exit(1);
  }
}

addCoins();


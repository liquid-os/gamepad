const mongoose = require('mongoose');
const User = require('../models/User');
const config = require('../config');

async function giveCoins() {
  try {
    await mongoose.connect(config.MONGODB_URI);

    const user = await User.findOne({ email: 'adam.shannon098@gmail.com' });
    
    if (!user) {
      console.log('ERROR: User not found!');
      process.exit(1);
    }

    const oldBalance = user.coins;
    user.coins = oldBalance + 10000;
    await user.save();

    console.log('SUCCESS!');
    console.log('User:', user.username);
    console.log('Old balance:', oldBalance);
    console.log('New balance:', user.coins);
    
    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.log('ERROR:', error.message);
    process.exit(1);
  }
}

giveCoins();


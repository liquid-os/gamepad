const mongoose = require('mongoose');
const User = require('../models/User');
const config = require('../config');

async function checkUser() {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const email = 'adam.shannon098@gmail.com';
    const user = await User.findOne({ email: email });

    if (!user) {
      console.log('❌ User not found with email:', email);
      console.log('\nAvailable users:');
      const allUsers = await User.find({}).select('username email coins');
      allUsers.forEach(u => {
        console.log(`  - ${u.username} (${u.email}) - ${u.coins} coins`);
      });
    } else {
      console.log('✅ User found!');
      console.log(`Username: ${user.username}`);
      console.log(`Email: ${user.email}`);
      console.log(`Current coins: ${user.coins}`);
      console.log(`Owned games: ${user.ownedGames.length}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUser();


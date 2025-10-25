const mongoose = require('mongoose');
const User = require('../models/User');
const config = require('../config');
const fs = require('fs');

async function addCoinsAndVerify() {
  const output = [];
  
  try {
    await mongoose.connect(config.MONGODB_URI);
    output.push('✅ Connected to MongoDB');

    const user = await User.findOne({ email: 'adam.shannon098@gmail.com' });
    
    if (!user) {
      output.push('❌ User not found!');
      fs.writeFileSync('coin-result.txt', output.join('\n'));
      process.exit(1);
    }

    const oldBalance = user.coins;
    user.coins = oldBalance + 10000;
    await user.save();

    output.push('');
    output.push('🎉 SUCCESS! 10,000 coins added!');
    output.push('');
    output.push(`👤 User: ${user.username}`);
    output.push(`📧 Email: ${user.email}`);
    output.push(`💰 Old balance: ${oldBalance} coins`);
    output.push(`💰 New balance: ${user.coins} coins`);
    output.push(`➕ Added: +10,000 coins`);
    output.push('');
    
    const result = output.join('\n');
    fs.writeFileSync('coin-result.txt', result);
    console.log(result);
    
    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    output.push(`❌ ERROR: ${error.message}`);
    fs.writeFileSync('coin-result.txt', output.join('\n'));
    console.log(output.join('\n'));
    process.exit(1);
  }
}

addCoinsAndVerify();


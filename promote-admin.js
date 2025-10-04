const mongoose = require('mongoose');
const User = require('./models/User');
const config = require('./config');

async function promoteToAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.MONGODB_URI);
    console.log('Connected to MongoDB');

    const username = process.argv[2];
    if (!username) {
      console.log('Usage: node promote-admin.js <username>');
      process.exit(1);
    }

    const user = await User.findOne({ username });
    if (!user) {
      console.log(`User '${username}' not found`);
      process.exit(1);
    }

    user.role = 'admin';
    await user.save();

    console.log(`✅ Successfully promoted ${username} to admin`);
    process.exit(0);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

promoteToAdmin();

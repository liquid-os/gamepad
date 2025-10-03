// Copy this file to config.js and update with your MongoDB connection string
module.exports = {
  // MongoDB Connection String
  // Get this from MongoDB Atlas or use local MongoDB
  MONGODB_URI: 'mongodb+srv://root:4FczYoVyrjPuJSim@gamepad.ypzpfer.mongodb.net/?retryWrites=true&w=majority&appName=gamepad',
  
  // Session Secret (use a random string in production)
  SESSION_SECRET: '70eb178ce3246deeaaa619c92c1c0312341bf2124ccf6e2de229276d057c34db6647f5f16a3fea521c2481394af710a2f78914ddad5a06de66ba9ca14573163f',
  
  // Server Port
  PORT: 3000,
  
  // Free Games - Games that all users automatically own (like Wii Sports)
  FREE_GAMES: ['tictactoe'] // Add game IDs that should be free for all users
};

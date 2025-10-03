const mongoose = require('mongoose');
const config = require('../config');

const connectDB = async () => {
  try {
    console.log('Connecting to MongoDB...');
    console.log('MongoDB URI:', config.MONGODB_URI);
    
    const conn = await mongoose.connect(config.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error);
    console.error('Please check your MongoDB connection string in config.js');
    console.error('Current MongoDB URI:', config.MONGODB_URI);
    console.error('For local development, make sure MongoDB is running on localhost:27017');
    process.exit(1);
  }
};

module.exports = connectDB;

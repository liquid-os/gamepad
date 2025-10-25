#!/usr/bin/env node

/**
 * Migration script to set approved=true for existing games
 * This ensures existing games continue to work with the new approval system
 */

const mongoose = require('mongoose');
const Game = require('../models/Game');
const config = require('../config');

async function migrateExistingGames() {
  try {
    console.log('🔄 Starting migration of existing games...');
    
    // Connect to MongoDB
    await mongoose.connect(config.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find all games that don't have the approved field set
    const games = await Game.find({ approved: { $exists: false } });
    console.log(`📊 Found ${games.length} games to migrate`);
    
    if (games.length === 0) {
      console.log('✅ No games need migration');
      return;
    }
    
    // Update all existing games to be approved
    const result = await Game.updateMany(
      { approved: { $exists: false } },
      { 
        $set: { 
          approved: true,
          status: 'approved'
        } 
      }
    );
    
    console.log(`✅ Successfully migrated ${result.modifiedCount} games`);
    
    // List the migrated games
    const migratedGames = await Game.find({ approved: true });
    console.log('\n📋 Migrated games:');
    migratedGames.forEach(game => {
      console.log(`  - ${game.name} (${game.id})`);
    });
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('All existing games are now approved and available.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateExistingGames();
}

module.exports = migrateExistingGames;

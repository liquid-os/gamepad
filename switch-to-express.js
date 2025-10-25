#!/usr/bin/env node
/**
 * Helper script to rollback to Express version
 * Run: node switch-to-express.js
 */

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🎮 Party Game Hub - Rollback to Express\n');

// Check if backup exists
if (!fs.existsSync('package-express-backup.json')) {
  console.error('❌ Error: package-express-backup.json not found!');
  console.log('Cannot rollback - no backup found.');
  process.exit(1);
}

// Backup Next.js package.json
if (fs.existsSync('package.json')) {
  console.log('📦 Backing up Next.js package.json...');
  fs.copyFileSync('package.json', 'package-nextjs-backup.json');
  console.log('✅ Backed up to package-nextjs-backup.json');
}

// Restore Express package.json
console.log('📦 Restoring Express package.json...');
fs.copyFileSync('package-express-backup.json', 'package.json');
console.log('✅ Restored Express version');

// Install dependencies
console.log('\n📥 Installing Express dependencies...');
console.log('This may take a few minutes...\n');

try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('\n✅ Dependencies installed successfully!');
} catch (error) {
  console.error('\n❌ Error installing dependencies');
  console.error('Please run "npm install" manually');
  process.exit(1);
}

console.log('\n🎉 Rollback complete!');
console.log('\n📚 Next steps:');
console.log('1. Start Express server: npm start');
console.log('2. Visit http://localhost:3000');
console.log('\n✅ Back to Express version!\n');


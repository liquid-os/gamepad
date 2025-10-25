#!/usr/bin/env node
/**
 * Helper script to switch to Next.js version
 * Run: node switch-to-nextjs.js
 */

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🎮 Party Game Hub - Next.js Migration Helper\n');

// Check if package-next.json exists
if (!fs.existsSync('package-next.json')) {
  console.error('❌ Error: package-next.json not found!');
  console.log('Make sure you have the Next.js migration files in your directory.');
  process.exit(1);
}

// Backup current package.json
if (fs.existsSync('package.json')) {
  console.log('📦 Backing up current package.json...');
  fs.copyFileSync('package.json', 'package-express-backup.json');
  console.log('✅ Backed up to package-express-backup.json');
}

// Copy package-next.json to package.json
console.log('📦 Switching to Next.js package.json...');
fs.copyFileSync('package-next.json', 'package.json');
console.log('✅ Switched to Next.js version');

// Install dependencies
console.log('\n📥 Installing Next.js dependencies...');
console.log('This may take a few minutes...\n');

try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('\n✅ Dependencies installed successfully!');
} catch (error) {
  console.error('\n❌ Error installing dependencies');
  console.error('Please run "npm install" manually');
  process.exit(1);
}

console.log('\n🎉 Migration complete!');
console.log('\n📚 Next steps:');
console.log('1. Review your config.js or set up .env file');
console.log('2. Start development server: npm run dev');
console.log('3. Visit http://localhost:3000');
console.log('\n📖 Read QUICKSTART.md for detailed instructions');
console.log('📖 Read NEXTJS_MIGRATION.md for migration details');
console.log('📖 Read MIGRATION_SUMMARY.md for what changed\n');

console.log('🚀 Ready to start Next.js version!');


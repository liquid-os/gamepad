#!/usr/bin/env node

console.log('🚀 Stripe Integration Setup Helper\n');

console.log('To enable real Stripe payments, follow these steps:\n');

console.log('1. 📝 Get your Stripe test keys:');
console.log('   → Go to: https://dashboard.stripe.com/test/apikeys');
console.log('   → Sign up/login (free)');
console.log('   → Copy your keys:\n');
console.log('     • Publishable key (starts with pk_test_)');
console.log('     • Secret key (starts with sk_test_)\n');

console.log('2. 🔧 Update config.js:');
console.log('   → Open config.js in your editor');
console.log('   → Replace the placeholder keys with your real keys\n');

console.log('3. 🧪 Test with test cards:');
console.log('   → Success: 4242 4242 4242 4242');
console.log('   → Declined: 4000 0000 0000 0002');
console.log('   → Expiry: Any future date (e.g., 12/25)');
console.log('   → CVC: Any 3 digits (e.g., 123)\n');

console.log('4. 🎮 Test the integration:');
console.log('   → Restart server: node server.js');
console.log('   → Go to store and try buying a game');
console.log('   → You should see real Stripe checkout!\n');

console.log('✅ Test mode = No real money charged');
console.log('✅ Real Stripe checkout experience');
console.log('✅ Full payment processing\n');

console.log('Need help? Check STRIPE_SETUP_GUIDE.md for detailed instructions.');

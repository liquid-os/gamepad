const express = require('express');
const stripe = require('stripe')(require('../config').STRIPE_SECRET_KEY);
const User = require('../models/User');
const Game = require('../models/Game');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// Create Stripe checkout session
router.post('/create-checkout-session', requireAuth, async (req, res) => {
  try {
    const { gameId } = req.body;
    
    // Get game details
    const game = await Game.findOne({ id: gameId });
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }
    
    // Check if user already owns the game
    const user = await User.findById(req.session.userId);
    const alreadyOwned = user.ownedGames.some(owned => owned.gameId === gameId);
    const isFree = user.freeGames.some(free => free.gameId === gameId);
    
    if (alreadyOwned || isFree) {
      return res.status(400).json({
        success: false,
        message: 'You already own this game'
      });
    }
    
    // Check if Stripe is properly configured
    const config = require('../config');
    if (config.STRIPE_SECRET_KEY.includes('sk_test_your_stripe_secret_key') || config.STRIPE_SECRET_KEY.includes('...')) {
      return res.status(400).json({
        success: false,
        message: 'Stripe is not configured. Please get your test keys from https://dashboard.stripe.com/test/apikeys and update config.js'
      });
    }
    
    // Calculate price in cents (minimum $0.50 for Stripe)
    const priceInCents = Math.max(game.price, 50); // Minimum 50 cents
    
    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: game.name,
              description: game.description,
              images: game.images && game.images.length > 0 
                ? [game.images.find(img => img.isMain)?.url || game.images[0].url]
                : undefined
            },
            unit_amount: priceInCents, // Price in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.protocol}://${req.get('host')}/store.html?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.protocol}://${req.get('host')}/store.html?canceled=true`,
      metadata: {
        userId: req.session.userId,
        gameId: gameId
      }
    });
    
    res.json({
      success: true,
      url: session.url
    });
    
  } catch (error) {
    console.error('Stripe checkout error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create checkout session',
      error: error.message
    });
  }
});

// Handle successful payment (webhook)
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const config = require('../config');
  
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, config.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    try {
      const userId = session.metadata.userId;
      const gameId = session.metadata.gameId;
      
      // Add game to user's owned games
      await User.findByIdAndUpdate(userId, {
        $push: {
          ownedGames: {
            gameId: gameId,
            purchasedAt: new Date(),
            purchaseMethod: 'stripe'
          }
        }
      });
      
      console.log(`Game ${gameId} purchased by user ${userId} via Stripe`);
      
    } catch (error) {
      console.error('Error processing successful payment:', error);
    }
  }
  
  res.json({received: true});
});

// Get Stripe publishable key
router.get('/publishable-key', (req, res) => {
  const config = require('../config');
  res.json({
    publishableKey: config.STRIPE_PUBLISHABLE_KEY
  });
});

module.exports = router;

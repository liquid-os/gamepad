import { getSession } from '../../../lib/session';
const stripe = require('stripe')(require('../../../config').STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getSession(req, res);
    const userId = session.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { gameId } = req.body;

    const User = require('../../../models/User');
    const Game = require('../../../models/Game');
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const game = await Game.findOne({ gameId });
    if (!game) {
      return res.status(404).json({ success: false, message: 'Game not found' });
    }

    // Check if user already owns the game
    const alreadyOwned = user.ownedGames.some(owned => owned.gameId === gameId);
    if (alreadyOwned) {
      return res.status(400).json({ success: false, message: 'You already own this game' });
    }

    // Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: game.name,
              description: game.description,
              images: game.images && game.images.length > 0 ? [game.images[0].url] : [],
            },
            unit_amount: game.price, // Price in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.origin || 'http://localhost:3000'}/store?success=true`,
      cancel_url: `${req.headers.origin || 'http://localhost:3000'}/store?canceled=true`,
      metadata: {
        userId: userId.toString(),
        gameId: gameId,
      },
    });

    return res.status(200).json({
      success: true,
      url: checkoutSession.url
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}


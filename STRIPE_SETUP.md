# Stripe Payment Integration Setup

## Current Status: Ready for Real Stripe Integration 🚀

The application is now configured for **real Stripe integration**. To enable it:

- 🔧 **Get Stripe Test Keys** - Free from Stripe Dashboard
- 🔧 **Update config.js** - Add your test keys
- ✅ **Real Stripe Checkout** - Actual payment processing
- ✅ **Test Mode Safe** - No real money charged

## How Real Stripe Integration Works

When you click "Buy with Card", the system:
1. Creates a real Stripe checkout session
2. Redirects to Stripe's secure checkout page
3. User enters card details (test cards work)
4. Stripe processes payment (test mode)
5. Redirects back with success/failure
6. Game added to library automatically

## To Enable Real Stripe Payments (Production)

### 1. Get Stripe API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Create an account or log in
3. Go to **Developers** → **API Keys**
4. Copy your **Publishable Key** and **Secret Key**

### 2. Update Configuration

Edit `config.js` and replace the placeholder values:

```javascript
// Stripe Configuration
STRIPE_SECRET_KEY: 'sk_live_your_actual_secret_key_here',
STRIPE_PUBLISHABLE_KEY: 'pk_live_your_actual_publishable_key_here',
STRIPE_WEBHOOK_SECRET: 'whsec_your_webhook_secret_here'
```

### 3. Set Up Webhook (Optional)

For production, set up a webhook endpoint:
- **URL**: `https://yourdomain.com/api/stripe/webhook`
- **Events**: `checkout.session.completed`

### 4. Test Mode vs Live Mode

- **Test Keys** (sk_test_...): No real money charged, perfect for testing
- **Live Keys** (sk_live_...): Real money charged, for production

## Current Pricing

Games are priced in coins, with real money equivalents:
- **Tic Tac Toe**: Free (0 coins / $0.00)
- **Quick Trivia**: 50 coins / $0.50
- **Word Association**: 75 coins / $0.75
- **Digital Pictionary**: 100 coins / $1.00
- **Scattergories**: 125 coins / $1.25

## Development Mode Benefits

- ✅ **No setup required** - Works immediately
- ✅ **Safe testing** - No accidental charges
- ✅ **Full functionality** - Test all features
- ✅ **Easy debugging** - Clear success/failure messages

## Troubleshooting

If you see "Failed to create checkout session":
1. Check browser console for error details
2. Verify server is running
3. Check network connection
4. Try refreshing the page

The development mode should work perfectly for testing all payment functionality! 🎉

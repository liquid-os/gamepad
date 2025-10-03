# 🚀 Real Stripe Integration Setup

## Quick Setup (5 minutes)

### 1. Get Stripe Test Keys

1. **Go to Stripe Dashboard**: https://dashboard.stripe.com/test/apikeys
2. **Sign up/Login** (free account)
3. **Copy your keys**:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`)

### 2. Update Your Config

Edit `config.js` and replace the placeholder keys:

```javascript
// Replace these with your actual Stripe test keys
STRIPE_SECRET_KEY: 'sk_test_51Oj8Xr2K4vQ8w5Xx...', // Your actual secret key
STRIPE_PUBLISHABLE_KEY: 'pk_test_51Oj8Xr2K4vQ8w5Xx...', // Your actual publishable key
```

### 3. Test the Integration

1. **Restart your server**: `node server.js`
2. **Go to store**: Click store button on homepage
3. **Buy a game**: Click "Buy with Card" on any paid game
4. **Stripe Checkout**: You'll be redirected to real Stripe checkout
5. **Test Payment**: Use test card `4242 4242 4242 4242`

## Test Cards (No Real Money)

Use these test cards in Stripe checkout:

- **Success**: `4242 4242 4242 4242`
- **Declined**: `4000 0000 0000 0002`
- **Requires Authentication**: `4000 0025 0000 3155`

**Expiry**: Any future date (e.g., `12/25`)
**CVC**: Any 3 digits (e.g., `123`)

## What Happens Now

1. **User clicks "Buy with Card"**
2. **Redirects to Stripe Checkout** (real Stripe page)
3. **User enters card details**
4. **Stripe processes payment** (test mode - no real money)
5. **Success redirect** back to store
6. **Game added to library**

## Production Setup (Later)

When ready for real money:

1. **Complete Stripe account verification**
2. **Switch to live keys** (`sk_live_...` and `pk_live_...`)
3. **Set up webhook endpoint**
4. **Test with small amounts first**

## Troubleshooting

**"Stripe is not configured" error:**
- Make sure you copied the keys correctly
- Restart the server after updating config
- Check for typos in the keys

**Checkout not loading:**
- Verify your keys are valid
- Check browser console for errors
- Ensure server is running

## Security Notes

- ✅ **Test keys are safe** - No real money charged
- ✅ **Keys are in config** - Not exposed to frontend
- ✅ **Webhook verification** - Secure payment confirmation
- ✅ **Session validation** - Only authenticated users can buy

Your Stripe integration will now work with real Stripe checkout! 🎉

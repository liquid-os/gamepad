import { getSession } from '../../../../lib/session';

export default async function handler(req, res) {
  // This endpoint is deprecated - use Stripe checkout instead
  return res.status(410).json({ 
    success: false, 
    message: 'Coin purchases are no longer supported. Please use Stripe checkout.' 
  });
}


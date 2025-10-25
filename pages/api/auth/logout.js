import { getSession } from '../../../lib/session';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getSession(req, res);
    await session.destroy();

    return res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Error in /api/auth/logout:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}


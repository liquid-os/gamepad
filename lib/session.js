// Session management for Next.js API routes
import { withIronSessionApiRoute, withIronSessionSsr } from 'iron-session/next';
import { getSession as getIronSession } from 'iron-session';
const config = require('../config');

const sessionOptions = {
  password: config.SESSION_SECRET,
  cookieName: 'gamepad_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
};

export function withSessionRoute(handler) {
  return withIronSessionApiRoute(handler, sessionOptions);
}

export function withSessionSsr(handler) {
  return withIronSessionSsr(handler, sessionOptions);
}

export async function getSession(req, res) {
  return getIronSession(req, res, sessionOptions);
}


# Next.js Migration Guide

This document explains the migration from the original Express-based frontend to Next.js.

## 🚀 What Changed

### Architecture
- **Before**: Express server serving static HTML files
- **After**: Next.js with React components and API routes
- **Socket.IO**: Integrated with custom Next.js server

### File Structure

```
Old Structure:                    New Structure:
public/                          pages/
  ├── index.html         →         ├── index.js (React)
  ├── host.html          →         ├── host.js (React)
  ├── controller.html    →         ├── controller.js (React)
  ├── store.html         →         ├── store.js (React)
  └── creator.html       →         └── creator.js (React)
                                   └── api/ (API routes)
routes/                           pages/api/
  ├── auth.js            →         ├── auth/
  ├── games.js           →         ├── games/
  └── stripe.js          →         └── stripe/

server.js              →         server-next.js (custom server)
                                 components/ (React components)
                                 lib/ (utilities)
                                 styles/ (CSS)
```

## 📦 New Dependencies

- `next` - Next.js framework
- `react` - React library
- `react-dom` - React DOM
- `iron-session` - Session management for Next.js
- `socket.io-client` - Socket.IO client
- `swr` - React Hooks for data fetching (optional)

## 🔧 Setup Instructions

### 1. Install Dependencies

```bash
# Remove old package.json
mv package.json package-old.json

# Rename new package.json
mv package-next.json package.json

# Install dependencies
npm install
```

### 2. Environment Configuration

Copy your existing `config.js` settings or use environment variables:

```bash
cp .env.example .env
# Edit .env with your actual values
```

### 3. Database Connection

The MongoDB connection remains the same. Ensure your `config.js` or environment variables are properly set.

### 4. Start the Server

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## 🎯 Key Features

### React Components
All pages are now React components with:
- State management using hooks (`useState`, `useEffect`)
- Client-side routing with Next.js Router
- Server-side rendering (SSR) support
- Better code organization and reusability

### API Routes
Express routes are now Next.js API routes:
- `/api/auth/*` - Authentication endpoints
- `/api/games/*` - Game-related endpoints
- `/api/stripe/*` - Payment processing

### Session Management
- Migrated from `express-session` to `iron-session`
- Maintains the same session functionality
- Secure cookie-based sessions

### Socket.IO Integration
- Custom Next.js server (`server-next.js`)
- Same real-time functionality
- WebSocket connections preserved

## 🔄 Migration Benefits

1. **Better Performance**: 
   - Server-side rendering
   - Automatic code splitting
   - Optimized bundle sizes

2. **Developer Experience**:
   - Hot module replacement
   - Better error messages
   - TypeScript support

3. **Modern React**:
   - Hooks instead of jQuery
   - Component-based architecture
   - Better state management

4. **SEO Friendly**:
   - Server-side rendering
   - Dynamic meta tags
   - Better crawlability

## 🧪 Testing

### Test Authentication
1. Register a new user
2. Login with existing user
3. Logout functionality

### Test Lobby System
1. Create a lobby as host
2. Join lobby as player
3. Select and play a game

### Test Store
1. Browse games
2. Purchase with coins
3. Purchase with Stripe

## 🔍 Troubleshooting

### Port Already in Use
```bash
# Kill the process using port 3000
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill
```

### MongoDB Connection Issues
- Check your `MONGODB_URI` in config.js or .env
- Ensure your IP is whitelisted in MongoDB Atlas
- Verify network connectivity

### Socket.IO Connection Errors
- Ensure the custom server is running
- Check browser console for connection errors
- Verify Socket.IO client version matches server

## 📝 Development Workflow

### Adding New Pages
1. Create a file in `pages/` directory
2. Export a React component
3. Use Next.js Router for navigation

Example:
```javascript
// pages/newpage.js
import Layout from '../components/Layout';

export default function NewPage() {
  return (
    <Layout title="New Page">
      <div>Your content here</div>
    </Layout>
  );
}
```

### Adding New API Routes
1. Create a file in `pages/api/` directory
2. Export an async handler function

Example:
```javascript
// pages/api/example.js
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  return res.status(200).json({ message: 'Hello World' });
}
```

## 🚨 Important Notes

1. **Game Files**: Game client files are still served from the `games/` directory
2. **Static Assets**: Use Next.js `public/` folder for static assets
3. **Session Secret**: Generate a strong random string for production
4. **Environment Variables**: Never commit `.env` to version control

## 🤝 Backward Compatibility

The original Express server (`server.js`) is preserved for reference. Both servers cannot run simultaneously on the same port.

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Iron Session](https://github.com/vvo/iron-session)
- [Socket.IO with Next.js](https://socket.io/how-to/use-with-nextjs)

---

**Migration Complete! 🎉**

Your application is now running on modern Next.js with React!


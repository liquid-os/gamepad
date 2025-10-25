# 🎮 Party Game Hub - Next.js Edition

A modern multiplayer party game platform built with **Next.js**, **React**, and **Socket.IO**. Host games on your TV and let players join from their phones!

## ✨ Features

- 🔐 **User Authentication**: Secure JWT-based authentication
- 🎯 **Real-time Multiplayer**: Socket.IO powered lobbies
- 🎮 **Multiple Games**: TicTacToe, Trivia, Word Games, and more
- 🛒 **Game Store**: Purchase games with coins or credit card (Stripe)
- 📱 **Cross-Device Play**: Host on TV, play on mobile
- ⚡ **Server-Side Rendering**: Fast initial page loads with Next.js
- 🎨 **Modern UI**: React components with responsive design

## 🚀 Quick Start

### Prerequisites

- Node.js 16+
- MongoDB (Atlas or local)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <your-repo>
cd GAMEPAD

# Switch to Next.js version
mv package.json package-old.json
mv package-next.json package.json

# Install dependencies
npm install

# Configure database (edit config.js)
# MONGODB_URI: 'your-mongodb-connection-string'
# SESSION_SECRET: 'your-secret-key'

# Start development server
npm run dev
```

Visit `http://localhost:3000` 🎉

## 📖 How It Works

### For Players

1. **Register/Login** at `http://localhost:3000`
2. **Host a Game**:
   - Click "Host Game (TV Screen)"
   - Display the 4-letter code on your TV
3. **Join as Player**:
   - Enter the lobby code on your phone
   - Select a game
   - Start playing!

### For Developers

```javascript
// pages/yourpage.js - Create a new page
import Layout from '../components/Layout';

export default function YourPage() {
  return (
    <Layout title="Your Page">
      <div>Your content here</div>
    </Layout>
  );
}

// pages/api/yourapi.js - Create an API endpoint
export default async function handler(req, res) {
  return res.json({ message: 'Hello API' });
}
```

## 📁 Project Structure

```
GAMEPAD/
├── pages/                   # Next.js pages
│   ├── index.js            # Home/Login
│   ├── host.js             # TV Host screen
│   ├── play.js             # Player screen
│   ├── store.js            # Game store
│   ├── creator.js          # Creator dashboard
│   ├── controller.js       # Game controller
│   └── api/                # API routes
│       ├── auth/           # Authentication
│       ├── games/          # Game endpoints
│       └── stripe/         # Payments
├── components/             # React components
├── lib/                    # Utilities
├── styles/                 # CSS
├── games/                  # Game modules
│   ├── tictactoe/
│   ├── trivia/
│   ├── wordgame/
│   └── cambio/
├── models/                 # MongoDB models
├── server-next.js          # Custom Next.js server
└── next.config.js          # Next.js config
```

## 🎮 Available Games

| Game | Description | Players | Status |
|------|-------------|---------|--------|
| **TicTacToe** | Classic 3x3 grid game | 2 | ✅ Active |
| **Trivia** | Quick trivia questions | 2-8 | ✅ Active |
| **Word Game** | Word association challenge | 2-6 | ✅ Active |
| **Cambio** | Card memory game | 2-6 | 🆕 New |

## 🛠️ Development

### Available Scripts

```bash
# Development mode with hot reload
npm run dev

# Production build
npm run build

# Start production server
npm start

# Populate games database
npm run populate-games

# Grant free games to all users
npm run grant-free-games
```

### Adding a New Game

1. Create game folder: `games/yourgame/`
2. Add server logic: `games/yourgame/server.js`
3. Add client files: `games/yourgame/client/`
4. Register in database

Example `server.js`:
```javascript
module.exports = {
  meta: {
    id: 'yourgame',
    name: 'Your Game',
    minPlayers: 2,
    maxPlayers: 8,
    description: 'Fun party game'
  },
  onInit(lobby, api) { /* Initialize */ },
  onPlayerJoin(lobby, api, player) { /* Player joins */ },
  onAction(lobby, api, player, data) { /* Handle actions */ },
  onEnd(lobby, api) { /* Cleanup */ }
};
```

## 🔐 Environment Variables

Create a `.env` file (or use `config.js`):

```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/gamepad
SESSION_SECRET=your-super-secret-key
PORT=3000
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NODE_ENV=development
```

## 🎯 API Endpoints

### Authentication
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Games
- `GET /api/games/store` - Browse game store
- `POST /api/games/purchase/:gameId` - Purchase game

### Payments
- `POST /api/stripe/create-checkout-session` - Create Stripe session

## 🌐 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

### Traditional Hosting

```bash
# Build for production
npm run build

# Start production server
NODE_ENV=production npm start
```

## 🧪 Testing Checklist

- [ ] User registration works
- [ ] User login works
- [ ] Create lobby as host
- [ ] Join lobby as player
- [ ] Select and play games
- [ ] Purchase with coins
- [ ] Purchase with Stripe
- [ ] Reconnection works
- [ ] Mobile responsive

## 🔧 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill
```

### MongoDB Connection Failed
- Check `MONGODB_URI` is correct
- Whitelist your IP in MongoDB Atlas
- Verify network connectivity

### Socket.IO Not Connecting
- Ensure custom server is running
- Check firewall settings
- Verify Socket.IO versions match

## 📚 Documentation

- [NEXTJS_MIGRATION.md](./NEXTJS_MIGRATION.md) - Migration details
- [QUICKSTART.md](./QUICKSTART.md) - Quick start guide
- [MIGRATION_SUMMARY.md](./MIGRATION_SUMMARY.md) - What changed
- [Next.js Docs](https://nextjs.org/docs)
- [React Docs](https://react.dev)
- [Socket.IO Docs](https://socket.io/docs/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - feel free to use for your own projects!

## 🎉 What's New in Next.js Version

### ✅ Improvements
- ⚡ **Faster**: Server-side rendering & code splitting
- 🎨 **Modern**: React hooks & component architecture
- 📱 **Better UX**: Client-side routing & smooth transitions
- 🛠️ **DX**: Hot reload, better errors, TypeScript ready
- 🚀 **Scalable**: Optimized builds & performance

### 🔄 Migrated Features
- ✅ All authentication flows
- ✅ Lobby system with Socket.IO
- ✅ All game modules
- ✅ Game store & payments
- ✅ User dashboard
- ✅ Creator dashboard

## 🌟 Tech Stack

- **Frontend**: Next.js 14, React 18
- **Backend**: Node.js, Express (custom server)
- **Database**: MongoDB with Mongoose
- **Real-time**: Socket.IO
- **Authentication**: Iron Session
- **Payments**: Stripe
- **Styling**: CSS Modules + Global CSS

## 📞 Support

Need help? Check:
1. Documentation files above
2. GitHub issues
3. Next.js documentation
4. Browser console for errors

---

## 🎮 Happy Gaming!

Built with ❤️ using Next.js, React, and Socket.IO

**Original version**: Express + Static HTML  
**Current version**: Next.js + React  
**Migration date**: October 2025

---

*For the original Express version, see the `server.js` file and `package-old.json`*


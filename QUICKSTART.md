# 🚀 Quick Start Guide - Next.js Version

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (Atlas or local)
- npm or yarn

## Installation Steps

### 1. Install Dependencies

```bash
# Remove old package.json and use Next.js version
mv package.json package-old.json
mv package-next.json package.json

# Install all dependencies
npm install
```

### 2. Configure Database

Update `config.js` with your MongoDB connection string:

```javascript
MONGODB_URI: 'mongodb+srv://username:password@cluster.mongodb.net/gamepad'
```

Or use environment variables (recommended):

```bash
export MONGODB_URI="your-mongodb-connection-string"
export SESSION_SECRET="your-random-secret-key"
```

### 3. Start the Server

**Development Mode:**
```bash
npm run dev
```

**Production Mode:**
```bash
npm run build
npm start
```

The application will be available at `http://localhost:3000`

## First Time Setup

### 1. Register an Account
- Navigate to `http://localhost:3000`
- Click "Register here"
- Create your account (you'll start with 100 coins)

### 2. Populate Games Database (Optional)
```bash
npm run populate-games
```

### 3. Grant Free Games (Optional)
```bash
npm run grant-free-games
```

## Usage

### Host a Game (TV Screen)
1. Click "Host Game (TV Screen)"
2. Share the 4-letter lobby code with players
3. Wait for players to join
4. Players will select a game from their device

### Join as Player (Mobile/PC)
1. Click "Join as Player"
2. Enter the lobby code
3. Select a game from the list
4. Play!

### Browse Game Store
1. Click "Game Store"
2. Browse available games
3. Purchase with coins or credit card

## Project Structure

```
gamepad-nextjs/
├── pages/                  # Next.js pages
│   ├── index.js           # Home/Auth page
│   ├── host.js            # Host screen
│   ├── play.js            # Player screen
│   ├── store.js           # Game store
│   ├── creator.js         # Creator dashboard
│   ├── controller.js      # Game controller
│   └── api/               # API routes
│       ├── auth/          # Authentication endpoints
│       ├── games/         # Game endpoints
│       └── stripe/        # Payment endpoints
├── components/            # React components
│   └── Layout.js          # Shared layout
├── lib/                   # Utilities
│   ├── socket.js          # Socket.IO client
│   └── session.js         # Session management
├── styles/                # CSS styles
│   └── globals.css        # Global styles
├── games/                 # Game modules
│   ├── tictactoe/
│   ├── trivia/
│   └── wordgame/
├── models/                # MongoDB models
│   ├── User.js
│   └── Game.js
├── server-next.js         # Custom Next.js server
├── next.config.js         # Next.js configuration
└── package.json           # Dependencies

```

## Features

✅ User Authentication
✅ Real-time Multiplayer Lobbies
✅ Socket.IO Integration
✅ Game Store with Payments
✅ Multiple Party Games
✅ Mobile-Responsive Design
✅ Server-Side Rendering
✅ Modern React with Hooks

## Troubleshooting

### Port 3000 Already in Use
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

### MongoDB Connection Failed
- Verify your connection string
- Check if your IP is whitelisted in MongoDB Atlas
- Ensure MongoDB service is running (if local)

### Session Issues
- Clear browser cookies
- Generate a new SESSION_SECRET
- Restart the server

## Need Help?

Check out:
- [NEXTJS_MIGRATION.md](./NEXTJS_MIGRATION.md) - Detailed migration guide
- [README.md](./README.md) - Original project documentation
- [Next.js Docs](https://nextjs.org/docs)

---

**Happy Gaming! 🎮**


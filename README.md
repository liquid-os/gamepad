# 🎮 Party Game Hub

A central marketplace hub for socket-based couch co-op party games with user authentication and MongoDB integration.

## ✨ Features

- **User Authentication**: Secure registration/login with password encryption
- **MongoDB Integration**: Cloud database for user data storage
- **Lobby System**: Create and join game lobbies with unique codes
- **Modular Games**: Easy-to-add party games (Tic Tac Toe, Trivia, Word Association)
- **Real-time Multiplayer**: Socket.IO for live game communication
- **Session Management**: Persistent user sessions

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up MongoDB

#### Option A: MongoDB Atlas (Cloud)
1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster
3. Get your connection string
4. Set environment variable:
```bash
export MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/gamepad?retryWrites=true&w=majority"
```

#### Option B: Local MongoDB
1. Install MongoDB locally
2. Start MongoDB service
3. The app will use `mongodb://localhost:27017/gamepad` by default

### 3. Set Session Secret
```bash
export SESSION_SECRET="your-super-secret-session-key"
```

### 4. Start the Server
```bash
npm start
```

### 5. Open the App
Navigate to `http://localhost:3000`

## 🎯 How to Use

### For Players:
1. **Register/Login**: Create an account or login with existing credentials
2. **Create Lobby**: Click "Create New Lobby" to start a game session
3. **Share Code**: Share the 4-letter lobby code with friends
4. **Join Lobby**: Enter the lobby code to join an existing game
5. **Select Game**: Choose from available party games
6. **Play**: Enjoy real-time multiplayer games!

### For Developers:
1. **Add New Games**: Create a new folder in `/games/` with the required structure
2. **Game Structure**: Each game needs `server.js` and `client/` folder
3. **API Integration**: Games receive lobby state and player actions via the API

## 🏗️ Project Structure

```
├── config/
│   └── database.js          # MongoDB connection
├── middleware/
│   └── auth.js              # Authentication middleware
├── models/
│   └── User.js              # User schema with password encryption
├── routes/
│   └── auth.js              # Authentication routes
├── games/
│   ├── tictactoe/           # Tic Tac Toe game
│   ├── trivia/              # Trivia game
│   └── wordgame/            # Word Association game
├── public/
│   └── index.html           # Main application interface
└── server.js                # Main server file
```

## 🔐 Authentication System

### User Model Features:
- **Secure Passwords**: bcrypt encryption with salt rounds
- **Unique Constraints**: Username and email must be unique
- **Validation**: Email format and password length validation
- **User Stats**: Games played and total score tracking
- **Session Management**: Persistent login sessions

### API Endpoints:
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user info
- `PUT /api/auth/profile` - Update user profile

## 🎮 Game Development

### Creating a New Game:

1. **Create Game Folder**: `games/yourgame/`
2. **Server File**: `games/yourgame/server.js`
```javascript
module.exports = {
  meta: {
    id: 'yourgame',
    name: 'Your Game',
    minPlayers: 2,
    maxPlayers: 8,
    description: 'Game description'
  },
  onInit(lobby, api) { /* Initialize game */ },
  onPlayerJoin(lobby, api, player) { /* Handle player join */ },
  onAction(lobby, api, player, data) { /* Handle player actions */ },
  onEnd(lobby, api) { /* Cleanup when game ends */ }
};
```

3. **Client Files**: `games/yourgame/client/`
   - `index.html` - Game interface
   - `style.css` - Game styling
   - `player.js` - Client-side game logic

## 🛠️ Environment Variables

Create a `.env` file or set environment variables:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/gamepad
SESSION_SECRET=your-super-secret-session-key
PORT=3000
```

## 📦 Dependencies

- **express**: Web framework
- **socket.io**: Real-time communication
- **mongoose**: MongoDB object modeling
- **bcryptjs**: Password hashing
- **express-session**: Session management
- **connect-mongo**: MongoDB session store

## 🚀 Deployment

### Heroku:
1. Set environment variables in Heroku dashboard
2. Deploy with Git
3. MongoDB Atlas works great with Heroku

### Vercel/Netlify:
1. Use MongoDB Atlas for database
2. Deploy serverless functions for API routes
3. Static files for frontend

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add your game or improvements
4. Submit a pull request

## 📄 License

MIT License - feel free to use this project for your own party game platform!

---

**Happy Gaming! 🎉**

# 🎯 Online Bingo Game

A real-time multiplayer Bingo game built with React, Node.js, Socket.IO, and MongoDB. Features include user authentication, real-time gameplay, leaderboards, and a beautiful responsive UI.

## ✨ Features

### 🎮 Game Features
- **Real-time multiplayer gameplay** with Socket.IO
- **5x5 Bingo boards** with random number generation
- **Turn-based gameplay** with automatic win detection
- **Multiple win conditions**: rows, columns, and diagonals
- **Game invitations** with accept/decline functionality
- **One active game per user pair** to prevent conflicts

### 👥 User Management
- **User registration and authentication** with JWT
- **Email and password login** system
- **User profiles** with statistics and achievements
- **Player search and invitation** system

### 📊 Statistics & Leaderboards
- **Weekly, monthly, and overall leaderboards**
- **User statistics** tracking wins, games, and win rates
- **Achievement system** with different player levels
- **Real-time score updates**

### 🎨 User Experience
- **Responsive design** for mobile, tablet, and desktop
- **Modern UI** with Tailwind CSS
- **Real-time notifications** for game events
- **Interactive game boards** with visual feedback
- **Game chat** for player communication

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mern
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/bingo-game
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   CLIENT_URL=http://localhost:3000
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system or use a cloud instance.

5. **Run the application**
   ```bash
   # Start both frontend and backend
   npm run dev
   
   # Or start them separately:
   # Backend only
   npm run server
   
   # Frontend only
   npm start
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## 📁 Project Structure

```
mern/
├── server/                 # Backend server
│   ├── index.js           # Main server file
│   ├── middleware/        # Authentication middleware
│   ├── models/           # MongoDB models
│   ├── routes/           # API routes
│   └── socket/           # Socket.IO handlers
├── src/                  # Frontend React app
│   ├── components/       # React components
│   │   ├── auth/        # Authentication components
│   │   ├── game/        # Game-related components
│   │   └── layout/      # Layout components
│   ├── contexts/        # React contexts
│   └── App.js           # Main app component
├── package.json
└── README.md
```

## 🎯 How to Play

1. **Register/Login**: Create an account or sign in
2. **Find Players**: Browse available players on the dashboard
3. **Send Invitation**: Click "Challenge" to invite a player
4. **Accept Invitation**: The invited player receives a notification
5. **Play Game**: Take turns calling numbers on your Bingo board
6. **Win**: Complete 5 in a row (horizontally, vertically, or diagonally)

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `GET /api/auth/users` - Get all users

### Games
- `POST /api/games/create` - Create a new game
- `GET /api/games/my-games` - Get user's games
- `GET /api/games/:gameId` - Get specific game
- `POST /api/games/:gameId/accept` - Accept game invitation
- `POST /api/games/:gameId/decline` - Decline game invitation

### Scores
- `GET /api/scores/weekly` - Weekly leaderboard
- `GET /api/scores/monthly` - Monthly leaderboard
- `GET /api/scores/overall` - Overall leaderboard
- `GET /api/scores/user/:userId` - User statistics

## 🔌 Socket.IO Events

### Client to Server
- `join-game` - Join a game room
- `call-number` - Call a number during gameplay
- `send-invitation` - Send game invitation
- `invitation-response` - Respond to invitation

### Server to Client
- `game-joined` - Confirmation of joining game
- `number-called` - Number called by opponent
- `game-started` - Game has started
- `game-ended` - Game has ended with winner
- `game-invitation` - New game invitation
- `player-joined-game` - Opponent joined the game

## 🎨 Technologies Used

### Frontend
- **React 19** - UI framework
- **React Router** - Client-side routing
- **Socket.IO Client** - Real-time communication
- **Tailwind CSS** - Styling framework
- **Lucide React** - Icon library
- **React Hot Toast** - Notifications
- **Axios** - HTTP client

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Socket.IO** - Real-time communication
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **bcryptjs** - Password hashing

## 🚀 Deployment

### Backend Deployment
1. Set up environment variables on your hosting platform
2. Deploy to platforms like Heroku, Railway, or DigitalOcean
3. Ensure MongoDB connection is configured

### Frontend Deployment
1. Build the React app: `npm run build`
2. Deploy to platforms like Vercel, Netlify, or GitHub Pages
3. Update API endpoints to point to your backend

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check connection string in `.env`
   - Verify network access if using cloud MongoDB

2. **Socket.IO Connection Issues**
   - Check CORS configuration
   - Verify server URL in frontend
   - Ensure authentication token is valid

3. **Build Errors**
   - Clear node_modules and reinstall: `rm -rf node_modules && npm install`
   - Check Node.js version compatibility
   - Verify all dependencies are installed

## 📞 Support

For support or questions, please open an issue on GitHub or contact the development team.

---

**Happy Bingo Gaming! 🎯🎉**

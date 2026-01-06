const express = require('express');
const Game = require('../models/Game');
const User = require('../models/User');

const router = express.Router();

// Generate a random Bingo board
const generateBingoBoard = () => {
  const board = [];
  const numbers = Array.from({ length: 75 }, (_, i) => i + 1);
  
  for (let i = 0; i < 5; i++) {
    const row = [];
    for (let j = 0; j < 5; j++) {
      const randomIndex = Math.floor(Math.random() * numbers.length);
      row.push(numbers.splice(randomIndex, 1)[0]);
    }
    board.push(row);
  }
  
  return board;
};

// Check for Bingo win
const checkBingoWin = (board, calledNumbers) => {
  // Check rows
  for (let i = 0; i < 5; i++) {
    if (board[i].every(num => calledNumbers.includes(num))) {
      return true;
    }
  }
  
  // Check columns
  for (let j = 0; j < 5; j++) {
    if (board.every(row => calledNumbers.includes(row[j]))) {
      return true;
    }
  }
  
  // Check diagonals
  if (board[0][0] && board[1][1] && board[2][2] && board[3][3] && board[4][4] &&
      calledNumbers.includes(board[0][0]) && calledNumbers.includes(board[1][1]) &&
      calledNumbers.includes(board[2][2]) && calledNumbers.includes(board[3][3]) &&
      calledNumbers.includes(board[4][4])) {
    return true;
  }
  
  if (board[0][4] && board[1][3] && board[2][2] && board[3][1] && board[4][0] &&
      calledNumbers.includes(board[0][4]) && calledNumbers.includes(board[1][3]) &&
      calledNumbers.includes(board[2][2]) && calledNumbers.includes(board[3][1]) &&
      calledNumbers.includes(board[4][0])) {
    return true;
  }
  
  return false;
};

// Create a new game
router.post('/create', async (req, res) => {
  try {
    const { opponentId } = req.body;
    const creatorId = req.user.userId;

    // Check if opponent exists
    const opponent = await User.findById(opponentId);
    if (!opponent) {
      return res.status(404).json({ message: 'Opponent not found' });
    }

    // Check if there's already an active game between these users
    const existingGame = await Game.findOne({
      $or: [
        { creator: creatorId, opponent: opponentId, status: { $in: ['pending', 'active'] } },
        { creator: opponentId, opponent: creatorId, status: { $in: ['pending', 'active'] } }
      ]
    });

    if (existingGame) {
      return res.status(400).json({ message: 'There is already an active game with this user' });
    }

    // Create new game
    const game = new Game({
      creator: creatorId,
      opponent: opponentId,
      gameData: {
        creatorBoard: generateBingoBoard(),
        opponentBoard: generateBingoBoard(),
        calledNumbers: [],
        currentTurn: 'creator'
      }
    });

    await game.save();

    // Populate user details
    await game.populate('creator', 'username avatar');
    await game.populate('opponent', 'username avatar');

    res.status(201).json({
      message: 'Game created successfully',
      game
    });
  } catch (error) {
    console.error('Create game error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's games
router.get('/my-games', async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const games = await Game.find({
      $or: [{ creator: userId }, { opponent: userId }]
    })
    .populate('creator', 'username avatar')
    .populate('opponent', 'username avatar')
    .populate('winner', 'username')
    .sort({ createdAt: -1 });

    res.json(games);
  } catch (error) {
    console.error('Get games error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get specific game
router.get('/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const userId = req.user.userId;

    const game = await Game.findById(gameId)
      .populate('creator', 'username avatar')
      .populate('opponent', 'username avatar')
      .populate('winner', 'username');

    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    // Check if user is part of this game
    if (game.creator._id.toString() !== userId && game.opponent._id.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(game);
  } catch (error) {
    console.error('Get game error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Accept game invitation
router.post('/:gameId/accept', async (req, res) => {
  try {
    const { gameId } = req.params;
    const userId = req.user.userId;

    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    if (game.opponent.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (game.status !== 'pending') {
      return res.status(400).json({ message: 'Game is not pending' });
    }

    game.status = 'active';
    game.startedAt = new Date();
    await game.save();

    await game.populate('creator', 'username avatar');
    await game.populate('opponent', 'username avatar');

    res.json({
      message: 'Game accepted',
      game
    });
  } catch (error) {
    console.error('Accept game error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Decline game invitation
router.post('/:gameId/decline', async (req, res) => {
  try {
    const { gameId } = req.params;
    const userId = req.user.userId;

    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    if (game.opponent.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    game.status = 'cancelled';
    await game.save();

    res.json({ message: 'Game declined' });
  } catch (error) {
    console.error('Decline game error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

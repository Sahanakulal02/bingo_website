const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  opponent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'cancelled'],
    default: 'pending'
  },
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  gameData: {
    creatorBoard: {
      type: [[Number]],
      default: []
    },
    opponentBoard: {
      type: [[Number]],
      default: []
    },
    calledNumbers: {
      type: [Number],
      default: []
    },
    currentTurn: {
      type: String,
      enum: ['creator', 'opponent'],
      default: 'creator'
    }
  },
  creatorScore: {
    type: Number,
    default: 0
  },
  opponentScore: {
    type: Number,
    default: 0
  },
  startedAt: Date,
  completedAt: Date,
  duration: Number // in minutes
}, {
  timestamps: true
});

// Index to ensure only one active game per user pair
gameSchema.index({ creator: 1, opponent: 1, status: 1 }, { unique: true });

module.exports = mongoose.model('Game', gameSchema);

const mongoose = require('mongoose');

const scoreSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  wins: {
    type: Number,
    default: 0
  },
  totalGames: {
    type: Number,
    default: 0
  },
  winRate: {
    type: Number,
    default: 0
  },
  period: {
    type: String,
    enum: ['weekly', 'monthly', 'overall'],
    required: true
  },
  periodStart: {
    type: Date,
    required: true
  },
  periodEnd: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

// Index for efficient leaderboard queries
scoreSchema.index({ period: 1, wins: -1, winRate: -1 });
scoreSchema.index({ user: 1, period: 1, periodStart: 1 });

module.exports = mongoose.model('Score', scoreSchema);

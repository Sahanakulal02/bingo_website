const express = require('express');
const Score = require('../models/Score');
const User = require('../models/User');

const router = express.Router();

// Get weekly leaderboard
router.get('/weekly', async (req, res) => {
  try {
    const now = new Date();
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000);

    const leaderboard = await Score.find({
      period: 'weekly',
      periodStart: { $gte: startOfWeek },
      periodEnd: { $lte: endOfWeek }
    })
    .populate('user', 'username avatar')
    .sort({ wins: -1, winRate: -1 })
    .limit(10);

    res.json(leaderboard);
  } catch (error) {
    console.error('Get weekly leaderboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get monthly leaderboard
router.get('/monthly', async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const leaderboard = await Score.find({
      period: 'monthly',
      periodStart: { $gte: startOfMonth },
      periodEnd: { $lte: endOfMonth }
    })
    .populate('user', 'username avatar')
    .sort({ wins: -1, winRate: -1 })
    .limit(10);

    res.json(leaderboard);
  } catch (error) {
    console.error('Get monthly leaderboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get overall leaderboard
router.get('/overall', async (req, res) => {
  try {
    const leaderboard = await Score.find({
      period: 'overall'
    })
    .populate('user', 'username avatar')
    .sort({ wins: -1, winRate: -1 })
    .limit(10);

    res.json(leaderboard);
  } catch (error) {
    console.error('Get overall leaderboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user statistics
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('username avatar totalWins totalGames');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const weeklyStats = await Score.findOne({
      user: userId,
      period: 'weekly'
    }).sort({ periodStart: -1 });

    const monthlyStats = await Score.findOne({
      user: userId,
      period: 'monthly'
    }).sort({ periodStart: -1 });

    const overallStats = await Score.findOne({
      user: userId,
      period: 'overall'
    });

    res.json({
      user,
      weeklyStats,
      monthlyStats,
      overallStats
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user score (called when game ends)
router.post('/update', async (req, res) => {
  try {
    const { userId, isWinner } = req.body;

    // Update user's total stats
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.totalGames += 1;
    if (isWinner) {
      user.totalWins += 1;
      user.weeklyWins += 1;
      user.monthlyWins += 1;
    }
    await user.save();

    // Update or create score records
    const now = new Date();
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Update weekly score
    let weeklyScore = await Score.findOne({
      user: userId,
      period: 'weekly',
      periodStart: startOfWeek
    });

    if (!weeklyScore) {
      weeklyScore = new Score({
        user: userId,
        period: 'weekly',
        periodStart: startOfWeek,
        periodEnd: endOfWeek
      });
    }

    weeklyScore.totalGames += 1;
    if (isWinner) weeklyScore.wins += 1;
    weeklyScore.winRate = (weeklyScore.wins / weeklyScore.totalGames) * 100;
    await weeklyScore.save();

    // Update monthly score
    let monthlyScore = await Score.findOne({
      user: userId,
      period: 'monthly',
      periodStart: startOfMonth
    });

    if (!monthlyScore) {
      monthlyScore = new Score({
        user: userId,
        period: 'monthly',
        periodStart: startOfMonth,
        periodEnd: endOfMonth
      });
    }

    monthlyScore.totalGames += 1;
    if (isWinner) monthlyScore.wins += 1;
    monthlyScore.winRate = (monthlyScore.wins / monthlyScore.totalGames) * 100;
    await monthlyScore.save();

    // Update overall score
    let overallScore = await Score.findOne({
      user: userId,
      period: 'overall'
    });

    if (!overallScore) {
      overallScore = new Score({
        user: userId,
        period: 'overall',
        periodStart: new Date(0),
        periodEnd: new Date(8640000000000000) // Far future date
      });
    }

    overallScore.totalGames += 1;
    if (isWinner) overallScore.wins += 1;
    overallScore.winRate = (overallScore.wins / overallScore.totalGames) * 100;
    await overallScore.save();

    res.json({ message: 'Score updated successfully' });
  } catch (error) {
    console.error('Update score error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

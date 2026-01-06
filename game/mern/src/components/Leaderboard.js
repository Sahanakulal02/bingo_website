import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Trophy, Medal, Award, Calendar, TrendingUp } from 'lucide-react';

const Leaderboard = () => {
  const [activeTab, setActiveTab] = useState('weekly');
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [activeTab]);

  const fetchLeaderboard = async () => {
    // Generate dummy leaderboard data instead of making API call
    const dummyLeaderboard = [
      {
        _id: 'user-1',
        username: 'Alice',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',
        wins: activeTab === 'weekly' ? 8 : activeTab === 'monthly' ? 25 : 156,
        totalGames: activeTab === 'weekly' ? 12 : activeTab === 'monthly' ? 45 : 234,
        winRate: activeTab === 'weekly' ? 66.7 : activeTab === 'monthly' ? 55.6 : 66.7
      },
      {
        _id: 'user-2',
        username: 'Bob',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
        wins: activeTab === 'weekly' ? 6 : activeTab === 'monthly' ? 18 : 134,
        totalGames: activeTab === 'weekly' ? 10 : activeTab === 'monthly' ? 35 : 198,
        winRate: activeTab === 'weekly' ? 60.0 : activeTab === 'monthly' ? 51.4 : 67.7
      },
      {
        _id: 'user-3',
        username: 'Charlie',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=charlie',
        wins: activeTab === 'weekly' ? 5 : activeTab === 'monthly' ? 15 : 98,
        totalGames: activeTab === 'weekly' ? 8 : activeTab === 'monthly' ? 28 : 145,
        winRate: activeTab === 'weekly' ? 62.5 : activeTab === 'monthly' ? 53.6 : 67.6
      },
      {
        _id: 'user-4',
        username: 'Diana',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=diana',
        wins: activeTab === 'weekly' ? 4 : activeTab === 'monthly' ? 12 : 87,
        totalGames: activeTab === 'weekly' ? 7 : activeTab === 'monthly' ? 22 : 123,
        winRate: activeTab === 'weekly' ? 57.1 : activeTab === 'monthly' ? 54.5 : 70.7
      },
      {
        _id: 'user-5',
        username: 'Eve',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=eve',
        wins: activeTab === 'weekly' ? 3 : activeTab === 'monthly' ? 10 : 76,
        totalGames: activeTab === 'weekly' ? 6 : activeTab === 'monthly' ? 18 : 108,
        winRate: activeTab === 'weekly' ? 50.0 : activeTab === 'monthly' ? 55.6 : 70.4
      }
    ];
    
    setLeaderboard(dummyLeaderboard);
    setLoading(false);
  };

  const getTabIcon = (tab) => {
    switch (tab) {
      case 'weekly':
        return <Calendar className="h-5 w-5" />;
      case 'monthly':
        return <TrendingUp className="h-5 w-5" />;
      case 'overall':
        return <Trophy className="h-5 w-5" />;
      default:
        return <Trophy className="h-5 w-5" />;
    }
  };

  const getTabTitle = (tab) => {
    switch (tab) {
      case 'weekly':
        return 'Weekly';
      case 'monthly':
        return 'Monthly';
      case 'overall':
        return 'Overall';
      default:
        return 'Overall';
    }
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Medal className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Medal className="h-6 w-6 text-orange-500" />;
      default:
        return <Award className="h-6 w-6 text-gray-400" />;
    }
  };

  const tabs = [
    { id: 'weekly', label: 'Weekly', icon: Calendar },
    { id: 'monthly', label: 'Monthly', icon: TrendingUp },
    { id: 'overall', label: 'Overall', icon: Trophy },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-2">
          Leaderboard
        </h1>
        <p className="text-gray-200 text-lg">
          See who's dominating the Bingo world
        </p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center">
        <div className="bg-white rounded-lg p-1 shadow-lg">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-3 rounded-md font-medium transition-colors duration-200 ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {getTabTitle(activeTab)} Rankings
          </h2>
          {getTabIcon(activeTab)}
        </div>

        {leaderboard.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No rankings available yet</p>
            <p className="text-gray-400">Start playing to see your rank!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((entry, index) => (
              <div
                key={entry._id}
                className={`flex items-center justify-between p-4 rounded-lg transition-colors duration-200 ${
                  index < 3
                    ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {getRankIcon(index + 1)}
                    <span className="text-lg font-bold text-gray-700">
                      #{index + 1}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">
                        {entry.user?.username?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {entry.user?.username || 'Unknown Player'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {entry.totalGames} games played
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">
                    {entry.wins}
                  </div>
                  <div className="text-sm text-gray-500">
                    {entry.winRate?.toFixed(1) || 0}% win rate
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats Summary */}
      {leaderboard.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {leaderboard[0]?.wins || 0}
            </div>
            <p className="text-gray-600">Top Player Wins</p>
          </div>
          
          <div className="card text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {leaderboard.length}
            </div>
            <p className="text-gray-600">Active Players</p>
          </div>
          
          <div className="card text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {leaderboard.reduce((sum, entry) => sum + (entry.totalGames || 0), 0)}
            </div>
            <p className="text-gray-600">Total Games</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;

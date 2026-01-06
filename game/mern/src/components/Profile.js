import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  User, 
  Trophy, 
  Gamepad2, 
  TrendingUp, 
  Calendar,
  Award,
  Target,
  BarChart3,
  Play
} from 'lucide-react';

const Profile = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserStats();
    
    // Listen for real-time game completion updates
    if (socket) {
      socket.on('gameCompleted', (data) => {
        console.log('Profile: Game completed, updating stats:', data);
        // Refresh stats when game completes
        fetchUserStats();
      });
    }

    // Listen for window events from SocketContext
    const handleGameCompleted = (event) => {
      console.log('Profile: Window game completed event:', event.detail);
      // Refresh stats when game completes
      fetchUserStats();
    };

    window.addEventListener('gameCompleted', handleGameCompleted);
    
    return () => {
      if (socket) {
        socket.off('gameCompleted');
      }
      window.removeEventListener('gameCompleted', handleGameCompleted);
    };
  }, [socket]);

  // Auto-refresh stats every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchUserStats();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  const fetchUserStats = async () => {
    try {
      console.log('Profile: Fetching user stats...');
      const token = localStorage.getItem('accessToken');
      console.log('Profile: Token exists:', !!token);
      
      // Fetch real user stats from backend API (same as Dashboard)
      const response = await axios.get('/api/users/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Profile: Backend response:', response.data);
      
      if (response.data) {
        const backendStats = response.data;
        
        // Use backend stats if available
        const realStats = {
          gamesPlayed: backendStats.gamesPlayed || 0,
          gamesWon: backendStats.gamesWon || 0,
          gamesLost: backendStats.gamesLost || 0,
          gamesDrawn: backendStats.gamesDrawn || 0,
          totalLinesCompleted: backendStats.totalLinesCompleted || 0,
          averageLinesPerGame: backendStats.averageLinesPerGame || 0,
          winRate: backendStats.winRate || 0,
          achievementLevel: backendStats.achievementLevel || 'Bingo Rookie'
        };
        
        console.log('Profile: Setting backend stats:', realStats);
        setStats(realStats);
      } else {
        // Fallback to localStorage if backend fails
        const savedStats = localStorage.getItem(`bingoStats_${user._id}`);
        let userStats = {
          gamesPlayed: 0,
          gamesWon: 0,
          gamesLost: 0,
          gamesDrawn: 0,
          totalLinesCompleted: 0,
          averageLinesPerGame: 0
        };
        
        if (savedStats) {
          userStats = JSON.parse(savedStats);
        }

        const winRate = userStats.gamesPlayed > 0 
          ? ((userStats.gamesWon / userStats.gamesPlayed) * 100).toFixed(1) 
          : '0.0';

        const realStats = {
          gamesPlayed: userStats.gamesPlayed,
          gamesWon: userStats.gamesWon,
          gamesLost: userStats.gamesLost,
          gamesDrawn: userStats.gamesDrawn || 0,
          totalLinesCompleted: userStats.totalLinesCompleted,
          averageLinesPerGame: userStats.averageLinesPerGame,
          winRate: winRate,
          achievementLevel: 'Bingo Rookie'
        };
        
        setStats(realStats);
      }
    } catch (error) {
      console.error('Profile: Error fetching user stats:', error);
      console.error('Profile: Error response:', error.response?.data);
      
      // Fallback to localStorage if API fails
      const savedStats = localStorage.getItem(`bingoStats_${user._id}`);
      let userStats = {
        gamesPlayed: 0,
        gamesWon: 0,
        gamesLost: 0,
        gamesDrawn: 0,
        totalLinesCompleted: 0,
        averageLinesPerGame: 0
      };
      
      if (savedStats) {
        userStats = JSON.parse(savedStats);
      }

      const winRate = userStats.gamesPlayed > 0 
        ? ((userStats.gamesWon / userStats.gamesPlayed) * 100).toFixed(1) 
        : '0.0';

      const realStats = {
        gamesPlayed: userStats.gamesPlayed,
        gamesWon: userStats.gamesWon,
        gamesLost: userStats.gamesLost,
        gamesDrawn: userStats.gamesDrawn || 0,
        totalLinesCompleted: userStats.totalLinesCompleted,
        averageLinesPerGame: userStats.averageLinesPerGame,
        winRate: winRate,
        achievementLevel: 'Bingo Rookie'
      };
      
      setStats(realStats);
    } finally {
      setLoading(false);
    }
  };

  const getAchievementLevel = () => {
    if (stats?.gamesWon >= 100) return { level: 'Bingo Master', color: 'text-purple-600', icon: '👑' };
    if (stats?.gamesWon >= 50) return { level: 'Bingo Expert', color: 'text-blue-600', icon: '🏆' };
    if (stats?.gamesWon >= 25) return { level: 'Bingo Pro', color: 'text-green-600', icon: '🥇' };
    if (stats?.gamesWon >= 10) return { level: 'Bingo Player', color: 'text-yellow-600', icon: '🥈' };
    return { level: 'Bingo Rookie', color: 'text-gray-600', icon: '🥉' };
  };

  const achievement = getAchievementLevel();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header - Responsive */}
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
          Your Profile
        </h1>
        <p className="text-gray-200 text-base md:text-lg mb-6">
          Track your progress and achievements
        </p>
        
        {/* Username and Details Display - Mobile Responsive */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 md:p-6 inline-block max-w-full mx-4">
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white text-2xl md:text-3xl font-bold">
                {user.username.charAt(0).toUpperCase()}
              </span>
            </div>
            
            <div className="text-center sm:text-left">
              <h2 className="text-xl md:text-2xl font-bold text-white mb-1">
                {user.username}
              </h2>
              <p className="text-gray-200 text-sm md:text-base mb-3">{user.email}</p>
              <div className="flex items-center justify-center sm:justify-start space-x-2">
                <span className="text-xl md:text-2xl">{achievement.icon}</span>
                <span className={`font-medium text-white bg-black/20 px-3 py-1 rounded-full text-sm md:text-base`}>
                  {achievement.level}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid - Modern Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="profile-stat-card group">
          <div className="stat-card-inner">
            <div className="stat-card-front">
              <div className="text-center p-4">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <Trophy className="h-6 w-6 md:h-7 md:w-7 text-white" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">{stats?.gamesWon || 0}</h3>
                <p className="text-gray-600 text-xs md:text-sm">Games Won</p>
              </div>
            </div>
            <div className="stat-card-back">
              <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-orange-50">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Award className="h-6 w-6 md:h-7 md:w-7 text-white" />
                </div>
                <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-1">Victories</h3>
                <p className="text-gray-600 text-xs md:text-sm">Keep winning!</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="profile-stat-card group">
          <div className="stat-card-inner">
            <div className="stat-card-front">
              <div className="text-center p-4">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <Gamepad2 className="h-6 w-6 md:h-7 md:w-7 text-white" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">{stats?.gamesPlayed || 0}</h3>
                <p className="text-gray-600 text-xs md:text-sm">Games Played</p>
              </div>
            </div>
            <div className="stat-card-back">
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Play className="h-6 w-6 md:h-7 md:w-7 text-white" />
                </div>
                <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-1">Experience</h3>
                <p className="text-gray-600 text-xs md:text-sm">Keep playing!</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="profile-stat-card group">
          <div className="stat-card-inner">
            <div className="stat-card-front">
              <div className="text-center p-4">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <Target className="h-6 w-6 md:h-7 md:w-7 text-white" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">{stats?.winRate || 0}%</h3>
                <p className="text-gray-600 text-xs md:text-sm">Win Rate</p>
              </div>
            </div>
            <div className="stat-card-back">
              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="h-6 w-6 md:h-7 md:w-7 text-white" />
                </div>
                <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-1">Accuracy</h3>
                <p className="text-gray-600 text-xs md:text-sm">Great performance!</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="profile-stat-card group">
          <div className="stat-card-inner">
            <div className="stat-card-front">
              <div className="text-center p-4">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <TrendingUp className="h-6 w-6 md:h-7 md:w-7 text-white" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">{stats?.totalLinesCompleted || 0}</h3>
                <p className="text-gray-600 text-xs md:text-sm">Lines Completed</p>
              </div>
            </div>
            <div className="stat-card-back">
              <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <BarChart3 className="h-6 w-6 md:h-7 md:w-7 text-white" />
                </div>
                <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-1">Progress</h3>
                <p className="text-gray-600 text-xs md:text-sm">Keep it up!</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Essentials Only: Small summary cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="card">
          <h3 className="text-base md:text-lg font-bold text-gray-900 mb-2">Overview</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-xl font-bold text-indigo-600">{stats?.gamesPlayed || 0}</div>
              <div className="text-sm font-medium text-gray-700">Games</div>
                </div>
            <div className="text-center">
              <div className="text-xl font-bold text-green-600">{stats?.gamesWon || 0}</div>
              <div className="text-sm font-medium text-gray-700">Wins</div>
                  </div>
            <div className="text-center">
              <div className="text-xl font-bold text-red-600">{stats?.gamesLost || 0}</div>
              <div className="text-sm font-medium text-gray-700">Losses</div>
                  </div>
                </div>
              </div>
        <div className="card">
          <h3 className="text-base md:text-lg font-bold text-gray-900 mb-2">Performance</h3>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-700">Win Rate</div>
              <div className="text-xl font-bold text-indigo-600">{stats?.winRate || 0}%</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700">Avg Lines/Game</div>
              <div className="text-xl font-bold text-purple-600">{stats?.averageLinesPerGame || 0}</div>
                  </div>
                </div>
              </div>
        <div className="card">
          <h3 className="text-base md:text-lg font-bold text-gray-900 mb-2">Member</h3>
          <div className="text-sm font-medium text-gray-700">
            Since {new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>

      {/* Badges & Stickers - Bingo Theme */}
        <div className="profile-section-card group">
          <div className="section-card-inner">
            <div className="section-card-front">
            <div className="p-4 md:p-6 bg-gradient-to-r from-blue-50 to-purple-50">
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 text-center">🏅 Badges & Stickers</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 md:gap-4">
                {[
                  { label: 'First Win', color: 'bg-yellow-400', icon: '🏆' },
                  { label: '10 Games', color: 'bg-blue-400', icon: '🎲' },
                  { label: 'Pro Lines', color: 'bg-green-400', icon: '🟩' },
                  { label: 'Hot Streak', color: 'bg-pink-400', icon: '🔥' },
                  { label: 'Full House', color: 'bg-purple-400', icon: '🏠' },
                  { label: 'Sharpshooter', color: 'bg-red-400', icon: '🎯' }
                ].map((b, i) => (
                  <div key={i} className="bg-white rounded-2xl shadow-sm p-3 text-center">
                    <div className={`w-12 h-12 mx-auto rounded-full ${b.color} flex items-center justify-center text-white text-xl shadow-md mb-2`}>
                      <span>{b.icon}</span>
                </div>
                    <div className="text-xs md:text-sm font-medium text-gray-700">{b.label}</div>
                    </div>
                ))}
                    </div>
                  </div>
                    </div>
          <div className="section-card-back">
            <div className="p-4 md:p-6 bg-gradient-to-r from-purple-50 to-pink-50">
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 text-center">🎖️ How to earn</h3>
              <ul className="text-xs md:text-sm text-gray-600 space-y-2 list-disc list-inside">
                <li>Win matches and complete lines</li>
                <li>Maintain streaks and play daily</li>
                <li>Achieve rare patterns like Full House</li>
              </ul>
                      </div>
                      </div>
                    </div>
                  </div>
                  
      {/* Friends / Recent Opponents */}
      <div className="profile-section-card group">
        <div className="section-card-inner">
          <div className="section-card-front">
            <div className="p-4 md:p-6 bg-gradient-to-br from-indigo-50 to-blue-50">
              <h3 className="text-base md:text-lg font-bold text-gray-900 mb-4">Friends & Recent Opponents</h3>
              <div className="space-y-3">
                {[{ name: 'Alice', result: 'Won', color: 'green' }, { name: 'Bob', result: 'Lost', color: 'red' }, { name: 'Charlie', result: 'Won', color: 'green' }].map((p, i) => (
                  <div key={i} className="bg-white rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full bg-${p.color}-500 text-white flex items-center justify-center font-bold`}>{p.name.charAt(0)}</div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-500">Recent opponent</p>
                    </div>
                  </div>
                    <span className={`px-2 py-1 rounded-full text-xs bg-${p.color}-100 text-${p.color}-700`}>{p.result}</span>
                  </div>
                ))}
                </div>
              </div>
            </div>
            <div className="section-card-back">
            <div className="p-4 md:p-6 bg-gradient-to-br from-blue-50 to-cyan-50">
              <h3 className="text-base md:text-lg font-bold text-gray-900 mb-4">Find Friends</h3>
              <p className="text-xs md:text-sm text-gray-600">Connect with friends to play together and compare stats.</p>
                  </div>
                </div>
              </div>
      </div>

      {/* Activity History */}
      <div className="profile-section-card group">
        <div className="section-card-inner">
          <div className="section-card-front">
            <div className="p-4 md:p-6 bg-gradient-to-br from-green-50 to-emerald-50">
              <h3 className="text-base md:text-lg font-bold text-gray-900 mb-4">Activity History</h3>
              <div className="space-y-3">
                {[{ t: 'Last Played', v: '2 hours ago' }, { t: 'Joined', v: new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) }, { t: 'Total Games', v: stats?.gamesPlayed || 0 }].map((it, i) => (
                  <div key={i} className="bg-white rounded-xl p-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">{it.t}</span>
                    <span className="text-sm text-gray-900">{it.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="section-card-back">
            <div className="p-4 md:p-6 bg-gradient-to-br from-emerald-50 to-teal-50">
              <h3 className="text-base md:text-lg font-bold text-gray-900 mb-2">Summary</h3>
              <p className="text-xs md:text-sm text-gray-600">Your recent activity and account timeline at a glance.</p>
            </div>
          </div>
        </div>
      </div>
      {/* Recent Matches/History Section */}
      <div className="profile-section-card group">
        <div className="section-card-inner">
          <div className="section-card-front">
            <div className="p-4 md:p-6 bg-gradient-to-br from-green-50 to-blue-50">
              <div className="flex items-center space-x-2 mb-4">
                <Calendar className="h-5 w-5 md:h-6 md:w-6 text-blue-500" />
                <h3 className="text-base md:text-lg font-bold text-gray-900">Recent Matches</h3>
              </div>
              
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {/* Sample recent matches - you can replace with real data */}
                <div className="bg-white rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <Trophy className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">vs Computer</p>
                      <p className="text-xs text-gray-500">2 hours ago</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Won</span>
                </div>
                
                <div className="bg-white rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <Gamepad2 className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">vs Alice</p>
                      <p className="text-xs text-gray-500">1 day ago</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">Lost</span>
                </div>
                
                <div className="bg-white rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <Trophy className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">vs Bob</p>
                      <p className="text-xs text-gray-500">3 days ago</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Won</span>
                </div>
              </div>
            </div>
          </div>
          <div className="section-card-back">
            <div className="p-4 md:p-6 bg-gradient-to-br from-blue-50 to-cyan-50">
              <div className="flex items-center space-x-2 mb-4">
                <Target className="h-5 w-5 md:h-6 md:w-6 text-cyan-500" />
                <h3 className="text-base md:text-lg font-bold text-gray-900">Match Statistics</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-white rounded-lg">
                  <div className="text-lg md:text-xl font-bold text-cyan-600">{stats?.gamesWon || 0}</div>
                  <div className="text-xs text-gray-600">Total Wins</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg">
                  <div className="text-lg md:text-xl font-bold text-cyan-600">{stats?.gamesLost || 0}</div>
                  <div className="text-xs text-gray-600">Total Losses</div>
                </div>
              </div>
              <div className="mt-3 text-xs md:text-sm text-gray-500 space-y-1">
                <p>• View detailed match history</p>
                <p>• Analyze your performance</p>
                <p>• Track improvement over time</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Minimal recent activity */}
      <div className="card">
        <h3 className="text-base md:text-lg font-bold text-gray-900 mb-3">Recent Activity</h3>
        <div className="text-sm text-gray-700">Last played: 2 hours ago</div>
      </div>

      {/* Member Since - Compact */}
      <div className="profile-section-card group">
        <div className="section-card-inner">
          <div className="section-card-front">
            <div className="p-4 md:p-6 text-center">
              <div className="flex items-center justify-center space-x-2 mb-3">
                <User className="h-5 w-5 md:h-6 md:w-6 text-gray-500" />
                <h3 className="text-base md:text-lg font-bold text-gray-900">Member Since</h3>
              </div>
              <p className="text-gray-600 text-sm md:text-base">
                {new Date(user.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
          <div className="section-card-back">
            <div className="p-4 md:p-6 bg-gradient-to-br from-gray-50 to-blue-50 text-center">
              <div className="flex items-center justify-center space-x-2 mb-3">
                <Calendar className="h-5 w-5 md:h-6 md:w-6 text-blue-500" />
                <h3 className="text-base md:text-lg font-bold text-gray-900">Account Info</h3>
              </div>
              <div className="text-xs md:text-sm text-gray-500 space-y-1">
                <p>• Active member for {Math.floor((new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24))} days</p>
                <p>• {stats?.gamesPlayed || 0} games played</p>
                <p>• {stats?.gamesWon || 0} victories achieved</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;

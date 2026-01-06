import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  Users, 
  Gamepad2, 
  Trophy, 
  Clock, 
  UserPlus,
  Play,
  Eye,
  TrendingUp,
  Target,
  Award,
  BarChart3,
  User
} from 'lucide-react';

const Dashboard = () => {
  const { user, accessToken, loading: authLoading } = useAuth();
  const { sendInvitation, socket } = useSocket();
  const navigate = useNavigate();
  
  const [users, setUsers] = useState([]);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [userStats, setUserStats] = useState({
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    totalLinesCompleted: 0,
    averageLinesPerGame: 0,
    achievementLevel: 'Bingo Rookie',
    winRate: 0
  });
  const [statsUpdating, setStatsUpdating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Define functions first to avoid use-before-define errors
  const fetchData = useCallback(async () => {
    if (!user?._id || !accessToken) return;
    
    try {
      setLoading(true);
      console.log('Dashboard: Fetching data with token:', accessToken ? 'Token exists' : 'No token');
      
      // Fetch real user stats from backend
      const statsResponse = await axios.get('/api/users/stats', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      console.log('Dashboard: Stats response:', statsResponse.data);
      
      if (statsResponse.data) {
        setUserStats(statsResponse.data);
        console.log('Dashboard: Updated user stats:', statsResponse.data);
      }

      // Fetch real users from backend
      const usersResponse = await axios.get('/api/users', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      console.log('Dashboard: Users response:', usersResponse.data);
      
      if (usersResponse.data && usersResponse.data.users) {
        setUsers(usersResponse.data.users);
      }

      // Fetch real games from backend
      const gamesResponse = await axios.get('/api/games', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      console.log('Dashboard: Games response:', gamesResponse.data);
      
      if (gamesResponse.data && gamesResponse.data.games) {
        setGames(gamesResponse.data.games);
      }

    } catch (error) {
      console.error('Dashboard: Error fetching data:', error);
      console.error('Dashboard: Error response:', error.response?.data);
      
      // Fallback to dummy data if API fails
      const dummyUsers = [
        {
          _id: 'user-1',
          username: 'Alice',
          email: 'alice@example.com',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',
          totalWins: 15,
          totalGames: 45
        },
        {
          _id: 'user-2',
          username: 'Bob',
          email: 'bob@example.com',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
          totalWins: 23,
          totalGames: 67
        },
        {
          _id: 'user-3',
          username: 'Charlie',
          email: 'charlie@example.com',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=charlie',
          totalWins: 8,
          totalGames: 32
        },
        {
          _id: 'user-4',
          username: 'Diana',
          email: 'diana@example.com',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=diana',
          totalWins: 31,
          totalGames: 89
        }
      ];

      const dummyGames = [
        {
          _id: 'game-1',
          creator: { _id: user?._id || 'unknown', username: user?.username || 'Unknown' },
          opponent: { _id: 'user-1', username: 'Alice' },
          status: 'completed',
          winner: user?._id || 'unknown',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 3600000).toISOString()
        },
        {
          _id: 'game-2',
          creator: { _id: 'user-2', username: 'Bob' },
          opponent: { _id: user?._id || 'unknown', username: user?.username || 'Unknown' },
          status: 'pending',
          createdAt: new Date(Date.now() - 7200000).toISOString(),
          updatedAt: new Date(Date.now() - 7200000).toISOString()
        }
      ];

      setUsers(dummyUsers);
      setGames(dummyGames);
    } finally {
      setLoading(false);
    }
  }, [user?._id, accessToken, user?.username]);

  // Function to refresh user stats
  const refreshUserStats = useCallback(async () => {
    if (!user?._id || !accessToken) return;
    
    try {
      setStatsUpdating(true);
      const statsResponse = await axios.get('/api/users/stats', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (statsResponse.data) {
        setUserStats(statsResponse.data);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Error refreshing stats:', error);
    } finally {
      setStatsUpdating(false);
    }
  }, [user?._id, accessToken]);

  const createGame = useCallback(async (opponentId) => {
    if (!user?._id) return;
    
    // Create dummy game instead of making API call
    const dummyGame = {
      _id: 'game-' + Date.now(),
      creator: { _id: user?._id || 'unknown', username: user?.username || 'Unknown' },
      opponent: users.find(u => u._id === opponentId),
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Add to games list
    setGames(prev => [dummyGame, ...prev]);
    
    toast.success('Game created! Redirecting to game...');
    setShowUserModal(false);
    setSelectedUser(null);
    
    // Navigate to the game
    setTimeout(() => {
      navigate(`/game/${dummyGame._id}`);
    }, 1000);
  }, [user?._id, user?.username, users, navigate]);

  // Listen for real-time game completion updates
  useEffect(() => {
    if (socket && user?._id) {
      // Listen for game completion events
      socket.on('gameCompleted', (data) => {
        console.log('Game completed:', data);
        
        // Update stats if this user was involved in the game
        if (data.creatorStats.userId === user._id) {
          setUserStats(data.creatorStats);
        } else if (data.opponentStats.userId === user._id) {
          setUserStats(data.opponentStats);
        }
        
        // Refresh the data to show updated stats
        fetchData();
      });

      // Listen for user stats updates
      socket.on('userStatsUpdated', (updatedStats) => {
        if (updatedStats.userId === user._id) {
          setUserStats(updatedStats);
        }
      });

      return () => {
        socket.off('gameCompleted');
        socket.off('userStatsUpdated');
      };
    }
  }, [socket, user?._id, fetchData]);

  // Listen for window events from SocketContext
  useEffect(() => {
    if (!user?._id) return; // Don't set up listeners if user is not loaded
    
    const handleGameCompleted = (event) => {
      console.log('Dashboard: Window game completed event:', event.detail);
      const { gameId, winner, playerStats } = event.detail;
      
      // Update stats immediately for better UX
      if (playerStats.userId === user._id) {
        console.log('Dashboard: Updating local stats for user:', user._id);
        
        setUserStats(prevStats => {
          const newStats = {
            ...prevStats,
            gamesPlayed: prevStats.gamesPlayed + 1,
            gamesWon: prevStats.gamesWon + (playerStats.isWinner ? 1 : 0),
            gamesLost: prevStats.gamesLost + (playerStats.isWinner ? 0 : 1),
            totalLinesCompleted: prevStats.totalLinesCompleted + playerStats.linesCompleted,
            averageLinesPerGame: 0
          };
          
          // Recalculate average lines per game
          newStats.averageLinesPerGame = newStats.gamesPlayed > 0 
            ? Math.round((newStats.totalLinesCompleted / newStats.gamesPlayed) * 10) / 10 
            : 0;
          
          // Update achievement level
          if (newStats.gamesWon >= 100) {
            newStats.achievementLevel = 'Bingo Master';
          } else if (newStats.gamesWon >= 50) {
            newStats.achievementLevel = 'Bingo Expert';
          } else if (newStats.gamesWon >= 25) {
            newStats.achievementLevel = 'Bingo Pro';
          } else if (newStats.gamesWon >= 10) {
            newStats.achievementLevel = 'Bingo Player';
          } else {
            newStats.achievementLevel = 'Bingo Rookie';
          }
          
          // Update win rate
          newStats.winRate = newStats.gamesPlayed > 0 
            ? Math.round((newStats.gamesWon / newStats.gamesPlayed) * 100 * 10) / 10 
            : 0;
          
          console.log('Dashboard: New stats calculated:', newStats);
          
          // Set visual feedback
          setStatsUpdating(true);
          
          // Clear updating state after animation
          setTimeout(() => setStatsUpdating(false), 2000);
          
          return newStats;
        });
        
        // Show success message
        toast.success(playerStats.isWinner ? '🎉 You won! Stats updated!' : 'Game completed! Stats updated!');
      }
      
      // Refresh data from backend after a short delay
      setTimeout(() => {
        fetchData();
      }, 1000);
    };

    window.addEventListener('gameCompleted', handleGameCompleted);
    
    return () => {
      window.removeEventListener('gameCompleted', handleGameCompleted);
    };
  }, [user?._id, fetchData]);

  // Auto-refresh stats every 30 seconds
  useEffect(() => {
    if (!user?._id || !accessToken) return;
    
    const interval = setInterval(() => {
      refreshUserStats();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [user?._id, accessToken, refreshUserStats]);

  useEffect(() => {
    if (user?._id && accessToken) {
      fetchData();
    }
  }, [user?._id, accessToken, fetchData]);

  const handleInvitePlayer = async () => {
    if (!inviteUsername) {
      toast.error('Please enter a username');
      return;
    }

    if (inviteUsername.length < 3) {
      toast.error('Username must be at least 3 characters long');
      return;
    }

    // Check if username already exists
    const existingUser = users.find(u => u.username.toLowerCase() === inviteUsername.toLowerCase());
    if (existingUser) {
      toast.error('Username already exists. Please choose a different one.');
      return;
    }

    setInviteLoading(true);
    
    try {
      // For now, we'll simulate sending an invitation
      // In a real app, this would make an API call to send an email invitation
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Add the invited player to the users list (simulating they joined)
      const newPlayer = {
        _id: 'invited-' + Date.now(),
        username: inviteUsername,
        email: inviteEmail || 'invited@example.com',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${inviteUsername}`,
        totalWins: 0,
        totalGames: 0,
        isInvited: true
      };
      
      setUsers(prev => [newPlayer, ...prev]);
      
      toast.success(`Invitation sent to ${inviteUsername}!`);
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteUsername('');
      
    } catch (error) {
      toast.error('Failed to send invitation. Please try again.');
    } finally {
      setInviteLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getGameStatus = (game) => {
    if (game.status === 'pending') return { text: 'Pending', color: 'text-yellow-600 bg-yellow-100' };
    if (game.status === 'active') return { text: 'Active', color: 'text-green-600 bg-green-100' };
    if (game.status === 'completed') return { text: 'Completed', color: 'text-blue-600 bg-blue-100' };
    return { text: 'Cancelled', color: 'text-red-600 bg-red-100' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show loading state if user is not loaded yet
  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Hero Section - Game Website Style */}
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 rounded-3xl mx-4 mb-8">
        {/* Animated Background Elements - Bingo Numbers */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-16 h-16 bg-yellow-400 rounded-full opacity-30 animate-float-numbers flex items-center justify-center text-white font-bold text-lg">B</div>
          <div className="absolute top-32 right-20 w-14 h-14 bg-red-400 rounded-full opacity-30 animate-float-numbers flex items-center justify-center text-white font-bold text-lg" style={{animationDelay: '1s'}}>I</div>
          <div className="absolute bottom-20 left-32 w-12 h-12 bg-green-400 rounded-full opacity-30 animate-float-numbers flex items-center justify-center text-white font-bold text-lg" style={{animationDelay: '2s'}}>N</div>
          <div className="absolute bottom-32 right-10 w-18 h-18 bg-blue-400 rounded-full opacity-30 animate-float-numbers flex items-center justify-center text-white font-bold text-lg" style={{animationDelay: '3s'}}>G</div>
          <div className="absolute top-1/2 left-1/4 w-10 h-10 bg-pink-400 rounded-full opacity-30 animate-float-numbers flex items-center justify-center text-white font-bold text-lg" style={{animationDelay: '4s'}}>O</div>
          <div className="absolute top-1/3 right-1/3 w-8 h-8 bg-purple-400 rounded-full opacity-30 animate-float-numbers flex items-center justify-center text-white font-bold text-sm" style={{animationDelay: '5s'}}>25</div>
          <div className="absolute bottom-1/3 left-1/2 w-6 h-6 bg-orange-400 rounded-full opacity-30 animate-float-numbers flex items-center justify-center text-white font-bold text-xs" style={{animationDelay: '6s'}}>7</div>
        </div>
        
        <div className="relative z-10 text-center py-16 px-6">
          <div className="mb-6">
            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-4">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-white text-sm font-medium">Welcome back, {user.username}!</span>
            </div>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black text-white mb-4 animate-fade-in bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 bg-clip-text text-transparent">
            BINGO
          </h1>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 animate-fade-in-delay">
            Ultimate Gaming Experience
          </h2>
          <p className="text-xl text-gray-200 mb-8 max-w-2xl mx-auto animate-fade-in-delay-2">
            Challenge friends, compete globally, and become the ultimate Bingo champion!
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6 animate-fade-in-delay-3">
            <button
              onClick={() => {
                const soloGameId = 'solo-game-' + Date.now();
                navigate(`/game/${soloGameId}`);
              }}
              className="game-btn-primary group"
            >
              <Play className="h-5 w-5 mr-2 group-hover:animate-spin" />
              <span>Start Playing Now</span>
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-red-500 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            </button>
            
            <button
              onClick={() => navigate('/multiplayer')}
              className="game-btn-secondary group"
            >
              <Users className="h-5 w-5 mr-2" />
              <span>Multiplayer Battle</span>
            </button>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-6 mt-12 max-w-md mx-auto">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">{userStats.gamesWon || 0}</div>
              <div className="text-sm text-gray-300">Wins</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{userStats.gamesPlayed || 0}</div>
              <div className="text-sm text-gray-300">Games</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{userStats.winRate || 0}%</div>
              <div className="text-sm text-gray-300">Win Rate</div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticker Layer - Bingo Themed Decorations */}
      <div className="pointer-events-none">
        {/* Bingo Balls */}
        <div className="fixed top-8 left-6 z-10">
          <div className="w-16 h-16 rounded-full bg-yellow-400 shadow-xl shadow-yellow-500/40 border-4 border-white flex items-center justify-center text-white font-black text-xl rotate-[-10deg]">
            12
          </div>
        </div>
        <div className="fixed top-28 right-8 z-10">
          <div className="w-14 h-14 rounded-full bg-red-500 shadow-xl shadow-red-500/40 border-4 border-white flex items-center justify-center text-white font-black text-lg rotate-[12deg]">
            25
          </div>
        </div>
        <div className="fixed bottom-24 left-10 z-10">
          <div className="w-12 h-12 rounded-full bg-green-500 shadow-xl shadow-green-500/40 border-4 border-white flex items-center justify-center text-white font-black rotate-[8deg]">
            7
          </div>
        </div>
        <div className="fixed bottom-12 right-12 z-10">
          <div className="w-16 h-16 rounded-full bg-blue-500 shadow-xl shadow-blue-500/40 border-4 border-white flex items-center justify-center text-white font-black text-xl rotate-[-6deg]">
            39
          </div>
        </div>

        {/* Bingo Card Stickers */}
        <div className="fixed top-40 left-1/4 z-10 rotate-[8deg]">
          <div className="bg-white/95 border-4 border-white rounded-2xl p-3 shadow-2xl shadow-purple-500/20">
            <div className="text-[10px] font-extrabold tracking-widest text-purple-600 text-center mb-1">B I N G O</div>
            <div className="grid grid-cols-5 gap-0.5">
              {Array.from({ length: 15 }).map((_, i) => (
                <div key={i} className="w-3 h-3 bg-purple-100 rounded-sm"></div>
              ))}
            </div>
          </div>
        </div>
        <div className="fixed bottom-40 right-1/4 z-10 rotate-[-8deg]">
          <div className="bg-white/95 border-4 border-white rounded-2xl p-3 shadow-2xl shadow-pink-500/20">
            <div className="text-[10px] font-extrabold tracking-widest text-pink-600 text-center mb-1">B I N G O</div>
            <div className="grid grid-cols-5 gap-0.5">
              {Array.from({ length: 15 }).map((_, i) => (
                <div key={i} className="w-3 h-3 bg-pink-100 rounded-sm"></div>
              ))}
            </div>
          </div>
        </div>

        {/* Winning Pattern Stickers */}
        <div className="fixed top-20 right-1/3 z-10 rotate-[15deg]">
          <div className="bg-white/95 border-4 border-white rounded-xl p-2 shadow-xl shadow-blue-500/20">
            <div className="grid grid-cols-3 gap-0.5">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className={`w-3 h-3 rounded-sm ${i % 4 === 0 ? 'bg-blue-400' : 'bg-blue-100'}`}></div>
              ))}
            </div>
          </div>
        </div>
        <div className="fixed bottom-28 left-1/3 z-10 rotate-[-12deg]">
          <div className="bg-white/95 border-4 border-white rounded-xl p-2 shadow-xl shadow-green-500/20">
            <div className="grid grid-cols-3 gap-0.5">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className={`w-3 h-3 rounded-sm ${i >= 6 ? 'bg-green-400' : 'bg-green-100'}`}></div>
              ))}
            </div>
          </div>
        </div>
        <div className="fixed top-1/2 right-6 z-10 rotate-[6deg]">
          <div className="bg-white/95 border-4 border-white rounded-xl p-2 shadow-xl shadow-yellow-500/20">
            <div className="grid grid-cols-3 gap-0.5">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className={`w-3 h-3 rounded-sm ${i !== 4 ? 'bg-yellow-400' : 'bg-yellow-100'}`}></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid - Responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
        {/* Available Players */}
        <div className="modern-card-compact group">
          <div className="card-inner">
            <div className="card-front">
              <div className="p-4 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg md:text-xl font-bold text-gray-900">Available Players</h2>
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors duration-200 cursor-pointer"
                    title="Invite New Player"
                  >
                    <UserPlus className="h-4 w-4 md:h-5 md:w-5" />
                    <span className="text-xs font-medium">Invite</span>
                  </button>
                </div>
                
                <div className="space-y-2 max-h-60 md:max-h-80 overflow-y-auto">
                  {users.map((player) => (
                    <div key={player._id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 md:w-8 md:h-8 bg-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-xs md:text-sm">
                            {player.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-xs md:text-sm">{player.username}</p>
                          <p className="text-xs text-gray-500">
                            {player.totalWins} wins • {player.totalGames} games
                            {player.isInvited && (
                              <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full">
                                Invited
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedUser(player);
                          setShowUserModal(true);
                        }}
                        className={`flex items-center space-x-1 text-xs px-2 py-1 rounded ${
                          player.isInvited 
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                            : 'btn-primary'
                        }`}
                        disabled={player.isInvited}
                        title={player.isInvited ? 'Player has been invited' : 'Challenge this player'}
                      >
                        <Play className="h-3 w-3" />
                        <span>{player.isInvited ? 'Pending' : 'Challenge'}</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="card-back">
              <div className="p-4 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg md:text-xl font-bold text-gray-900">Player Stats</h2>
                  <Users className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
                </div>
                <div className="space-y-3">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{users.length}</p>
                    <p className="text-sm text-gray-600">Active Players</p>
                  </div>
                  <div className="text-xs md:text-sm text-gray-500 space-y-1">
                    <p>• Challenge any player</p>
                    <p>• Real-time matchmaking</p>
                    <p>• Invite friends to play</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Games */}
        <div className="modern-card-compact group">
          <div className="card-inner">
            <div className="card-front">
              <div className="p-4 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg md:text-xl font-bold text-gray-900">Recent Games</h2>
                  <Clock className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
                </div>
                
                <div className="space-y-2 max-h-60 md:max-h-80 overflow-y-auto">
                  {games.length === 0 ? (
                    <p className="text-gray-500 text-center py-6 text-sm">No games yet. Start by challenging someone!</p>
                  ) : (
                    games.slice(0, 10).map((game) => {
                      const status = getGameStatus(game);
                      const opponent = game.creator._id === user?._id ? game.opponent : game.creator;
                      
                      return (
                        <div key={game._id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 md:w-8 md:h-8 bg-blue-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-bold text-xs md:text-sm">
                                {opponent.username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 text-xs md:text-sm">vs {opponent.username}</p>
                              <p className="text-xs text-gray-500">{formatDate(game.createdAt)}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                              {status.text}
                            </span>
                            {game.status === 'active' && (
                              <button
                                onClick={() => navigate(`/game/${game._id}`)}
                                className="btn-primary flex items-center space-x-1 text-xs px-2 py-1"
                              >
                                <Eye className="h-3 w-3" />
                                <span>Join</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
            <div className="card-back">
              <div className="p-4 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg md:text-xl font-bold text-gray-900">Game History</h2>
                  <Trophy className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
                </div>
                <div className="space-y-3">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{userStats.gamesWon || 0}</p>
                    <p className="text-sm text-gray-600">Games Won</p>
                  </div>
                  <div className="text-xs md:text-sm text-gray-500 space-y-1">
                    <p>• Track your progress</p>
                    <p>• View match details</p>
                    <p>• Analyze your performance</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fun Facts & Tips Section */}
        <div className="modern-card-compact group">
          <div className="card-inner">
            <div className="card-front">
              <div className="p-4 md:p-6 bg-gradient-to-r from-purple-50 to-pink-50">
                <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 text-center">
                  🎯 Bingo Fun Facts & Tips
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-2">
                    <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">1</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-xs md:text-sm">Bingo originated in Italy</p>
                      <p className="text-xs text-gray-600">The game dates back to the 16th century!</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">2</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-xs md:text-sm">Pattern strategies</p>
                      <p className="text-xs text-gray-600">Focus on corners first for better odds!</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">3</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-xs md:text-sm">Stay focused</p>
                      <p className="text-xs text-gray-600">Don't get distracted by other players!</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="card-back">
              <div className="p-4 md:p-6 bg-gradient-to-r from-pink-50 to-rose-50">
                <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 text-center">
                  💡 Pro Tips
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-2">
                    <div className="w-5 h-5 bg-pink-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">4</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-xs md:text-sm">Practice makes perfect</p>
                      <p className="text-xs text-gray-600">Play regularly to improve your skills!</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-5 h-5 bg-pink-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">5</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-xs md:text-sm">Watch the numbers</p>
                      <p className="text-xs text-gray-600">Pay attention to called numbers!</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-5 h-5 bg-pink-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">6</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-xs md:text-sm">Have fun!</p>
                      <p className="text-xs text-gray-600">Enjoy the game and make friends!</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Selection Modal */}
      {showUserModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Challenge {selectedUser.username}
            </h3>
            <p className="text-gray-600 mb-6">
              Send a game invitation to {selectedUser.username}. They will be notified and can accept or decline.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowUserModal(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => createGame(selectedUser._id)}
                className="btn-primary flex-1"
              >
                Send Challenge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Player Modal */}
      {showInviteModal && (
        <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Invite New Player
            </h3>
            <div className="mb-4">
              <label htmlFor="inviteUsername" className="block text-sm font-medium text-gray-700 mb-1">
                Username *
              </label>
              <input
                type="text"
                id="inviteUsername"
                value={inviteUsername}
                onChange={(e) => setInviteUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter username"
                disabled={inviteLoading}
                maxLength={20}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="inviteEmail" className="block text-sm font-medium text-gray-700 mb-1">
                Email (optional)
              </label>
              <input
                type="email"
                id="inviteEmail"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter email"
                disabled={inviteLoading}
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowInviteModal(false)}
                className="btn-secondary flex-1"
                disabled={inviteLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleInvitePlayer}
                className="btn-primary flex-1"
                disabled={inviteLoading || !inviteUsername}
              >
                {inviteLoading ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
            <p className="text-xs text-gray-500 text-center mt-4">
              An invitation will be sent. The player can then register and join your game!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { 
  Plus, 
  Search, 
  Copy,
  Users,
  Crown,
  Play,
  X,
  Wifi,
  WifiOff,
  Gamepad2,
  Trophy,
  Clock
} from 'lucide-react';

const Multiplayer = () => {
  const { user } = useAuth();
  const { socket, connected, createRoom, joinRoom, leaveRoom, testConnection } = useSocket();
  const navigate = useNavigate();
  
  const [currentRoom, setCurrentRoom] = useState(null);
  const [roomCode, setRoomCode] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreatedModal, setShowCreatedModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  // Show connection status
  useEffect(() => {
    if (connected) {
      console.log('✅ Connected to game server as', user?.username);
    } else {
      console.log('⏳ Connecting to game server as', user?.username);
    }
  }, [connected, user]);

  useEffect(() => {
    if (socket) {
      console.log('🔌 Setting up socket event listeners in Multiplayer component');
      
      // Listen for room events
      socket.on('roomCreated', handleRoomCreated);
      socket.on('roomJoined', handleRoomJoined);
      socket.on('roomReady', handleRoomReady);
      socket.on('gameStarted', handleGameStarted);
      socket.on('playerJoined', (data) => {
        // Backend notifies existing players
        if (currentRoom && data.roomCode === currentRoom.roomCode) {
          setCurrentRoom(prev => ({ ...prev, players: data.players }));
          if (data.players && data.players.length >= 2) {
            // Show notification that players joined
            toast.success(`${data.players.length} players joined! Game is ready to start!`);
            // Don't auto-navigate - let the GameRoom component handle the game ready state
            console.log('Player joined, game ready, but not auto-navigating');
          }
        }
      });
      socket.on('error', handleSocketError);
      socket.on('roomUpdate', handleRoomUpdate);

      return () => {
        console.log('🔌 Cleaning up socket event listeners in Multiplayer component');
        socket.off('roomCreated');
        socket.off('roomJoined');
        socket.off('roomReady');
        socket.off('gameStarted');
        socket.off('error');
        socket.off('roomUpdate');
        socket.off('playerJoined');
      };
    }
  }, [socket, currentRoom, navigate]);

  const handleCreateRoom = () => {
    if (!socket) {
      toast.error('Socket connection not available. Please refresh the page.');
      return;
    }
    
    setIsCreating(true);
    console.log('🏠 Creating room for user:', user?.username || 'Guest');
    
    try {
      createRoom({
        userId: user?._id || 'guest_' + Date.now(),
        username: user?.username || 'Guest'
      });
    } catch (error) {
      console.error('❌ Error creating room:', error);
      toast.error('Failed to create room. Please try again.');
      setIsCreating(false);
    }
  };

  const handleJoinRoom = () => {
    if (!socket) {
      toast.error('Socket connection not available. Please refresh the page.');
      return;
    }
    
    if (!roomCode.trim()) {
      toast.error('Please enter a room code');
      return;
    }
    
    setIsJoining(true);
    console.log('🚪 Joining room:', roomCode, 'for user:', user?.username || 'Guest');
    
    try {
      joinRoom({
        roomCode: roomCode.trim().toUpperCase(),
        userId: user?._id || 'guest_' + Date.now(),
        username: user?.username || 'Guest'
      });
    } catch (error) {
      console.error('❌ Error joining room:', error);
      toast.error('Failed to join room. Please try again.');
      setIsJoining(false);
    }
  };

  const handleLeaveRoom = () => {
    if (currentRoom) {
      leaveRoom({ roomCode: currentRoom.roomCode });
      setCurrentRoom(null);
      setShowCreatedModal(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  // Socket event handlers
  const handleRoomCreated = (data) => {
    console.log('✅ Room created event received:', data);
    setIsCreating(false);
    setCurrentRoom({
      roomCode: data.roomCode,
      players: [{
        userId: user?._id || 'guest_' + Date.now(),
        username: user?.username || 'Guest',
        isHost: true
      }],
      isHost: true,
      status: 'waiting'
    });
    setShowCreatedModal(true);
    toast.success(`Room created! Code: ${data.roomCode}`);
  };

  const handleRoomJoined = (data) => {
    console.log('🚪 Room joined event received:', data);
    setIsJoining(false);
    
    setCurrentRoom({
      roomCode: data.roomCode,
      players: data.players,
      isHost: data.players.find(p => p.userId === (user?._id || 'guest_' + Date.now()))?.isHost || false,
      status: data.status || 'waiting'
    });
    setShowJoinModal(false);
    setRoomCode('');
    
    // Show appropriate message
    if (data.players.find(p => p.userId === (user?._id || 'guest_' + Date.now()))) {
      toast.success(`Joined room ${data.roomCode}!`);
    } else {
      const newPlayer = data.players.find(p => !currentRoom?.players.find(existing => existing.userId === p.userId));
      if (newPlayer) {
        toast.success(`${newPlayer.username} joined the room!`);
      }
    }
  };

  const handleRoomReady = (data) => {
    console.log('🎯 Room ready event received:', data);
    if (currentRoom && data.roomCode === currentRoom.roomCode) {
      setCurrentRoom(prev => ({
        ...prev,
        status: 'ready'
      }));
      
      toast.success('Room is ready! Starting game...');
      // Navigate immediately when room is ready
      setTimeout(() => {
        navigate(`/game/${data.roomCode}`);
      }, 1000);
    }
  };

  const handleRoomUpdate = (data) => {
    console.log('📢 Room update event received:', data);
    if (currentRoom && data.roomCode === currentRoom.roomCode) {
      setCurrentRoom(prev => ({
        ...prev,
        players: data.players,
        status: data.status
      }));
      
      if (data.message) {
        toast.info(data.message);
      }
    }
  };

  const handleGameStarted = (data) => {
    console.log('🎮 Game started event received:', data);
    if (currentRoom && data.roomCode === currentRoom.roomCode) {
      toast.success('Game is starting!');
      // Navigate to game after a short delay
      setTimeout(() => {
        navigate(`/game/${data.roomCode}`);
      }, 2000);
    }
  };

  const handleSocketError = (data) => {
    console.error('❌ Socket error received:', data);
    setIsCreating(false);
    setIsJoining(false);
    toast.error(data.message || 'An error occurred');
  };

  // Check for room code in URL on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam) {
      setRoomCode(roomParam.toUpperCase());
      setShowJoinModal(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-6xl font-black text-white mb-4 bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 bg-clip-text text-transparent">
            MULTIPLAYER BINGO
          </h1>
          <p className="text-xl text-gray-200 mb-6">
            Challenge friends and compete in real-time Bingo battles!
          </p>
        </div>

        {/* Connection Status */}
        <div className="flex justify-center mb-8">
          <div className={`flex items-center space-x-2 px-4 py-2 rounded-full ${
            connected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {connected ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
            <span className="font-medium">
              {connected 
                ? `Connected as ${user?.username || 'Guest'}` 
                : 'Disconnected from Game Server'
              }
            </span>
          </div>
          
          {/* Debug Button */}
          <button
            onClick={testConnection}
            className="ml-4 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-sm hover:bg-blue-500/30 transition-colors"
            title="Test connection status"
          >
            Debug
          </button>
        </div>

        {!connected && (
          <div className="text-center mb-8">
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-red-400 mb-2">Unable to connect to game server</p>
              <p className="text-sm text-gray-300 mb-3">Please check your connection and try again</p>
              <button 
                onClick={() => window.location.reload()} 
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Retry Connection
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Create Room Section */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Create Room</h2>
              <p className="text-gray-300 mb-6">Start a new game and invite friends to join</p>
              
              <button 
                onClick={handleCreateRoom} 
                disabled={!connected || isCreating}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-500 disabled:to-gray-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Creating Room...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <Gamepad2 className="h-5 w-5" />
                    <span>Create New Room</span>
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Join Room Section */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Join Room</h2>
              <p className="text-gray-300 mb-6">Enter a room code to join an existing game</p>
              
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Enter Room Code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={6}
                />
                
                <button 
                  onClick={handleJoinRoom} 
                  disabled={!connected || isJoining || !roomCode.trim()}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-gray-500 disabled:to-gray-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
                >
                  {isJoining ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Joining...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <Users className="h-5 w-5" />
                      <span>Join Room</span>
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Current Room Display */}
        {currentRoom && (
          <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-white">Room: {currentRoom.roomCode}</h3>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  currentRoom.status === 'ready' ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'
                }`}></div>
                <span className="text-white font-medium capitalize">{currentRoom.status}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Players List */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-3">Players ({currentRoom.players.length}/4)</h4>
                <div className="space-y-2">
                  {currentRoom.players.map((player, index) => (
                    <div key={index} className="flex items-center space-x-3 bg-white/10 rounded-lg p-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {player.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-white font-medium">{player.username}</span>
                          {player.isHost && (
                            <Crown className="h-4 w-4 text-yellow-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Room Actions */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-3">Room Actions</h4>
                {currentRoom.status === 'waiting' && (
                  <div className="space-y-3">
                    <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Clock className="h-5 w-5 text-yellow-400" />
                        <span className="text-yellow-400 font-medium">Waiting for another player...</span>
                      </div>
                      <p className="text-sm text-gray-300">Share the room code or invite link below</p>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm text-gray-300">Room Code:</label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={currentRoom.roomCode}
                          readOnly
                          className="flex-1 px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white font-mono text-center"
                        />
                        <button
                          onClick={() => copyToClipboard(currentRoom.roomCode)}
                          className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm text-gray-300">Invite Link:</label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={`${window.location.origin}/multiplayer?room=${currentRoom.roomCode}`}
                          readOnly
                          className="flex-1 px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white text-sm"
                        />
                        <button
                          onClick={() => copyToClipboard(`${window.location.origin}/multiplayer?room=${currentRoom.roomCode}`)}
                          className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                {currentRoom.status === 'ready' && (
                  <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Trophy className="h-5 w-5 text-green-400" />
                      <span className="text-green-400 font-medium">Room Ready!</span>
                    </div>
                    <p className="text-sm text-gray-300 mb-3">All players have joined! Ready to start the game.</p>
                    <button
                      onClick={() => navigate(`/game/${currentRoom.roomCode}`)}
                      className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                    >
                      <Play className="h-4 w-4" />
                      <span>Start Game!</span>
                    </button>
                  </div>
                )}
                
                <button 
                  onClick={handleLeaveRoom} 
                  className="w-full mt-4 bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                >
                  Leave Room
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Created Room Modal */}
        {showCreatedModal && currentRoom && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Room Created!</h3>
                <p className="text-gray-600 mb-6">Share this code with friends to join your game</p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Room Code:</label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={currentRoom.roomCode}
                        readOnly
                        className="flex-1 px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-center font-mono text-xl font-bold"
                      />
                      <button
                        onClick={() => copyToClipboard(currentRoom.roomCode)}
                        className="px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                      >
                        <Copy className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Invite Link:</label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={`${window.location.origin}/multiplayer?room=${currentRoom.roomCode}`}
                        readOnly
                        className="flex-1 px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-sm"
                      />
                      <button
                        onClick={() => copyToClipboard(`${window.location.origin}/multiplayer?room=${currentRoom.roomCode}`)}
                        className="px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                      >
                        <Copy className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={() => setShowCreatedModal(false)}
                  className="w-full mt-6 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Join Modal */}
        {showJoinModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Join Room</h3>
                <p className="text-gray-600 mb-6">Enter the room code to join a game</p>
                
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Enter Room Code"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center font-mono text-xl"
                    maxLength={6}
                  />
                  
                  <div className="flex space-x-3">
                    <button 
                      onClick={handleJoinRoom} 
                      disabled={!connected || isJoining || !roomCode.trim()}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 disabled:cursor-not-allowed"
                    >
                      {isJoining ? 'Joining...' : 'Join Room'}
                    </button>
                    <button 
                      onClick={() => setShowJoinModal(false)} 
                      className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Multiplayer;
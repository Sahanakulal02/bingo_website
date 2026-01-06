const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Game = require('../models/Game');

// Store active rooms in memory (no database needed)
const activeRooms = new Map();

// Generate unique 6-character room codes (A-Z, 0-9, excluding ambiguous characters)
const generateRoomCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded: O, 0, I, 1
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Ensure room code uniqueness
const getUniqueRoomCode = () => {
  let code;
  do {
    code = generateRoomCode();
  } while (activeRooms.has(code));
  return code;
};

const setupSocketIO = (io) => {
  // Middleware to authenticate socket connections
  io.use(async (socket, next) => {
    try {
      console.log('🔐 Socket authentication attempt:', {
        socketId: socket.id,
        auth: socket.handshake.auth,
        headers: socket.handshake.headers
      });
      
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        console.error('❌ No token provided for socket:', socket.id);
        return next(new Error('Authentication error: No token provided'));
      }

      console.log('🔑 Token found, verifying...');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ Token verified for user ID:', decoded.userId);
      
      const user = await User.findById(decoded.userId).select('_id username email role');
      
      if (!user) {
        console.error('❌ User not found for ID:', decoded.userId);
        return next(new Error('Authentication error: User not found'));
      }

      console.log('✅ User authenticated:', user.username);
      socket.user = user;
      next();
    } catch (error) {
      console.error('❌ Socket authentication error:', error);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ User ${socket.user.username} connected: ${socket.id}`);
    console.log(`📊 Total active connections: ${io.engine.clientsCount}`);
    console.log(`👥 Active users:`, Array.from(io.sockets.sockets.values()).map(s => s.user?.username));

    // Join user's active rooms
    socket.on('joinRooms', async () => {
      try {
        const activeGames = await Game.find({
          'players.user': socket.user._id,
          status: { $in: ['waiting', 'starting', 'active'] }
        });

        activeGames.forEach(game => {
          socket.join(game.roomCode);
          console.log(`User ${socket.user.username} joined room ${game.roomCode}`);
        });
      } catch (error) {
        console.error('Error joining rooms:', error);
      }
    });

    // Legacy join room handler (for database-based rooms) - commented out to avoid conflicts
    // socket.on('joinRoom', async (roomCode) => {
    //   // This handler conflicts with the new multiplayer system
    // });

    // Leave a room
    socket.on('leaveRoom', async (roomCode) => {
      try {
        socket.leave(roomCode);
        console.log(`User ${socket.user.username} left room ${roomCode}`);

        // Notify other players in the room
        socket.to(roomCode).emit('playerLeftRoom', {
          userId: socket.user._id,
          username: socket.user.username,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Error leaving room:', error);
        socket.emit('error', { message: 'Failed to leave room' });
      }
    });

    // Handle room creation (new multiplayer system)
    socket.on('createRoom', async (data) => {
      try {
        const { userId, username } = data;
        
        // Generate unique room code
        const roomCode = getUniqueRoomCode();
        
        // Create room object
        const room = {
          roomCode,
          players: [{
            userId: socket.user._id,
            username: socket.user.username,
            isHost: true,
            socketId: socket.id
          }],
          status: 'waiting',
          createdAt: new Date(),
          maxPlayers: 4,
          gameReady: false
        };
        
        // Store room
        activeRooms.set(roomCode, room);
        
        // Join socket to room
        socket.join(`room_${roomCode}`);
        
        // Emit room created event
        socket.emit('roomCreated', { roomCode });
        
        // Also emit room joined event for consistency
        socket.emit('roomJoined', {
          roomCode,
          players: room.players,
          status: room.status
        });
        
        // Send room update to all players in the room
        io.to(`room_${roomCode}`).emit('roomUpdate', {
          roomCode,
          players: room.players,
          status: room.status
        });
        
        console.log(`Room created: ${roomCode} by ${socket.user.username}`);
        
      } catch (error) {
        console.error('Create room error:', error);
        socket.emit('error', { message: 'Failed to create room' });
      }
    });

    // Handle room joining (new multiplayer system)
    socket.on('joinRoom', async (data) => {
      try {
        const { roomCode, userId, username } = data;
        
        console.log(`🔍 Join room request: ${socket.user.username} trying to join ${roomCode}`);
        
        // Check if room exists
        if (!activeRooms.has(roomCode)) {
          console.log(`❌ Room ${roomCode} not found`);
          socket.emit('error', { message: 'Room not found' });
          return;
        }
        
        const room = activeRooms.get(roomCode);
        
        // Allow up to 4 players for better flexibility
        if (room.players.length >= 4) {
          socket.emit('error', { message: 'Room is full (max 4 players)' });
          return;
        }
        
        // Check if user is already in the room - if so, just update their socket ID and send room info
        const existingPlayerIndex = room.players.findIndex(p => p.userId === socket.user._id);
        if (existingPlayerIndex !== -1) {
          console.log(`🔄 Player ${socket.user.username} is already in room ${roomCode}, updating socket ID`);
          
          // Update the existing player's socket ID
          room.players[existingPlayerIndex].socketId = socket.id;
          
          // Join socket to room
          socket.join(`room_${roomCode}`);
          
          // Send room joined event to the rejoining player
          socket.emit('roomJoined', {
            roomCode,
            players: room.players,
            status: room.status
          });
          
          // Send room update to all players in the room
          io.to(`room_${roomCode}`).emit('roomUpdate', {
            roomCode,
            players: room.players,
            status: room.status
          });
          
          // If the game is ready, send game ready event to the rejoining player
          if (room.status === 'ready' && room.gameReady) {
            socket.emit('gameReady', {
              roomCode,
              players: room.players,
              status: 'ready'
            });
            console.log(`✅ Sent gameReady to rejoining player ${socket.user.username}`);
          }
          
          console.log(`✅ Player ${socket.user.username} rejoined room ${roomCode}. Players: ${room.players.length}, Status: ${room.status}`);
          return;
        }
        
        // Add player to room
        room.players.push({
          userId: socket.user._id,
          username: socket.user.username,
          isHost: false,
          socketId: socket.id
        });
        
        console.log(`➕ Adding new player ${socket.user.username} to room ${roomCode}`);
        
        // Join socket to room
        socket.join(`room_${roomCode}`);
        
        // Emit room joined event to the joining player
        socket.emit('roomJoined', {
          roomCode,
          players: room.players,
          status: room.status
        });
        
        // Notify other players in the room
        socket.to(`room_${roomCode}`).emit('playerJoined', {
          roomCode,
          players: room.players,
          username: socket.user.username
        });
        
        // Also send updated room info to all players in the room
        io.to(`room_${roomCode}`).emit('roomUpdate', {
          roomCode,
          players: room.players,
          status: room.status
        });
        
        console.log(`📢 Room update sent to all players. Room: ${roomCode}, Players: ${room.players.length}, Status: ${room.status}`);
        
        console.log(`✅ Player ${socket.user.username} joined room ${roomCode}. Players: ${room.players.length}`);
        
        // Auto-start game when 2 or more players join
        if (room.players.length >= 2 && !room.gameReady) {
          room.gameReady = true;
          room.status = 'ready';
          
          console.log(`Setting game ready for room ${roomCode} with ${room.players.length} players`);
          
          // Send game ready event to all players
          io.to(`room_${roomCode}`).emit('gameReady', {
            roomCode,
            players: room.players,
            status: 'ready'
          });
          
          // Also send room update to ensure all players get the latest state
          io.to(`room_${roomCode}`).emit('roomUpdate', {
            roomCode,
            players: room.players,
            status: 'ready'
          });
          
          // Send multiple room updates to ensure delivery
          setTimeout(() => {
            io.to(`room_${roomCode}`).emit('roomUpdate', {
              roomCode,
              players: room.players,
              status: 'ready'
            });
            console.log(`Sent delayed roomUpdate to room ${roomCode}`);
          }, 1000);
            
          // Send individual gameReady events to each player to ensure delivery
          room.players.forEach(player => {
            const playerSocket = io.sockets.sockets.get(player.socketId);
            if (playerSocket) {
              playerSocket.emit('gameReady', {
                roomCode,
                players: room.players,
                status: 'ready'
              });
              console.log(`Sent gameReady to player ${player.username} (${player.socketId})`);
            }
          });
          
          // Also send a delayed gameReady event to ensure delivery
          setTimeout(() => {
            io.to(`room_${roomCode}`).emit('gameReady', {
              roomCode,
              players: room.players,
              status: 'ready'
            });
            console.log(`Sent delayed gameReady to room ${roomCode}`);
          }, 500);
          
          console.log(`Game ready events sent to room ${roomCode} - ${room.players.length} players joined`);
        }
        
      } catch (error) {
        console.error('Join room error:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Handle starting game (new multiplayer system)
    socket.on('startGame', async (data) => {
      try {
        const { roomCode } = data;
        
        console.log(`🎮 Start game request from ${socket.user.username} for room ${roomCode}`);
        
        if (!activeRooms.has(roomCode)) {
          console.log(`❌ Room ${roomCode} not found for start game`);
          socket.emit('error', { message: 'Room not found' });
          return;
        }
        
        const room = activeRooms.get(roomCode);
        
        // Check if user is host
        const player = room.players.find(p => p.userId === socket.user._id);
        if (!player || !player.isHost) {
          console.log(`❌ ${socket.user.username} is not the host, cannot start game`);
          socket.emit('error', { message: 'Only the host can start the game' });
          return;
        }
        
        // Check if enough players
        if (room.players.length < 2) {
          console.log(`❌ Not enough players to start game: ${room.players.length}`);
          socket.emit('error', { message: 'Need at least 2 players to start' });
          return;
        }
        
        // Check if game has already been started
        if (room.gameStarted && room.status === 'active') {
          console.log(`❌ Game already started in room ${roomCode}, sending gameStarted event to sync UI`);
          // Resend the gameStarted event to ensure frontend is synced
          socket.emit('gameStarted', {
            roomCode,
            players: room.players,
            status: 'active'
          });
          return;
        }
        
        // Check if game is ready
        if (room.status !== 'ready') {
          console.log(`❌ Game not ready to start, current status: ${room.status}`);
          console.log(`Room details:`, { 
            roomCode, 
            status: room.status, 
            gameReady: room.gameReady, 
            players: room.players.length,
            gameStarted: room.gameStarted
          });
          socket.emit('error', { message: `Game is not ready to start. Current status: ${room.status}` });
          return;
        }
        
        // Update room status
        room.status = 'active';
        room.gameStarted = true;
        
        console.log(`✅ Starting game in room ${roomCode} with ${room.players.length} players`);
        
        // Notify all players in the room
        io.to(`room_${roomCode}`).emit('gameStarted', {
          roomCode,
          players: room.players,
          status: 'active'
        });
        
        console.log(`🎮 Game started successfully in room ${roomCode}`);
        
      } catch (error) {
        console.error('Start game error:', error);
        socket.emit('error', { message: 'Failed to start game' });
      }
    });

    // Handle player ready status
    socket.on('setReady', async (data) => {
      try {
        const { roomCode, isReady } = data;
        
        const game = await Game.findOne({ roomCode: roomCode.toUpperCase() });
        
        if (!game) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        if (!game.players.some(p => p.user.toString() === socket.user._id.toString())) {
          socket.emit('error', { message: 'You are not in this room' });
          return;
        }

        // Update player ready status
        await game.setPlayerReady(socket.user._id, isReady);

        // Emit to all players in the room
        io.to(roomCode).emit('playerReadyStatusChanged', {
          userId: socket.user._id,
          username: socket.user.username,
          isReady,
          allPlayersReady: game.allPlayersReady(),
          playerCount: game.players.length
        });

        console.log(`Player ${socket.user.username} ${isReady ? 'ready' : 'not ready'} in room ${roomCode}`);

      } catch (error) {
        console.error('Error setting ready status:', error);
        socket.emit('error', { message: 'Failed to set ready status' });
      }
    });

    // Legacy start game handler (for database-based games) - commented out to avoid conflicts
    // socket.on('startGame', async (roomCode) => {
    //   // This handler conflicts with the new multiplayer system
    // });

    // Handle number calling (new multiplayer system)
    socket.on('callNumber', async (data) => {
      try {
        const { roomCode, number } = data;
        
        console.log(`🔢 Number call request: ${socket.user.username} calling ${number} in room ${roomCode}`);
        
        if (!number || number < 1 || number > 25) {
          socket.emit('error', { message: 'Invalid number (must be 1-25)' });
          return;
        }

        // Check if room exists in memory
        if (!activeRooms.has(roomCode)) {
          console.log(`❌ Room ${roomCode} not found for number call`);
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        const room = activeRooms.get(roomCode);

        if (room.status !== 'active') {
          console.log(`❌ Game not active, current status: ${room.status}`);
          socket.emit('error', { message: 'Game is not active' });
          return;
        }

        // Check if user is in the room
        const player = room.players.find(p => p.userId === socket.user._id);
        if (!player) {
          console.log(`❌ User ${socket.user.username} not in room ${roomCode}`);
          socket.emit('error', { message: 'You are not in this game' });
          return;
        }

        // Initialize called numbers if not exists
        if (!room.calledNumbers) {
          room.calledNumbers = [];
        }

        // Check if number already called
        if (room.calledNumbers.includes(number)) {
          socket.emit('error', { message: 'Number already called' });
          return;
        }

        // Add called number
        room.calledNumbers.push(number);

        console.log(`✅ Number ${number} called by ${socket.user.username} in room ${roomCode}`);

        // Emit to all players in the room
        io.to(`room_${roomCode}`).emit('numberCalled', {
          roomCode,
          number,
          calledBy: socket.user._id,
          calledByUsername: socket.user.username,
          calledAt: new Date(),
          totalCalled: room.calledNumbers.length
        });

        // Switch turns - rotate through all players
        const currentPlayerIndex = room.players.findIndex(p => p.userId === socket.user._id);
        const nextPlayerIndex = (currentPlayerIndex + 1) % room.players.length;
        const nextPlayer = room.players[nextPlayerIndex];

        // Emit turn switch to all players
        io.to(`room_${roomCode}`).emit('turnSwitched', {
          roomCode,
          currentPlayer: socket.user._id,
          currentPlayerUsername: socket.user.username,
          nextPlayer: nextPlayer.userId,
          nextPlayerUsername: nextPlayer.username
        });

        console.log(`📢 Number called event sent to room ${roomCode}`);
        console.log(`🔄 Turn switched: ${socket.user.username} -> ${nextPlayer.username}`);

      } catch (error) {
        console.error('Error calling number:', error);
        socket.emit('error', { message: 'Failed to call number' });
      }
    });

    // Handle win check (new multiplayer system)
    socket.on('checkWin', async (data) => {
      try {
        const { roomCode, board } = data;
        
        console.log(`🏆 Win check request: ${socket.user.username} in room ${roomCode}`);
        
        if (!board || !Array.isArray(board)) {
          socket.emit('error', { message: 'Invalid board data' });
          return;
        }

        // Check if room exists in memory
        if (!activeRooms.has(roomCode)) {
          console.log(`❌ Room ${roomCode} not found for win check`);
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        const room = activeRooms.get(roomCode);

        if (room.status !== 'active') {
          console.log(`❌ Game not active, current status: ${room.status}`);
          socket.emit('error', { message: 'Game is not active' });
          return;
        }

        // Check if user is in the room
        const player = room.players.find(p => p.userId === socket.user._id);
        if (!player) {
          console.log(`❌ User ${socket.user.username} not in room ${roomCode}`);
          socket.emit('error', { message: 'You are not in this game' });
          return;
        }

        // Get called numbers from room
        const calledNumbers = room.calledNumbers || [];

        // Check win condition (5 lines completed)
        const isWinner = checkWinCondition(board, calledNumbers);

        if (isWinner) {
          // End the game
          room.status = 'completed';
          room.winner = socket.user._id;
          room.completedAt = new Date();

          console.log(`🎉 Game completed in room ${roomCode}. Winner: ${socket.user.username}`);

          // Emit game completed to all players
          io.to(`room_${roomCode}`).emit('gameCompleted', {
            roomCode,
            winner: socket.user._id,
            winnerUsername: socket.user.username,
            completedAt: room.completedAt
          });

          console.log(`📢 Game completed event sent to room ${roomCode}`);
        } else {
          // Notify that no win yet
          socket.emit('winCheckResult', {
            isWinner: false,
            message: 'No win yet, keep playing!'
          });
        }

      } catch (error) {
        console.error('Error checking win:', error);
        socket.emit('error', { message: 'Failed to check win condition' });
      }
    });

    // Handle chat messages
    socket.on('sendMessage', async (data) => {
      try {
        const { roomCode, message } = data;
        
        if (!message || message.trim().length === 0) {
          return;
        }

        const game = await Game.findOne({ roomCode: roomCode.toUpperCase() });
        
        if (!game) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        if (!game.players.some(p => p.user.toString() === socket.user._id.toString())) {
          socket.emit('error', { message: 'You are not in this room' });
          return;
        }

        // Emit message to all players in the room
        io.to(roomCode).emit('newMessage', {
          roomCode,
          userId: socket.user._id,
          username: socket.user.username,
          message: message.trim(),
          timestamp: new Date()
        });

      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle room settings update (host only)
    socket.on('updateRoomSettings', async (data) => {
      try {
        const { roomCode, settings } = data;
        
        const game = await Game.findOne({ roomCode: roomCode.toUpperCase() });
        
        if (!game) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        const player = game.players.find(p => p.user.toString() === socket.user._id.toString());
        if (!player || !player.isHost) {
          socket.emit('error', { message: 'Only the host can update room settings' });
          return;
        }

        // Update game settings
        if (settings.maxPlayers && settings.maxPlayers >= game.players.length && settings.maxPlayers <= 8) {
          game.maxPlayers = settings.maxPlayers;
        }

        if (settings.gameSettings) {
          game.gameSettings = { ...game.gameSettings, ...settings.gameSettings };
        }

        await game.save();

        // Emit settings updated to all players
        io.to(roomCode).emit('roomSettingsUpdated', {
          roomCode,
          settings: game.gameSettings,
          maxPlayers: game.maxPlayers,
          updatedBy: socket.user.username
        });

        console.log(`Room settings updated in ${roomCode} by ${socket.user.username}`);

      } catch (error) {
        console.error('Error updating room settings:', error);
        socket.emit('error', { message: 'Failed to update room settings' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`❌ User ${socket.user.username} disconnected: ${socket.id}`);
      console.log(`📊 Total active connections: ${io.engine.clientsCount}`);
      console.log(`👥 Remaining users:`, Array.from(io.sockets.sockets.values()).map(s => s.user?.username));
      
      // Clean up rooms for disconnected user
      for (const [roomCode, room] of activeRooms.entries()) {
        const playerIndex = room.players.findIndex(p => p.userId === socket.user._id);
        if (playerIndex !== -1) {
          const leavingPlayer = room.players[playerIndex];
          room.players.splice(playerIndex, 1);
          
          // If room is empty, delete it
          if (room.players.length === 0) {
            activeRooms.delete(roomCode);
            console.log(`Room ${roomCode} deleted (user disconnected)`);
          } else {
            // If host left, assign new host
            if (leavingPlayer.isHost && room.players.length > 0) {
              room.players[0].isHost = true;
            }
            
            // Notify remaining players
            io.to(`room_${roomCode}`).emit('playerLeft', {
              roomCode,
              players: room.players,
              username: leavingPlayer.username
            });
          }
          
          console.log(`Player ${leavingPlayer.username} disconnected from room ${roomCode}`);
        }
      }
      
      // Leave all rooms
      socket.rooms.forEach(room => {
        if (room !== socket.id) {
          socket.to(room).emit('playerDisconnected', {
            userId: socket.user._id,
            username: socket.user.username,
            timestamp: new Date()
          });
        }
      });
    });
  });

  // Helper function to check win condition (5 lines completed)
  function checkWinCondition(board, calledNumbers) {
    let completedLines = 0;
    
    // Check rows
    for (let i = 0; i < 5; i++) {
      if (board[i].every(num => calledNumbers.includes(num))) {
        completedLines++;
      }
    }
    
    // Check columns
    for (let j = 0; j < 5; j++) {
      if (board.every(row => calledNumbers.includes(row[j]))) {
        completedLines++;
      }
    }
    
    // Check main diagonal
    if ((calledNumbers.includes(board[0][0])) &&
        (calledNumbers.includes(board[1][1])) &&
        (calledNumbers.includes(board[2][2])) &&
        (calledNumbers.includes(board[3][3])) &&
        (calledNumbers.includes(board[4][4]))) {
      completedLines++;
    }
    
    // Check anti-diagonal
    if ((calledNumbers.includes(board[0][4])) &&
        (calledNumbers.includes(board[1][3])) &&
        (calledNumbers.includes(board[2][2])) &&
        (calledNumbers.includes(board[3][1])) &&
        (calledNumbers.includes(board[4][0]))) {
      completedLines++;
    }
    
    return completedLines >= 5;
  }



  return io;
};

module.exports = setupSocketIO;

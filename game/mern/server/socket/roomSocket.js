const jwt = require('jsonwebtoken');

// Store active rooms in memory
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

const handleRoomSocketConnection = (io) => {
  console.log('🚀 Initializing room socket functionality...');
  
  // Store connected users
  const connectedUsers = new Map();

  // No authentication required for testing - allow all connections
  io.use((socket, next) => {
    // Generate a unique user ID for each connection
    socket.userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🔓 New connection allowed: ${socket.userId}`);
    next();
  });

  io.on('connection', async (socket) => {
    console.log(`👤 User connected: ${socket.userId}`);
    
    // Store user connection
    connectedUsers.set(socket.userId, socket.id);
    
    // Join user's personal room for notifications
    socket.join(`user_${socket.userId}`);

    // Handle room creation
    socket.on('createRoom', (data) => {
      try {
        const { userId, username } = data;
        console.log(`🏠 Creating room for user: ${username} (${userId})`);
        
        // Generate unique room code
        const roomCode = getUniqueRoomCode();
        
        // Create room object
        const room = {
          roomCode,
          players: [{
            userId,
            username,
            isHost: true
          }],
          status: 'waiting',
          createdAt: new Date(),
          maxPlayers: 2
        };
        
        // Store room
        activeRooms.set(roomCode, room);
        
        // Join socket to room
        socket.join(`room_${roomCode}`);
        
        // Emit room created event
        socket.emit('roomCreated', { roomCode });
        
        console.log(`✅ Room created: ${roomCode} by ${username}`);
        console.log(`📊 Active rooms: ${activeRooms.size}`);
        
      } catch (error) {
        console.error('❌ Create room error:', error);
        socket.emit('error', { message: 'Failed to create room' });
      }
    });

    // Handle room joining
    socket.on('joinRoom', (data) => {
      try {
        const { roomCode, userId, username } = data;
        console.log(`🚪 User ${username} attempting to join room: ${roomCode}`);
        
        // Check if room exists
        if (!activeRooms.has(roomCode)) {
          console.log(`❌ Room ${roomCode} not found`);
          socket.emit('error', { message: 'Room not found' });
          return;
        }
        
        const room = activeRooms.get(roomCode);
        console.log(`📋 Room ${roomCode} found with ${room.players.length} players`);
        
        // Check if room is full
        if (room.players.length >= room.maxPlayers) {
          console.log(`❌ Room ${roomCode} is full`);
          socket.emit('error', { message: 'Room is full' });
          return;
        }
        
        // Check if user is already in the room
        if (room.players.some(p => p.userId === userId)) {
          console.log(`❌ User ${username} is already in room ${roomCode}`);
          socket.emit('error', { message: 'You are already in this room' });
          return;
        }
        
        // Add player to room
        room.players.push({
          userId,
          username,
          isHost: false
        });
        
        // Join socket to room
        socket.join(`room_${roomCode}`);
        
        console.log(`✅ Player ${username} joined room ${roomCode}`);
        console.log(`📊 Room ${roomCode} now has ${room.players.length} players`);
        
        // Emit room joined event to the joining player
        socket.emit('roomJoined', {
          roomCode,
          players: room.players,
          status: room.status
        });
        
        // Emit roomJoined to ALL players in the room (including existing ones)
        io.to(`room_${roomCode}`).emit('roomJoined', {
          roomCode,
          players: room.players,
          status: room.status
        });
        
        // Check if room is ready (2 players) and emit roomReady
        if (room.players.length === 2) {
          console.log(`🎯 Room ${roomCode} is ready with 2 players!`);
          room.status = 'ready';
          
          // Emit roomReady to all players in the room
          io.to(`room_${roomCode}`).emit('roomReady', {
            roomCode,
            players: room.players
          });
          
          // Auto-start the game after a short delay
          setTimeout(() => {
            console.log(`🎮 Auto-starting game in room ${roomCode}`);
            room.status = 'starting';
            io.to(`room_${roomCode}`).emit('gameStarted', {
              roomCode,
              players: room.players
            });
          }, 1000); // Start game 1 second after roomReady
        }
        
      } catch (error) {
        console.error('❌ Join room error:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Handle leaving room
    socket.on('leaveRoom', (data) => {
      try {
        const { roomCode } = data;
        console.log(`🚪 User ${socket.userId} leaving room: ${roomCode}`);
        
        if (!activeRooms.has(roomCode)) {
          console.log(`❌ Room ${roomCode} not found for leave operation`);
          return;
        }
        
        const room = activeRooms.get(roomCode);
        
        // Find and remove the player
        const playerIndex = room.players.findIndex(p => p.userId === socket.userId);
        if (playerIndex === -1) {
          console.log(`❌ User ${socket.userId} not found in room ${roomCode}`);
          return;
        }
        
        const leavingPlayer = room.players[playerIndex];
        room.players.splice(playerIndex, 1);
        
        // Leave socket room
        socket.leave(`room_${roomCode}`);
        
        console.log(`👋 Player ${leavingPlayer.username} left room ${roomCode}`);
        
        // If room is empty, delete it
        if (room.players.length === 0) {
          activeRooms.delete(roomCode);
          console.log(`🗑️ Room ${roomCode} deleted (empty)`);
        } else {
          // If host left, assign new host
          if (leavingPlayer.isHost && room.players.length > 0) {
            room.players[0].isHost = true;
            console.log(`👑 New host assigned: ${room.players[0].username}`);
          }
          
          // Update room status back to waiting if less than 2 players
          if (room.players.length < 2) {
            room.status = 'waiting';
            console.log(`⏳ Room ${roomCode} status set to waiting`);
          }
          
          // Notify remaining players with roomUpdate
          io.to(`room_${roomCode}`).emit('roomUpdate', {
            roomCode,
            players: room.players,
            status: room.status,
            message: `${leavingPlayer.username} left the room`
          });
          
          console.log(`📢 Notified remaining players in room ${roomCode}`);
        }
        
      } catch (error) {
        console.error('❌ Leave room error:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`👤 User disconnected: ${socket.userId}`);
      
      // Remove user from connected users
      connectedUsers.delete(socket.userId);
      
      // Remove user from all rooms they might be in
      for (const [roomCode, room] of activeRooms.entries()) {
        const playerIndex = room.players.findIndex(p => p.userId === socket.userId);
        if (playerIndex !== -1) {
          const leavingPlayer = room.players[playerIndex];
          room.players.splice(playerIndex, 1);
          
          console.log(`👋 Player ${leavingPlayer.username} disconnected from room ${roomCode}`);
          
          // If room is empty, delete it
          if (room.players.length === 0) {
            activeRooms.delete(roomCode);
            console.log(`🗑️ Room ${roomCode} deleted (user disconnected)`);
          } else {
            // If host left, assign new host
            if (leavingPlayer.isHost && room.players.length > 0) {
              room.players[0].isHost = true;
              console.log(`👑 New host assigned: ${room.players[0].username}`);
            }
            
            // Update room status back to waiting if less than 2 players
            if (room.players.length < 2) {
              room.status = 'waiting';
              console.log(`⏳ Room ${roomCode} status set to waiting`);
            }
            
            // Notify remaining players with roomUpdate
            io.to(`room_${roomCode}`).emit('roomUpdate', {
              roomCode,
              players: room.players,
              status: room.status,
              message: `${leavingPlayer.username} disconnected from the room`
            });
            
            console.log(`📢 Notified remaining players in room ${roomCode}`);
          }
        }
      }
    });
  });
  
  console.log('✅ Room socket functionality initialized');
};

module.exports = { handleRoomSocketConnection };
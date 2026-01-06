const { handleRoomSocketConnection } = require('./roomSocket');

const handleSocketConnection = (io) => {
  console.log('🔌 Initializing main socket connection handler...');
  
  // Initialize room socket functionality first
  handleRoomSocketConnection(io);
  
  // Store connected users for game functionality
  const connectedUsers = new Map();

  // Handle game-specific events
  io.on('connection', async (socket) => {
    // Generate a unique user ID for each connection
    socket.userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`👤 User connected: ${socket.userId}`);
    
    // Store user connection
    connectedUsers.set(socket.userId, socket.id);
    
    // Join user's personal room for notifications
    socket.join(`user_${socket.userId}`);

    // Handle game join (for existing game functionality)
    socket.on('join-game', async (gameId) => {
      try {
        // For now, just acknowledge the join
        socket.join(`game_${gameId}`);
        socket.emit('game-joined', { gameId });
        
        console.log(`User ${socket.userId} joined game ${gameId}`);
      } catch (error) {
        console.error('Join game error:', error);
        socket.emit('error', { message: 'Server error' });
      }
    });

    // Handle game move (calling a number)
    socket.on('call-number', async (data) => {
      try {
        const { gameId, number } = data;
        
        // For now, just broadcast the move
        socket.to(`game_${gameId}`).emit('number-called', {
          number,
          calledBy: socket.userId
        });
        
        console.log(`Number ${number} called in game ${gameId} by ${socket.userId}`);
      } catch (error) {
        console.error('Call number error:', error);
        socket.emit('error', { message: 'Server error' });
      }
    });

    // Handle game invitation
    socket.on('send-invitation', async (data) => {
      try {
        const { opponentId, gameId } = data;
        
        // Check if opponent is online
        const opponentSocketId = connectedUsers.get(opponentId);
        if (opponentSocketId) {
          io.to(opponentSocketId).emit('game-invitation', {
            gameId,
            from: socket.userId
          });
        }
      } catch (error) {
        console.error('Send invitation error:', error);
        socket.emit('error', { message: 'Server error' });
      }
    });

    // Handle invitation response
    socket.on('invitation-response', async (data) => {
      try {
        const { gameId, accepted } = data;
        
        if (accepted) {
          // Notify both players
          io.to(`game_${gameId}`).emit('game-started', { gameId });
        } else {
          // Notify creator
          const creatorSocketId = connectedUsers.get(gameId);
          if (creatorSocketId) {
            io.to(creatorSocketId).emit('invitation-declined', { gameId });
          }
        }
      } catch (error) {
        console.error('Invitation response error:', error);
        socket.emit('error', { message: 'Server error' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
      connectedUsers.delete(socket.userId);
    });
  });

  console.log('✅ Main socket connection handler initialized');
};

module.exports = { handleSocketConnection };

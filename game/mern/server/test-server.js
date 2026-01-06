const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Simple socket connection without authentication
io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);
  
  socket.on('createRoom', (data) => {
    console.log('🏠 Create room request:', data);
    const roomCode = 'TEST123';
    socket.emit('roomCreated', { roomCode });
  });
  
  socket.on('joinRoom', (data) => {
    console.log('🚪 Join room request:', data);
    socket.emit('roomJoined', { 
      roomCode: data.roomCode, 
      players: [
        { userId: 'user1', username: 'Player1', isHost: true },
        { userId: 'user2', username: 'Player2', isHost: false }
      ],
      status: 'ready'
    });
    
    // Auto-start game
    setTimeout(() => {
      socket.emit('roomReady', { 
        roomCode: data.roomCode,
        players: [
          { userId: 'user1', username: 'Player1', isHost: true },
          { userId: 'user2', username: 'Player2', isHost: false }
        ]
      });
      
      setTimeout(() => {
        socket.emit('gameStarted', { 
          roomCode: data.roomCode,
          players: [
            { userId: 'user1', username: 'Player1', isHost: true },
            { userId: 'user2', username: 'Player2', isHost: false }
          ]
        });
      }, 500);
    }, 100);
  });
  
  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

const PORT = 5000;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`🚀 Test server running on ${HOST}:${PORT}`);
  console.log('✅ Socket.IO server ready for connections');
});

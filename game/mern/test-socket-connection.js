const io = require('socket.io-client');

console.log('🧪 Testing Socket.IO connection to server...');

// Connect to the server
const socket = io('http://localhost:5000', {
  transports: ['polling', 'websocket'],
  timeout: 10000,
  forceNew: true
});

socket.on('connect', () => {
  console.log('✅ SUCCESS: Connected to Socket.IO server!');
  console.log('🔌 Socket ID:', socket.id);
  
  // Test creating a room
  console.log('🏠 Testing room creation...');
  socket.emit('createRoom', {
    userId: 'test_user_1',
    username: 'TestUser1'
  });
});

socket.on('roomCreated', (data) => {
  console.log('✅ Room created successfully:', data);
  
  // Test joining the room with another user
  console.log('🚪 Testing room joining...');
  const testSocket2 = io('http://localhost:5000', {
    transports: ['polling', 'websocket'],
    timeout: 10000,
    forceNew: true
  });
  
  testSocket2.on('connect', () => {
    console.log('✅ Second socket connected:', testSocket2.id);
    testSocket2.emit('joinRoom', {
      roomCode: data.roomCode,
      userId: 'test_user_2',
      username: 'TestUser2'
    });
  });
  
  testSocket2.on('roomJoined', (joinData) => {
    console.log('✅ Room joined successfully:', joinData);
  });
  
  testSocket2.on('roomReady', (readyData) => {
    console.log('🎯 Room is ready:', readyData);
  });
  
  testSocket2.on('gameStarted', (gameData) => {
    console.log('🎮 Game started:', gameData);
    console.log('✅ All tests passed! Socket.IO is working correctly.');
    
    // Clean up
    setTimeout(() => {
      socket.close();
      testSocket2.close();
      process.exit(0);
    }, 1000);
  });
  
  testSocket2.on('error', (error) => {
    console.error('❌ Second socket error:', error);
  });
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
  process.exit(1);
});

socket.on('error', (error) => {
  console.error('❌ Socket error:', error);
});

socket.on('disconnect', () => {
  console.log('🔌 Disconnected from server');
});

// Timeout after 15 seconds
setTimeout(() => {
  console.log('⏰ Timeout - connection test failed');
  socket.close();
  process.exit(1);
}, 15000);

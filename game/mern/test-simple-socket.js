const io = require('socket.io-client');

// Test socket connection without authentication
async function testSimpleSocket() {
  console.log('🧪 Testing simple Socket.IO connection...');
  
  // Create a socket connection without auth token
  const socket = io('http://localhost:5000', {
    transports: ['websocket', 'polling'],
    timeout: 5000
  });

  socket.on('connect', () => {
    console.log('✅ Connected to server successfully!');
    
    // Test room creation
    console.log('🏠 Testing room creation...');
    socket.emit('createRoom', {
      userId: 'test-user-1',
      username: 'TestUser1'
    });
  });

  socket.on('roomCreated', (data) => {
    console.log('✅ Room created successfully:', data);
    
    // Test room joining with another socket
    testJoinRoom(data.roomCode);
  });

  socket.on('connect_error', (error) => {
    console.log('❌ Connection error:', error.message);
  });

  socket.on('error', (error) => {
    console.log('❌ Socket error:', error);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Disconnected from server');
  });

  // Clean up after 10 seconds
  setTimeout(() => {
    console.log('🧹 Cleaning up test...');
    socket.close();
    process.exit(0);
  }, 10000);
}

// Test joining a room with a second socket
function testJoinRoom(roomCode) {
  console.log(`🚪 Testing room join for room: ${roomCode}`);
  
  const socket2 = io('http://localhost:5000', {
    transports: ['websocket', 'polling'],
    timeout: 5000
  });

  socket2.on('connect', () => {
    console.log('✅ Second socket connected');
    
    socket2.emit('joinRoom', {
      roomCode: roomCode,
      userId: 'test-user-2',
      username: 'TestUser2'
    });
  });

  socket2.on('roomJoined', (data) => {
    console.log('✅ Second user joined room:', data);
  });

  socket2.on('roomReady', (data) => {
    console.log('🎯 Room is ready:', data);
  });

  socket2.on('gameStarted', (data) => {
    console.log('🎮 Game started automatically:', data);
    console.log('✅ SUCCESS: Game auto-started when 2nd player joined!');
  });

  socket2.on('error', (error) => {
    console.log('❌ Second socket error:', error);
  });
}

testSimpleSocket().catch(console.error);

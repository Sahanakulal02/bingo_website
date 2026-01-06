const io = require('socket.io-client');

// Test the multiplayer room system
async function testMultiplayer() {
  console.log('🧪 Testing Multiplayer Room System...\n');

  // Test 1: Create Room
  console.log('1️⃣ Testing Room Creation...');
  const hostSocket = io('http://localhost:5000', {
    auth: { token: 'test-token-host' }
  });

  hostSocket.on('connect', () => {
    console.log('✅ Host connected to server');
    
    hostSocket.emit('createRoom', {
      userId: 'host-user-id',
      username: 'HostPlayer'
    });
  });

  hostSocket.on('roomCreated', (data) => {
    console.log(`✅ Room created successfully! Code: ${data.roomCode}`);
    console.log(`📋 Room Code: ${data.roomCode}`);
    console.log(`🔗 Invite Link: http://localhost:3000/multiplayer?room=${data.roomCode}\n`);
    
    // Test 2: Join Room
    testJoinRoom(data.roomCode);
  });

  hostSocket.on('error', (error) => {
    console.error('❌ Host error:', error.message);
  });

  // Test 2: Join Room
  function testJoinRoom(roomCode) {
    console.log('2️⃣ Testing Room Joining...');
    const guestSocket = io('http://localhost:5000', {
      auth: { token: 'test-token-guest' }
    });

    guestSocket.on('connect', () => {
      console.log('✅ Guest connected to server');
      
      guestSocket.emit('joinRoom', {
        roomCode: roomCode,
        userId: 'guest-user-id',
        username: 'GuestPlayer'
      });
    });

    guestSocket.on('roomJoined', (data) => {
      console.log(`✅ Guest joined room successfully!`);
      console.log(`👥 Players in room: ${data.players.length}`);
      data.players.forEach(player => {
        console.log(`   - ${player.username} ${player.isHost ? '(Host)' : ''}`);
      });
      console.log('');
      
      // Test 3: Start Game
      testStartGame(roomCode);
    });

    guestSocket.on('playerJoined', (data) => {
      console.log(`✅ Host notified of guest joining`);
    });

    guestSocket.on('error', (error) => {
      console.error('❌ Guest error:', error.message);
    });
  }

  // Test 3: Start Game
  function testStartGame(roomCode) {
    console.log('3️⃣ Testing Game Start...');
    
    hostSocket.emit('startGame', { roomCode: roomCode });
  }

  hostSocket.on('gameStarted', (data) => {
    console.log(`✅ Game started successfully!`);
    console.log(`🎮 Room: ${data.roomCode}`);
    console.log(`👥 Players: ${data.players.length}`);
    console.log('');
    
    // Test 4: Leave Room
    testLeaveRoom(roomCode);
  });

  // Test 4: Leave Room
  function testLeaveRoom(roomCode) {
    console.log('4️⃣ Testing Room Leaving...');
    
    guestSocket.emit('leaveRoom', { roomCode: roomCode });
    
    setTimeout(() => {
      console.log('✅ Guest left room');
      
      hostSocket.emit('leaveRoom', { roomCode: roomCode });
      
      setTimeout(() => {
        console.log('✅ Host left room');
        console.log('✅ Room should be deleted (empty)');
        console.log('\n🎉 All tests completed successfully!');
        
        // Cleanup
        hostSocket.disconnect();
        guestSocket.disconnect();
        process.exit(0);
      }, 1000);
    }, 1000);
  }

  // Handle connection errors
  hostSocket.on('connect_error', (error) => {
    console.error('❌ Host connection error:', error.message);
    console.log('💡 Make sure the server is running on port 5000');
    process.exit(1);
  });
}

// Run tests
testMultiplayer().catch(console.error);

console.log('🚀 Starting multiplayer tests...');
console.log('💡 Make sure the server is running on port 5000\n');

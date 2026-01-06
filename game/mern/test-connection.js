// Test script to debug socket connection issues
const io = require('socket.io-client');

// Test multiple connections
async function testConnections() {
  console.log('🧪 Testing multiple socket connections...');
  
  const connections = [];
  const maxConnections = 3;
  
  for (let i = 0; i < maxConnections; i++) {
    try {
      console.log(`\n🔌 Attempting connection ${i + 1}...`);
      
      const socket = io('http://localhost:5000', {
        transports: ['polling', 'websocket'],
        timeout: 10000,
        forceNew: true,
        auth: { token: `test_token_${i}` }
      });
      
      socket.on('connect', () => {
        console.log(`✅ Connection ${i + 1} successful - Socket ID: ${socket.id}`);
        connections.push(socket);
      });
      
      socket.on('connect_error', (error) => {
        console.log(`❌ Connection ${i + 1} failed:`, error.message);
      });
      
      socket.on('disconnect', () => {
        console.log(`❌ Connection ${i + 1} disconnected`);
      });
      
      // Wait a bit between connections
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Error creating connection ${i + 1}:`, error);
    }
  }
  
  // Wait for all connections to establish
  setTimeout(() => {
    console.log(`\n📊 Test completed. Successful connections: ${connections.length}/${maxConnections}`);
    
    // Test server endpoint
    fetch('http://localhost:5000/socket-test')
      .then(res => res.json())
      .then(data => {
        console.log('🔍 Server status:', data);
      })
      .catch(err => {
        console.error('❌ Failed to fetch server status:', err.message);
      });
    
    // Clean up connections
    connections.forEach(socket => {
      socket.disconnect();
    });
    
    process.exit(0);
  }, 5000);
}

// Run the test
testConnections().catch(console.error);

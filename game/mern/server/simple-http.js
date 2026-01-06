const express = require('express');
const app = express();

app.use(express.json());

// Simple test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working!', timestamp: new Date().toISOString() });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

const PORT = 5000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`🚀 Simple HTTP server running on ${HOST}:${PORT}`);
  console.log(`✅ Test endpoint: http://${HOST}:${PORT}/test`);
  console.log(`✅ Health check: http://${HOST}:${PORT}/health`);
});

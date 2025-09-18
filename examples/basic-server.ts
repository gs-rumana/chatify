// examples/basic-server.ts
import { Chatify } from '../src/index.js';

// Create a new chat instance
const chat = new Chatify(undefined, {
  enableTypingIndicator: true,
  enableOnlineStatus: true,
  enableMessageDelivery: true,
  enableGroups: true,
  typingTimeout: 3000,
  messageHistory: true,
  maxMessageHistory: 500,
  rateLimiting: {
    enabled: true,
    maxMessages: 20,
    timeWindow: 60000 // 1 minute
  }
});

// Start the server
async function startServer() {
  try {
    await chat.initialize(3000);
    console.log('🚀 Chat server started on port 3000');

    // Broadcast a welcome message every hour
    setInterval(() => {
      chat.broadcastSystemMessage('Welcome to our chat! 👋');
    }, 3600000);

  } catch (error) {
    console.error('Failed to start server:', error);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down chat server...');
  await chat.close();
  process.exit(0);
});

startServer();

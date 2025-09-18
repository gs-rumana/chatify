// examples/auth-server.ts
import { Chatify } from '../src/index.js';
import jwt from 'jsonwebtoken';

// Mock user database
const users = new Map([
  ['user1', { id: 'user1', username: 'Alice', avatar: 'https://example.com/alice.jpg' }],
  ['user2', { id: 'user2', username: 'Bob', avatar: 'https://example.com/bob.jpg' }],
  ['user3', { id: 'user3', username: 'Charlie', avatar: 'https://example.com/charlie.jpg' }]
]);

// JWT secret (use environment variable in production)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Authentication configuration
const authConfig = {
  secret: JWT_SECRET,
  verifyToken: async (token: string) => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      const user = users.get(decoded.userId);

      if (user) {
        return {
          ...user,
          isOnline: false, // Will be set to true after authentication
          lastSeen: new Date()
        };
      }

      return null;
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  },
  onAuthSuccess: (user: any, socket: any) => {
    console.log(`✅ User ${user.username} authenticated successfully`);
  },
  onAuthFailure: (error: Error, socket: any) => {
    console.log(`❌ Authentication failed: ${error.message}`);
  }
};

// Create chat instance with authentication
const chat = new Chatify(undefined, {
  enableAuthentication: true,
  enableTypingIndicator: true,
  enableOnlineStatus: true,
  enableMessageDelivery: true,
  enableGroups: true,
  messageHistory: true,
  maxMessageHistory: 1000
}, authConfig);

async function startAuthServer() {
  try {
    await chat.initialize(3001);
    console.log('🔐 Authenticated chat server started on port 3001');

    // Create some default groups
    setTimeout(() => {
      // Note: In a real application, you'd create groups through the API
      console.log('Server ready for authenticated connections');
    }, 1000);

  } catch (error) {
    console.error('Failed to start authenticated server:', error);
  }
}

// Helper function to generate JWT tokens for testing
export function generateTestToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '24h' });
}

startAuthServer();

// Example usage:
// const token = generateTestToken('user1');
// console.log('Test token for user1:', token);

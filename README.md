# @gs-rumana/chatify

A comprehensive, production-ready chat system package for Socket.IO with TypeScript support, built following 2025 best practices.

[![npm version](https://badge.fury.io/js/%40gs-rumana%2Fchatify.svg)](https://badge.fury.io/js/%40gs-rumana%2Fchatify)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-v4.8.1-green.svg)](https://socket.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![License: MIT](https://img.shields.io/badge/Currently%20in%20Development-orange.svg)

## 🚀 Features

- **Real-time Messaging** with acknowledgments and delivery receipts
- **Group/Room Support** with private and public groups
- **Typing Indicators** with automatic timeout
- **Online Status Tracking** for connected users
- **Message Delivery Status** (sent, delivered, read)
- **Authentication Support** with JWT and custom token verification
- **Rate Limiting** to prevent spam and abuse
- **Message History** with configurable limits
- **File Upload Support** with type and size validation
- **TypeScript Support** with comprehensive type definitions
- **Modern ESM** module format
- **Production Ready** with error handling and graceful shutdowns

## 📦 Installation

```bash
npm install @gs-rumana/chatify
# or
yarn add @gs-rumana/chatify
# or
pnpm add @gs-rumana/chatify
```

## 🏃‍♂️ Quick Start

### Basic Server Setup

```typescript
import { Chatify } from '@gs-rumana/chatify';

// Create chat instance with default configuration
const chat = new Chatify();

// Start the server
await chat.initialize(3000);
console.log('🚀 Chat server running on port 3000');
```

### Basic Client Usage

```typescript
import { createChatClient } from '@gs-rumana/chatify';

// Create and connect client
const client = createChatClient({
  url: 'http://localhost:3000'
});

// Listen for messages
client.on('message:receive', (message) => {
  console.log(`${message.senderUsername}: ${message.content}`);
});

// Send a message
await client.sendMessage('Hello, world!');
```

## 🔧 Configuration

### Chat Configuration Options

```typescript
interface ChatConfig {
  enableTypingIndicator?: boolean;     // Default: true
  enableOnlineStatus?: boolean;        // Default: true
  enableMessageDelivery?: boolean;     // Default: true
  enableGroups?: boolean;              // Default: true
  enableAuthentication?: boolean;      // Default: false
  typingTimeout?: number;              // Default: 3000ms
  messageHistory?: boolean;            // Default: true
  maxMessageHistory?: number;          // Default: 1000
  allowedFileTypes?: string[];         // Default: ['image/jpeg', 'image/png', 'image/gif', 'text/plain']
  maxFileSize?: number;               // Default: 5MB
  rateLimiting?: {
    enabled: boolean;                  // Default: true
    maxMessages: number;               // Default: 30
    timeWindow: number;               // Default: 60000ms (1 minute)
  };
}
```

### Advanced Server Setup

```typescript
import { Chatify } from '@gs-rumana/chatify';

const chat = new Chatify(undefined, {
  enableTypingIndicator: true,
  enableOnlineStatus: true,
  enableMessageDelivery: true,
  enableGroups: true,
  enableAuthentication: true,
  typingTimeout: 5000,
  messageHistory: true,
  maxMessageHistory: 2000,
  rateLimiting: {
    enabled: true,
    maxMessages: 50,
    timeWindow: 60000
  }
}, {
  // Authentication configuration
  verifyToken: async (token: string) => {
    // Implement your token verification logic
    const user = await verifyJWT(token);
    return user;
  },
  onAuthSuccess: (user, socket) => {
    console.log(`User ${user.username} authenticated`);
  },
  onAuthFailure: (error, socket) => {
    console.log(`Authentication failed: ${error.message}`);
  }
});

await chat.initialize(3000);
```

## 📚 API Reference

### Chatify Class

#### Constructor
```typescript
new Chatify(socketIO?: SocketIOServer, config?: Partial<ChatConfig>, authConfig?: AuthConfig)
```

#### Methods
- `initialize(port?: number): Promise<void>` - Start the chat server
- `getIO(): SocketIOServer` - Get Socket.IO server instance
- `getUsers(): User[]` - Get all users
- `getGroups(): Group[]` - Get all groups
- `getMessages(groupId?: string): Message[]` - Get messages
- `broadcastSystemMessage(content: string, groupId?: string): void` - Broadcast system message
- `close(): Promise<void>` - Close the server

### ChatClient Class

#### Constructor
```typescript
new ChatClient(options?: ChatClientOptions)
```

#### Methods
- `authenticate(token: string)` - Authenticate user
- `sendMessage(content: string, groupId?: string, messageType?: 'text'|'image'|'file')` - Send message
- `createGroup(name: string, description?: string, isPrivate?: boolean, members?: string[])` - Create group
- `joinGroup(groupId: string)` - Join group
- `leaveGroup(groupId: string)` - Leave group
- `startTyping(groupId?: string): void` - Start typing indicator
- `stopTyping(groupId?: string): void` - Stop typing indicator
- `markMessageAsDelivered(messageId: string): void` - Mark message as delivered
- `markMessageAsRead(messageId: string): void` - Mark message as read
- `getOnlineUsers(): Promise<User[]>` - Get online users

## 🎯 Event Reference

### Client Events

| Event | Description | Payload |
|-------|-------------|---------|
| `connect` | Client connected to server | `void` |
| `disconnect` | Client disconnected from server | `void` |
| `message:receive` | New message received | `Message` |
| `message:delivered` | Message delivery confirmation | `messageId: string, userId: string` |
| `message:read` | Message read confirmation | `messageId: string, userId: string` |
| `typing:indicator` | Typing status update | `TypingIndicator` |
| `status:online` | User came online | `userId: string` |
| `status:offline` | User went offline | `userId: string` |
| `status:update` | Online users list update | `User[]` |

## 📝 Usage Examples

### Authentication Example

```typescript
import jwt from 'jsonwebtoken';

const authConfig = {
  verifyToken: async (token: string) => {
    try {
      const decoded = jwt.verify(token, 'your-secret-key') as { userId: string };
      const user = await getUserFromDatabase(decoded.userId);

      return {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        isOnline: false,
        lastSeen: new Date()
      };
    } catch (error) {
      return null; // Authentication failed
    }
  }
};

const chat = new Chatify(undefined, {
  enableAuthentication: true
}, authConfig);
```

### Group Management Example

```typescript
// Create a group
const result = await client.createGroup(
  'Development Team',
  'Discussion about development tasks',
  false, // isPrivate
  ['user1', 'user2', 'user3'] // initial members
);

// Join a group
await client.joinGroup('group-id');

// Send message to group
await client.sendMessage('Hello team!', 'group-id');
```

### Typing Indicators Example

```typescript
client.on('typing:indicator', (indicator) => {
  if (indicator.isTyping) {
    console.log(`${indicator.username} is typing...`);
  } else {
    console.log(`${indicator.username} stopped typing`);
  }
});

// Start typing
client.startTyping('group-id'); // optional group ID
```

### React Integration Example

```tsx
import React, { useState, useEffect } from 'react';
import { createChatClient, Message } from '@gs-rumana/chatify';

const ChatApp: React.FC = () => {
  const [client] = useState(() => createChatClient({ url: 'http://localhost:3000' }));
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    client.on('message:receive', (message) => {
      setMessages(prev => [...prev, message]);
    });

    return () => client.disconnect();
  }, [client]);

  const sendMessage = async () => {
    if (inputValue.trim()) {
      await client.sendMessage(inputValue);
      setInputValue('');
    }
  };

  return (
    <div>
      <div className="messages">
        {messages.map(msg => (
          <div key={msg.id}>
            <strong>{msg.senderUsername}:</strong> {msg.content}
          </div>
        ))}
      </div>
      <input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
};
```

## 🔍 Type Definitions

```typescript
interface User {
  id: string;
  username: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: Date;
  metadata?: Record<string, any>;
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  senderUsername: string;
  groupId?: string;
  timestamp: Date;
  messageType: 'text' | 'image' | 'file' | 'system';
  metadata?: Record<string, any>;
  deliveryStatus: 'sent' | 'delivered' | 'read';
  readBy?: Array<{
    userId: string;
    readAt: Date;
  }>;
}

interface Group {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: Date;
  members: string[];
  admins: string[];
  isPrivate: boolean;
  metadata?: Record<string, any>;
}
```

## 🧪 Testing

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run linting
npm run lint

# Build the package
npm run build
```

## 🏗️ Development

```bash
# Clone the repository
git clone https://github.com/gs-rumana/chatify.git
cd chatify

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 📚 References

This package leverages the latest Socket.IO v4.8.1 features and modern Node.js practices:

### Socket.IO v4.8.1 Features

- **Connection Management**: Automatic reconnection with exponential backoff
- **Event-driven Architecture**: Custom events for all chat operations
- **Rooms and Namespaces**: For group management and message routing
- **Acknowledgments**: For reliable message delivery confirmation
- **Binary Support**: For file attachments and media
- **Middleware Support**: For authentication and request processing

### Modern Node.js 2025 Practices

- **ESM Modules**: Native ES module support
- **TypeScript**: Full TypeScript support with strict typing
- **Performance**: Optimized for high-concurrency scenarios
- **Security**: Built-in rate limiting and input validation

### Documentation References

- [Socket.IO v4 Documentation](https://socket.io/docs/v4/)
- [Socket.IO Server API](https://socket.io/docs/v4/server-api/)
- [Socket.IO Client API](https://socket.io/docs/v4/client-api/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [TypeScript Node.js Setup](https://betterstack.com/community/guides/scaling-nodejs/nodejs-typescript/)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🙋‍♂️ Support

- 🐛 Issues: [GitHub Issues](https://github.com/gs-rumana/chatify/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/gs-rumana/chatify/discussions)

---

Built with ❤️ using Socket.IO v4.8.1, TypeScript, and modern Node.js practices.

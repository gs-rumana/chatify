// examples/client-usage.ts
import { createChatClient } from '../src/index.js';

// Create a chat client
const client = createChatClient({
  url: 'http://localhost:3000',
  autoConnect: true
});

// Set up event listeners
client.on('connect', () => {
  console.log('✅ Connected to chat server');
});

client.on('message:receive', (message) => {
  console.log(`💬 ${message.senderUsername}: ${message.content}`);
});

client.on('typing:indicator', (indicator) => {
  if (indicator.isTyping) {
    console.log(`⌨️  ${indicator.username} is typing...`);
  } else {
    console.log(`⌨️  ${indicator.username} stopped typing`);
  }
});

client.on('status:update', (users) => {
  console.log(`👥 ${users.length} users online:`, users.map(u => u.username).join(', '));
});

client.on('group:joined', (group) => {
  console.log(`🎉 Joined group: ${group.name}`);
});

// Example functions
async function sendMessage() {
  const result = await client.sendMessage('Hello, world!');
  if (result.success) {
    console.log('Message sent successfully');
  } else {
    console.error('Failed to send message:', result.error);
  }
}

async function createGroup() {
  const result = await client.createGroup(
    'General Discussion',
    'A place for general conversation',
    false,
    ['user1', 'user2']
  );

  if (result.success) {
    console.log('Group created:', result.group?.name);
  } else {
    console.error('Failed to create group:', result.error);
  }
}

async function demonstrateTyping() {
  // Start typing
  client.startTyping();

  // Simulate typing for 2 seconds
  setTimeout(() => {
    client.sendMessage('I was typing this message!');
  }, 2000);
}

// Run examples
setTimeout(sendMessage, 1000);
setTimeout(createGroup, 2000);
setTimeout(demonstrateTyping, 3000);

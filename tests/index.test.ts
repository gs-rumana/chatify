import { Chatify } from '../src/Chatify.js';
import { createChatClient } from '../src/client.js';
import { validateMessage, validateGroup } from '../src/validators.js';

describe('RobustChat', () => {
  let chat: Chatify;

  beforeEach(() => {
    chat = new Chatify();
  });

  afterEach(async () => {
    if (chat) {
      await chat.close();
    }
  });

  test('should create chat instance with default config', () => {
    expect(chat).toBeDefined();
    expect(chat.getIO()).toBeDefined();
  });

  test('should get empty users array initially', () => {
    const users = chat.getUsers();
    expect(users).toEqual([]);
  });

  test('should get empty groups array initially', () => {
    const groups = chat.getGroups();
    expect(groups).toEqual([]);
  });

  test('should get empty messages array initially', () => {
    const messages = chat.getMessages();
    expect(messages).toEqual([]);
  });

  test('should broadcast system message', () => {
    expect(() => {
      chat.broadcastSystemMessage('Test system message');
    }).not.toThrow();
  });
});

describe('Message Validation', () => {
  test('should validate correct message', () => {
    const message = {
      content: 'Hello world',
      messageType: 'text' as const
    };

    const result = validateMessage(message);
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test('should reject empty message', () => {
    const message = {
      content: '',
      messageType: 'text' as const
    };

    const result = validateMessage(message);
    expect(result.isValid).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('should reject message that is too long', () => {
    const message = {
      content: 'a'.repeat(10001), // Exceeds 10000 character limit
      messageType: 'text' as const
    };

    const result = validateMessage(message);
    expect(result.isValid).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('Group Validation', () => {
  test('should validate correct group', () => {
    const group = {
      name: 'Test Group',
      description: 'A test group',
      isPrivate: false
    };

    const result = validateGroup(group);
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test('should reject group with empty name', () => {
    const group = {
      name: '',
      isPrivate: false
    };

    const result = validateGroup(group);
    expect(result.isValid).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('should reject group with name too long', () => {
    const group = {
      name: 'a'.repeat(101), // Exceeds 100 character limit
      isPrivate: false
    };

    const result = validateGroup(group);
    expect(result.isValid).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('ChatClient', () => {
  test('should create chat client', () => {
    const client = createChatClient({
      url: 'http://localhost:3000',
      autoConnect: false
    });

    expect(client).toBeDefined();
    expect(client.isConnected).toBe(false);
  });
});

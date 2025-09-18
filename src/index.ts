/**
 * @gs-rumana/chatify
 * A comprehensive, feature-rich chat system package for Socket.IO
 * 
 * Features:
 * - Real-time messaging with delivery receipts
 * - Group/Room support
 * - Typing indicators
 * - Online status tracking
 * - Authentication support
 * - Rate limiting
 * - Message history
 * - TypeScript support
 * 
 * @author GS Rumana
 * @license MIT
 */

export { Chatify as default, Chatify } from './Chatify.js';
export * from './types.js';

// Utility functions
export { createChatClient } from './client.js';
export { validateMessage, validateGroup } from './validators.js';

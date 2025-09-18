/**
 * Type definitions for the Chat System
 */

export interface User {
  id: string;
  username: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: Date;
  metadata?: Record<string, any>;
}

export interface Message {
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

export interface Group {
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

export interface TypingIndicator {
  userId: string;
  username: string;
  groupId?: string;
  isTyping: boolean;
  timestamp: Date;
}

export interface ChatConfig {
  enableTypingIndicator?: boolean;
  enableOnlineStatus?: boolean;
  enableMessageDelivery?: boolean;
  enableGroups?: boolean;
  enableAuthentication?: boolean;
  typingTimeout?: number;
  messageHistory?: boolean;
  maxMessageHistory?: number;
  allowedFileTypes?: string[];
  maxFileSize?: number;
  rateLimiting?: {
    enabled: boolean;
    maxMessages: number;
    timeWindow: number;
  };
}

export interface AuthConfig {
  secret?: string;
  verifyToken?: (token: string) => Promise<User | null>;
  onAuthSuccess?: (user: User, socket: any) => void;
  onAuthFailure?: (error: Error, socket: any) => void;
}

export interface ChatEvents {
  // Connection events
  'user:connected': (user: User) => void;
  'user:disconnected': (userId: string) => void;

  // Message events
  'message:send': (message: Omit<Message, 'id' | 'timestamp' | 'deliveryStatus'>) => void;
  'message:receive': (message: Message) => void;
  'message:delivered': (messageId: string, userId: string) => void;
  'message:read': (messageId: string, userId: string) => void;

  // Group events
  'group:create': (group: Omit<Group, 'id' | 'createdAt'>) => void;
  'group:join': (groupId: string, userId: string) => void;
  'group:leave': (groupId: string, userId: string) => void;
  'group:update': (groupId: string, updates: Partial<Group>) => void;

  // Typing events
  'typing:start': (data: { groupId?: string }) => void;
  'typing:stop': (data: { groupId?: string }) => void;
  'typing:indicator': (indicator: TypingIndicator) => void;

  // Status events
  'status:online': (userId: string) => void;
  'status:offline': (userId: string) => void;
  'status:update': (users: User[]) => void;

  // Error events
  'error': (error: Error) => void;
}

export interface ChatifySocket {
  user?: User;
  rateLimitCount?: number;
  rateLimitReset?: number;
  typingTimer?: NodeJS.Timeout;
}

export type MessageValidationSchema = {
  content: string;
  messageType: 'text' | 'image' | 'file' | 'system';
  groupId?: string;
  metadata?: Record<string, any>;
};

export type GroupValidationSchema = {
  name: string;
  description?: string;
  isPrivate: boolean;
  members?: string[];
};

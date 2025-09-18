import { Server as SocketIOServer, Socket } from 'socket.io';
import { createServer, Server as HTTPServer } from 'http';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';
import {
  User,
  Message,
  Group,
  TypingIndicator,
  ChatConfig,
  AuthConfig,
  ChatEvents,
  ChatifySocket,
  MessageValidationSchema,
  GroupValidationSchema
} from './types.js';

export class Chatify {
  private io: SocketIOServer;
  private httpServer?: HTTPServer;
  private config: Required<ChatConfig>;
  private authConfig?: AuthConfig;

  // Data storage (in production, use external database)
  private users: Map<string, User> = new Map();
  private messages: Map<string, Message> = new Map();
  private groups: Map<string, Group> = new Map();
  private userSockets: Map<string, Socket> = new Map();
  private typingUsers: Map<string, TypingIndicator> = new Map();

  // Validation schemas
  private messageSchema = Joi.object({
    content: Joi.string().required().max(10000),
    messageType: Joi.string().valid('text', 'image', 'file', 'system').default('text'),
    groupId: Joi.string().optional(),
    metadata: Joi.object().optional()
  });

  private groupSchema = Joi.object({
    name: Joi.string().required().min(1).max(100),
    description: Joi.string().optional().max(500),
    isPrivate: Joi.boolean().default(false),
    members: Joi.array().items(Joi.string()).optional()
  });

  constructor(
    socketIO?: SocketIOServer,
    config: Partial<ChatConfig> = {},
    authConfig?: AuthConfig
  ) {
    // Default configuration
    this.config = {
      enableTypingIndicator: true,
      enableOnlineStatus: true,
      enableMessageDelivery: true,
      enableGroups: true,
      enableAuthentication: false,
      typingTimeout: 3000,
      messageHistory: true,
      maxMessageHistory: 1000,
      allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'text/plain'],
      maxFileSize: 5 * 1024 * 1024, // 5MB
      rateLimiting: {
        enabled: true,
        maxMessages: 30,
        timeWindow: 60000 // 1 minute
      },
      ...config
    };

    this.authConfig = authConfig;

    if (socketIO) {
      this.io = socketIO;
    } else {
      this.httpServer = createServer();
      this.io = new SocketIOServer(this.httpServer, {
        cors: {
          origin: "*",
          methods: ["GET", "POST"]
        },
        transports: ['websocket', 'polling']
      });
    }

    this.setupEventHandlers();
  }

  /**
   * Initialize the chat system
   */
  public async initialize(port: number = 3000): Promise<void> {
    if (this.httpServer) {
      return new Promise((resolve) => {
        this.httpServer!.listen(port, () => {
          console.log(`🚀 Chatify server running on port ${port}`);
          resolve();
        });
      });
    }
  }

  /**
   * Get the Socket.IO server instance
   */
  public getIO(): SocketIOServer {
    return this.io;
  }

  /**
   * Setup all event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', async (socket: Socket & ChatifySocket) => {
      console.log(`Socket connected: ${socket.id}`);

      // Initialize rate limiting
      if (this.config.rateLimiting.enabled) {
        socket.rateLimitCount = 0;
        socket.rateLimitReset = Date.now() + this.config.rateLimiting.timeWindow;
      }

      // Handle authentication
      if (this.config.enableAuthentication && this.authConfig?.verifyToken) {
        socket.on('auth:login', async (data: { token: string }, callback) => {
          try {
            const user = await this.authConfig!.verifyToken!(data.token);
            if (user) {
              socket.user = user;
              this.users.set(user.id, { ...user, isOnline: true });
              this.userSockets.set(user.id, socket);

              this.authConfig?.onAuthSuccess?.(user, socket);

              if (callback) callback({ success: true, user });

              // Notify others of online status
              if (this.config.enableOnlineStatus) {
                socket.broadcast.emit('status:online', user.id);
                this.emitOnlineUsers();
              }

              // Join user to their personal room
              socket.join(`user:${user.id}`);

              // Send message history if enabled
              if (this.config.messageHistory) {
                this.sendMessageHistory(socket, user.id);
              }

            } else {
              const error = new Error('Invalid authentication token');
              this.authConfig?.onAuthFailure?.(error, socket);
              if (callback) callback({ success: false, error: error.message });
            }
          } catch (error) {
            console.error('Authentication error:', error);
            this.authConfig?.onAuthFailure?.(error as Error, socket);
            if (callback) callback({ success: false, error: 'Authentication failed' });
          }
        });
      } else {
        // No authentication required - create anonymous user
        const anonymousUser: User = {
          id: uuidv4(),
          username: `User_${socket.id.substring(0, 8)}`,
          isOnline: true,
          lastSeen: new Date()
        };

        socket.user = anonymousUser;
        this.users.set(anonymousUser.id, anonymousUser);
        this.userSockets.set(anonymousUser.id, socket);
        socket.join(`user:${anonymousUser.id}`);

        if (this.config.enableOnlineStatus) {
          socket.broadcast.emit('status:online', anonymousUser.id);
          this.emitOnlineUsers();
        }
      }

      this.setupMessageHandlers(socket);
      this.setupGroupHandlers(socket);
      this.setupTypingHandlers(socket);
      this.setupStatusHandlers(socket);
      this.setupDisconnectionHandler(socket);
    });
  }

  /**
   * Setup message-related event handlers
   */
  private setupMessageHandlers(socket: Socket & ChatifySocket): void {
    socket.on('message:send', async (data: MessageValidationSchema, callback) => {
      try {
        if (!socket.user) {
          throw new Error('User not authenticated');
        }

        if (!this.checkRateLimit(socket)) {
          throw new Error('Rate limit exceeded');
        }

        // Validate message data
        const { error, value } = this.messageSchema.validate(data);
        if (error) {
          throw new Error(`Validation error: ${error.details[0].message}`);
        }

        // Create message
        const message: Message = {
          id: uuidv4(),
          content: value.content,
          senderId: socket.user.id,
          senderUsername: socket.user.username,
          groupId: value.groupId,
          timestamp: new Date(),
          messageType: value.messageType,
          metadata: value.metadata,
          deliveryStatus: 'sent',
          readBy: []
        };

        // Store message
        this.messages.set(message.id, message);

        // Broadcast message
        if (message.groupId) {
          // Send to group
          const group = this.groups.get(message.groupId);
          if (group && group.members.includes(socket.user.id)) {
            this.io.to(`group:${message.groupId}`).emit('message:receive', message);

            // Mark as delivered for online group members
            if (this.config.enableMessageDelivery) {
              this.markMessageAsDelivered(message, group.members);
            }
          } else {
            throw new Error('Group not found or user not a member');
          }
        } else {
          // Broadcast to all users
          this.io.emit('message:receive', message);

          // Mark as delivered for all online users
          if (this.config.enableMessageDelivery) {
            this.markMessageAsDelivered(message, Array.from(this.users.keys()));
          }
        }

        if (callback) callback({ success: true, message });

      } catch (error) {
        console.error('Message send error:', error);
        socket.emit('error', error);
        if (callback) callback({ success: false, error: (error as Error).message });
      }
    });

    // Handle message delivery acknowledgments
    if (this.config.enableMessageDelivery) {
      socket.on('message:delivered', (data: { messageId: string }) => {
        if (socket.user) {
          this.markMessageAsDelivered({ id: data.messageId } as Message, [socket.user.id]);
          socket.broadcast.emit('message:delivered', data.messageId, socket.user.id);
        }
      });

      socket.on('message:read', (data: { messageId: string }) => {
        if (socket.user) {
          this.markMessageAsRead(data.messageId, socket.user.id);
          socket.broadcast.emit('message:read', data.messageId, socket.user.id);
        }
      });
    }
  }

  /**
   * Setup group-related event handlers
   */
  private setupGroupHandlers(socket: Socket & ChatifySocket): void {
    if (!this.config.enableGroups) return;

    socket.on('group:create', async (data: GroupValidationSchema, callback) => {
      try {
        if (!socket.user) {
          throw new Error('User not authenticated');
        }

        const { error, value } = this.groupSchema.validate(data);
        if (error) {
          throw new Error(`Validation error: ${error.details[0].message}`);
        }

        const group: Group = {
          id: uuidv4(),
          name: value.name,
          description: value.description,
          createdBy: socket.user.id,
          createdAt: new Date(),
          members: [socket.user.id, ...(value.members || [])],
          admins: [socket.user.id],
          isPrivate: value.isPrivate
        };

        this.groups.set(group.id, group);

        // Join creator to group room
        socket.join(`group:${group.id}`);

        // Add other members to group room
        group.members.forEach(memberId => {
          const memberSocket = this.userSockets.get(memberId);
          if (memberSocket) {
            memberSocket.join(`group:${group.id}`);
            memberSocket.emit('group:joined', group);
          }
        });

        if (callback) callback({ success: true, group });

      } catch (error) {
        console.error('Group creation error:', error);
        if (callback) callback({ success: false, error: (error as Error).message });
      }
    });

    socket.on('group:join', (data: { groupId: string }, callback) => {
      try {
        if (!socket.user) {
          throw new Error('User not authenticated');
        }

        const group = this.groups.get(data.groupId);
        if (!group) {
          throw new Error('Group not found');
        }

        if (!group.members.includes(socket.user.id)) {
          group.members.push(socket.user.id);
          this.groups.set(group.id, group);
        }

        socket.join(`group:${group.id}`);
        socket.to(`group:${group.id}`).emit('group:member_joined', {
          groupId: group.id,
          user: socket.user
        });

        if (callback) callback({ success: true, group });

      } catch (error) {
        console.error('Group join error:', error);
        if (callback) callback({ success: false, error: (error as Error).message });
      }
    });

    socket.on('group:leave', (data: { groupId: string }, callback) => {
      try {
        if (!socket.user) {
          throw new Error('User not authenticated');
        }

        const group = this.groups.get(data.groupId);
        if (!group) {
          throw new Error('Group not found');
        }

        group.members = group.members.filter(id => id !== socket.user!.id);
        group.admins = group.admins.filter(id => id !== socket.user!.id);
        this.groups.set(group.id, group);

        socket.leave(`group:${group.id}`);
        socket.to(`group:${group.id}`).emit('group:member_left', {
          groupId: group.id,
          userId: socket.user.id
        });

        if (callback) callback({ success: true });

      } catch (error) {
        console.error('Group leave error:', error);
        if (callback) callback({ success: false, error: (error as Error).message });
      }
    });
  }

  /**
   * Setup typing indicator handlers
   */
  private setupTypingHandlers(socket: Socket & ChatifySocket): void {
    if (!this.config.enableTypingIndicator) return;

    socket.on('typing:start', (data: { groupId?: string }) => {
      if (!socket.user) return;

      const typingKey = `${socket.user.id}:${data.groupId || 'global'}`;
      const indicator: TypingIndicator = {
        userId: socket.user.id,
        username: socket.user.username,
        groupId: data.groupId,
        isTyping: true,
        timestamp: new Date()
      };

      this.typingUsers.set(typingKey, indicator);

      // Clear existing timer
      if (socket.typingTimer) {
        clearTimeout(socket.typingTimer);
      }

      // Set auto-stop timer
      socket.typingTimer = setTimeout(() => {
        this.stopTyping(socket, data.groupId);
      }, this.config.typingTimeout);

      // Broadcast typing indicator
      if (data.groupId) {
        socket.to(`group:${data.groupId}`).emit('typing:indicator', indicator);
      } else {
        socket.broadcast.emit('typing:indicator', indicator);
      }
    });

    socket.on('typing:stop', (data: { groupId?: string }) => {
      this.stopTyping(socket, data.groupId);
    });
  }

  /**
   * Setup status handlers
   */
  private setupStatusHandlers(socket: Socket & ChatifySocket): void {
    if (!this.config.enableOnlineStatus) return;

    socket.on('status:get_online', (callback) => {
      const onlineUsers = Array.from(this.users.values()).filter(user => user.isOnline);
      if (callback) callback(onlineUsers);
    });
  }

  /**
   * Setup disconnection handler
   */
  private setupDisconnectionHandler(socket: Socket & ChatifySocket): void {
    socket.on('disconnect', () => {
      if (socket.user) {
        // Update user status
        const user = this.users.get(socket.user.id);
        if (user) {
          user.isOnline = false;
          user.lastSeen = new Date();
          this.users.set(user.id, user);
        }

        // Remove from active sockets
        this.userSockets.delete(socket.user.id);

        // Stop typing
        this.stopTyping(socket);

        // Notify others
        if (this.config.enableOnlineStatus) {
          socket.broadcast.emit('status:offline', socket.user.id);
          this.emitOnlineUsers();
        }

        console.log(`User ${socket.user.username} disconnected`);
      }
    });
  }

  /**
   * Check rate limiting
   */
  private checkRateLimit(socket: Socket & ChatifySocket): boolean {
    if (!this.config.rateLimiting.enabled) return true;

    const now = Date.now();

    if (now > socket.rateLimitReset!) {
      socket.rateLimitCount = 0;
      socket.rateLimitReset = now + this.config.rateLimiting.timeWindow;
    }

    if (socket.rateLimitCount! >= this.config.rateLimiting.maxMessages) {
      return false;
    }

    socket.rateLimitCount = (socket.rateLimitCount || 0) + 1;
    return true;
  }

  /**
   * Stop typing indicator
   */
  private stopTyping(socket: Socket & ChatifySocket, groupId?: string): void {
    if (!socket.user) return;

    const typingKey = `${socket.user.id}:${groupId || 'global'}`;
    const indicator = this.typingUsers.get(typingKey);

    if (indicator) {
      indicator.isTyping = false;
      this.typingUsers.delete(typingKey);

      if (groupId) {
        socket.to(`group:${groupId}`).emit('typing:indicator', indicator);
      } else {
        socket.broadcast.emit('typing:indicator', indicator);
      }
    }

    if (socket.typingTimer) {
      clearTimeout(socket.typingTimer);
      socket.typingTimer = undefined;
    }
  }

  /**
   * Mark message as delivered
   */
  private markMessageAsDelivered(message: Message, userIds: string[]): void {
    const msg = this.messages.get(message.id);
    if (msg && msg.deliveryStatus === 'sent') {
      msg.deliveryStatus = 'delivered';
      this.messages.set(message.id, msg);
    }
  }

  /**
   * Mark message as read
   */
  private markMessageAsRead(messageId: string, userId: string): void {
    const message = this.messages.get(messageId);
    if (message) {
      if (!message.readBy) message.readBy = [];

      const existingRead = message.readBy.find(r => r.userId === userId);
      if (!existingRead) {
        message.readBy.push({
          userId,
          readAt: new Date()
        });
        message.deliveryStatus = 'read';
        this.messages.set(messageId, message);
      }
    }
  }

  /**
   * Send message history to user
   */
  private sendMessageHistory(socket: Socket, userId: string): void {
    const userGroups = Array.from(this.groups.values()).filter(g => g.members.includes(userId));
    const groupIds = userGroups.map(g => g.id);

    const relevantMessages = Array.from(this.messages.values())
      .filter(msg => !msg.groupId || groupIds.includes(msg.groupId))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .slice(-this.config.maxMessageHistory);

    socket.emit('message:history', relevantMessages);
  }

  /**
   * Emit online users list
   */
  private emitOnlineUsers(): void {
    const onlineUsers = Array.from(this.users.values()).filter(user => user.isOnline);
    this.io.emit('status:update', onlineUsers);
  }

  /**
   * Get all users
   */
  public getUsers(): User[] {
    return Array.from(this.users.values());
  }

  /**
   * Get all groups
   */
  public getGroups(): Group[] {
    return Array.from(this.groups.values());
  }

  /**
   * Get messages for a specific group or global
   */
  public getMessages(groupId?: string): Message[] {
    return Array.from(this.messages.values())
      .filter(msg => msg.groupId === groupId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Broadcast a system message
   */
  public broadcastSystemMessage(content: string, groupId?: string): void {
    const message: Message = {
      id: uuidv4(),
      content,
      senderId: 'system',
      senderUsername: 'System',
      groupId,
      timestamp: new Date(),
      messageType: 'system',
      deliveryStatus: 'delivered'
    };

    this.messages.set(message.id, message);

    if (groupId) {
      this.io.to(`group:${groupId}`).emit('message:receive', message);
    } else {
      this.io.emit('message:receive', message);
    }
  }

  /**
   * Close the chat system
   */
  public async close(): Promise<void> {
    if (this.httpServer) {
      return new Promise((resolve) => {
        this.httpServer!.close(() => {
          console.log('Chatify server closed');
          resolve();
        });
      });
    }
  }
}

export default Chatify;

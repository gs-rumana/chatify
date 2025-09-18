import { io, Socket } from 'socket.io-client';
import { User, Message, Group, TypingIndicator } from './types.js';

export interface ChatClientOptions {
  url?: string;
  auth?: {
    token?: string;
  };
  autoConnect?: boolean;
  transports?: string[];
}

export interface ChatClientEvents {
  'connect': () => void;
  'disconnect': () => void;
  'message:receive': (message: Message) => void;
  'message:delivered': (messageId: string, userId: string) => void;
  'message:read': (messageId: string, userId: string) => void;
  'typing:indicator': (indicator: TypingIndicator) => void;
  'status:online': (userId: string) => void;
  'status:offline': (userId: string) => void;
  'status:update': (users: User[]) => void;
  'group:joined': (group: Group) => void;
  'group:member_joined': (data: { groupId: string; user: User }) => void;
  'group:member_left': (data: { groupId: string; userId: string }) => void;
  'error': (error: Error) => void;
}

export class ChatClient {
  private socket: Socket;
  private user?: User;
  private typingTimer?: NodeJS.Timeout;

  constructor(options: ChatClientOptions = {}) {
    this.socket = io(options.url || 'http://localhost:3000', {
      auth: options.auth,
      autoConnect: options.autoConnect !== false,
      transports: options.transports || ['websocket', 'polling']
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.socket.on('connect', () => {
      console.log('Connected to chat server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from chat server');
    });
  }

  public async authenticate(token: string): Promise<{ success: boolean; user?: User; error?: string }> {
    return new Promise((resolve) => {
      this.socket.emit('auth:login', { token }, (response: any) => {
        if (response.success) {
          this.user = response.user;
        }
        resolve(response);
      });
    });
  }

  public async sendMessage(
    content: string, 
    groupId?: string, 
    messageType: 'text' | 'image' | 'file' = 'text',
    metadata?: Record<string, any>
  ): Promise<{ success: boolean; message?: Message; error?: string }> {
    return new Promise((resolve) => {
      this.socket.emit('message:send', {
        content,
        groupId,
        messageType,
        metadata
      }, (response: any) => {
        resolve(response);
      });
    });
  }

  public async createGroup(
    name: string,
    description?: string,
    isPrivate: boolean = false,
    members?: string[]
  ): Promise<{ success: boolean; group?: Group; error?: string }> {
    return new Promise((resolve) => {
      this.socket.emit('group:create', {
        name,
        description,
        isPrivate,
        members
      }, (response: any) => {
        resolve(response);
      });
    });
  }

  public async joinGroup(groupId: string): Promise<{ success: boolean; group?: Group; error?: string }> {
    return new Promise((resolve) => {
      this.socket.emit('group:join', { groupId }, (response: any) => {
        resolve(response);
      });
    });
  }

  public async leaveGroup(groupId: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      this.socket.emit('group:leave', { groupId }, (response: any) => {
        resolve(response);
      });
    });
  }

  public startTyping(groupId?: string): void {
    this.socket.emit('typing:start', { groupId });

    // Auto-stop typing after 3 seconds
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
    }

    this.typingTimer = setTimeout(() => {
      this.stopTyping(groupId);
    }, 3000);
  }

  public stopTyping(groupId?: string): void {
    this.socket.emit('typing:stop', { groupId });

    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
      this.typingTimer = undefined;
    }
  }

  public markMessageAsDelivered(messageId: string): void {
    this.socket.emit('message:delivered', { messageId });
  }

  public markMessageAsRead(messageId: string): void {
    this.socket.emit('message:read', { messageId });
  }

  public getOnlineUsers(): Promise<User[]> {
    return new Promise((resolve) => {
      this.socket.emit('status:get_online', (users: User[]) => {
        resolve(users);
      });
    });
  }

  public on<K extends keyof ChatClientEvents>(event: K, listener: ChatClientEvents[K]): this {
    this.socket.on(event, listener);
    return this;
  }

  public off<K extends keyof ChatClientEvents>(event: K, listener?: ChatClientEvents[K]): this {
    this.socket.off(event, listener);
    return this;
  }

  public disconnect(): void {
    this.socket.disconnect();
  }

  public connect(): void {
    this.socket.connect();
  }

  public get isConnected(): boolean {
    return this.socket.connected;
  }

  public get currentUser(): User | undefined {
    return this.user;
  }
}

export function createChatClient(options: ChatClientOptions = {}): ChatClient {
  return new ChatClient(options);
}

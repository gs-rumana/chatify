// examples/react-chat-component.tsx
import React, { useState, useEffect, useRef } from 'react';
import { createChatClient, Message, User, Group, TypingIndicator } from '../src/index.js';

interface ChatComponentProps {
  serverUrl?: string;
  authToken?: string;
}

export const ChatComponent: React.FC<ChatComponentProps> = ({
  serverUrl = 'http://localhost:3000',
  authToken
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const clientRef = useRef(createChatClient({ url: serverUrl }));
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const client = clientRef.current;

    // Set up event listeners
    client.on('connect', () => {
      setIsConnected(true);

      // Authenticate if token provided
      if (authToken) {
        client.authenticate(authToken);
      }
    });

    client.on('disconnect', () => {
      setIsConnected(false);
    });

    client.on('message:receive', (message) => {
      setMessages(prev => [...prev, message]);
    });

    client.on('status:update', (users) => {
      setUsers(users);
    });

    client.on('typing:indicator', (indicator) => {
      setTypingUsers(prev => {
        const filtered = prev.filter(t => 
          !(t.userId === indicator.userId && t.groupId === indicator.groupId)
        );

        if (indicator.isTyping) {
          return [...filtered, indicator];
        }

        return filtered;
      });
    });

    return () => {
      client.disconnect();
    };
  }, [serverUrl, authToken]);

  const sendMessage = async () => {
    if (currentMessage.trim()) {
      const result = await clientRef.current.sendMessage(
        currentMessage,
        selectedGroup || undefined
      );

      if (result.success) {
        setCurrentMessage('');
      }
    }
  };

  const handleTyping = () => {
    clientRef.current.startTyping(selectedGroup || undefined);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 1 second of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      clientRef.current.stopTyping(selectedGroup || undefined);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const createGroup = async () => {
    const groupName = prompt('Enter group name:');
    if (groupName) {
      await clientRef.current.createGroup(groupName);
    }
  };

  const filteredMessages = messages.filter(msg => 
    selectedGroup ? msg.groupId === selectedGroup : !msg.groupId
  );

  const currentTypingUsers = typingUsers.filter(t =>
    selectedGroup ? t.groupId === selectedGroup : !t.groupId
  );

  return (
    <div className="chat-container" style={{ height: '500px', display: 'flex' }}>
      {/* Sidebar */}
      <div style={{ width: '200px', borderRight: '1px solid #ccc', padding: '10px' }}>
        <h3>Online Users ({users.length})</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {users.map(user => (
            <li key={user.id} style={{ padding: '5px 0' }}>
              <span style={{ color: user.isOnline ? 'green' : 'gray' }}>
                ● {user.username}
              </span>
            </li>
          ))}
        </ul>

        <h3>Groups</h3>
        <button onClick={createGroup} style={{ marginBottom: '10px' }}>
          Create Group
        </button>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li>
            <button
              onClick={() => setSelectedGroup('')}
              style={{ 
                background: !selectedGroup ? '#e0e0e0' : 'none',
                border: 'none',
                padding: '5px',
                cursor: 'pointer'
              }}
            >
              Global Chat
            </button>
          </li>
          {groups.map(group => (
            <li key={group.id}>
              <button
                onClick={() => setSelectedGroup(group.id)}
                style={{ 
                  background: selectedGroup === group.id ? '#e0e0e0' : 'none',
                  border: 'none',
                  padding: '5px',
                  cursor: 'pointer'
                }}
              >
                {group.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '10px', borderBottom: '1px solid #ccc' }}>
          <h2>{selectedGroup ? `Group Chat` : 'Global Chat'}</h2>
          <div>Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}</div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflow: 'auto', padding: '10px' }}>
          {filteredMessages.map(message => (
            <div key={message.id} style={{ marginBottom: '10px' }}>
              <strong>{message.senderUsername}</strong>
              <span style={{ fontSize: '0.8em', color: '#666', marginLeft: '10px' }}>
                {message.timestamp.toLocaleTimeString()}
              </span>
              <div>{message.content}</div>
            </div>
          ))}

          {/* Typing Indicators */}
          {currentTypingUsers.map(indicator => (
            <div key={`${indicator.userId}-${indicator.groupId}`} style={{ 
              fontStyle: 'italic', 
              color: '#666',
              marginBottom: '5px'
            }}>
              {indicator.username} is typing...
            </div>
          ))}
        </div>

        {/* Input */}
        <div style={{ padding: '10px', borderTop: '1px solid #ccc' }}>
          <div style={{ display: 'flex' }}>
            <input
              type="text"
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onInput={handleTyping}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              style={{ flex: 1, padding: '10px', marginRight: '10px' }}
              disabled={!isConnected}
            />
            <button 
              onClick={sendMessage} 
              disabled={!isConnected || !currentMessage.trim()}
              style={{ padding: '10px 20px' }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatComponent;

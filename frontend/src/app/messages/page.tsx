'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface Message {
  id: number;
  sender: {
    name: string;
    avatar: string;
    role: string;
  };
  subject: string;
  content: string;
  timestamp: string;
  read: boolean;
  type: 'system' | 'user' | 'admin';
  priority: 'low' | 'normal' | 'high';
}

interface Conversation {
  id: number;
  participant: {
    name: string;
    avatar: string;
    role: string;
  };
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  messages: Message[];
}

export default function MessagesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Check authentication
    const checkAuth = () => {
      if (typeof window !== 'undefined') {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
          router.push('/login');
          return;
        }
      }
      
      // Load conversations (mock data for now)
      const mockConversations: Conversation[] = [
        {
          id: 1,
          participant: {
            name: 'GIIP Admin',
            avatar: '/images/features/research.jpg',
            role: 'Administrator'
          },
          lastMessage: 'Welcome to GIIP! Your account has been activated.',
          timestamp: '2024-05-20T10:30:00Z',
          unreadCount: 1,
          messages: [
            {
              id: 1,
              sender: {
                name: 'GIIP Admin',
                avatar: '/images/features/research.jpg',
                role: 'Administrator'
              },
              subject: 'Welcome to GIIP',
              content: 'Welcome to the Global Innovation and Intellectual Property platform! Your account has been successfully activated. You can now access all features including event registration, news updates, and networking opportunities.',
              timestamp: '2024-05-20T10:30:00Z',
              read: false,
              type: 'admin',
              priority: 'normal'
            }
          ]
        },
        {
          id: 2,
          participant: {
            name: 'Dr. Sarah Chen',
            avatar: '/images/features/innovation.jpg',
            role: 'IP Researcher'
          },
          lastMessage: 'Thank you for connecting! Looking forward to our collaboration.',
          timestamp: '2024-05-19T15:45:00Z',
          unreadCount: 0,
          messages: [
            {
              id: 2,
              sender: {
                name: 'Dr. Sarah Chen',
                avatar: '/images/features/innovation.jpg',
                role: 'IP Researcher'
              },
              subject: 'Connection Request',
              content: 'Hi! I noticed we have similar research interests in AI and intellectual property. Would you like to connect and potentially collaborate on future projects?',
              timestamp: '2024-05-19T14:30:00Z',
              read: true,
              type: 'user',
              priority: 'normal'
            },
            {
              id: 3,
              sender: {
                name: 'You',
                avatar: '/images/features/collaboration.jpg',
                role: 'IP Manager'
              },
              subject: 'Re: Connection Request',
              content: 'Absolutely! I\'d be very interested in collaborating. Your recent paper on AI patent landscapes was fascinating.',
              timestamp: '2024-05-19T15:00:00Z',
              read: true,
              type: 'user',
              priority: 'normal'
            },
            {
              id: 4,
              sender: {
                name: 'Dr. Sarah Chen',
                avatar: '/images/features/innovation.jpg',
                role: 'IP Researcher'
              },
              subject: 'Re: Connection Request',
              content: 'Thank you for connecting! Looking forward to our collaboration.',
              timestamp: '2024-05-19T15:45:00Z',
              read: true,
              type: 'user',
              priority: 'normal'
            }
          ]
        },
        {
          id: 3,
          participant: {
            name: 'Event Notifications',
            avatar: '/images/features/collaboration.jpg',
            role: 'System'
          },
          lastMessage: 'Reminder: IP Strategy Conference starts tomorrow!',
          timestamp: '2024-05-18T09:00:00Z',
          unreadCount: 1,
          messages: [
            {
              id: 5,
              sender: {
                name: 'Event Notifications',
                avatar: '/images/features/collaboration.jpg',
                role: 'System'
              },
              subject: 'Event Reminder',
              content: 'Reminder: IP Strategy Conference starts tomorrow at 9:00 AM. Don\'t forget to check in at the registration desk. Your ticket and event details are attached.',
              timestamp: '2024-05-18T09:00:00Z',
              read: false,
              type: 'system',
              priority: 'high'
            }
          ]
        }
      ];
      
      setConversations(mockConversations);
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  const filteredConversations = conversations.filter(conversation =>
    conversation.participant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conversation.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const markAsRead = (conversationId: number) => {
    setConversations(prev =>
      prev.map(conv =>
        conv.id === conversationId
          ? { ...conv, unreadCount: 0, messages: conv.messages.map(msg => ({ ...msg, read: true })) }
          : conv
      )
    );
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const newMsg: Message = {
      id: Date.now(),
      sender: {
        name: 'You',
        avatar: '/images/features/collaboration.jpg',
        role: 'IP Manager'
      },
      subject: 'Reply',
      content: newMessage,
      timestamp: new Date().toISOString(),
      read: true,
      type: 'user',
      priority: 'normal'
    };

    setConversations(prev =>
      prev.map(conv =>
        conv.id === selectedConversation
          ? {
              ...conv,
              messages: [...conv.messages, newMsg],
              lastMessage: newMessage,
              timestamp: new Date().toISOString()
            }
          : conv
      )
    );

    setNewMessage('');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600';
      case 'normal':
        return 'text-primary';
      case 'low':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'system':
        return 'fas fa-cog';
      case 'admin':
        return 'fas fa-shield-alt';
      case 'user':
        return 'fas fa-user';
      default:
        return 'fas fa-envelope';
    }
  };

  const selectedConv = conversations.find(conv => conv.id === selectedConversation);
  const totalUnread = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="mr-4 text-gray-600 hover:text-primary transition-colors"
              >
                <i className="fas fa-arrow-left text-xl"></i>
              </button>
              <h1 className="text-2xl font-bold text-primary-dark">
                Messages
                {totalUnread > 0 && (
                  <span className="ml-2 bg-accent text-white text-sm px-2 py-1 rounded-full">
                    {totalUnread}
                  </span>
                )}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-primary hover:text-primary-dark font-medium"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
            <div className="flex h-full">
              {/* Conversations List */}
              <div className="w-1/3 border-r border-gray-200 flex flex-col">
                {/* Search */}
                <div className="p-4 border-b border-gray-200">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search conversations..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    />
                    <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                  </div>
                </div>

                {/* Conversations */}
                <div className="flex-1 overflow-y-auto">
                  {filteredConversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      onClick={() => {
                        setSelectedConversation(conversation.id);
                        markAsRead(conversation.id);
                      }}
                      className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedConversation === conversation.id ? 'bg-primary/5 border-primary/20' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="relative">
                          <Image
                            src={conversation.participant.avatar}
                            alt={conversation.participant.name}
                            width={40}
                            height={40}
                            className="rounded-full object-cover"
                          />
                          {conversation.unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-accent text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                              {conversation.unreadCount}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className={`text-sm font-medium truncate ${
                              conversation.unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                              {conversation.participant.name}
                            </h3>
                            <span className="text-xs text-gray-500">
                              {new Date(conversation.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mb-1">{conversation.participant.role}</p>
                          <p className={`text-sm truncate ${
                            conversation.unreadCount > 0 ? 'font-medium text-gray-900' : 'text-gray-600'
                          }`}>
                            {conversation.lastMessage}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Message View */}
              <div className="flex-1 flex flex-col">
                {selectedConv ? (
                  <>
                    {/* Conversation Header */}
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <Image
                          src={selectedConv.participant.avatar}
                          alt={selectedConv.participant.name}
                          width={40}
                          height={40}
                          className="rounded-full object-cover"
                        />
                        <div>
                          <h3 className="font-medium text-gray-900">{selectedConv.participant.name}</h3>
                          <p className="text-sm text-gray-500">{selectedConv.participant.role}</p>
                        </div>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {selectedConv.messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.sender.name === 'You' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.sender.name === 'You'
                              ? 'bg-primary text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}>
                            <div className="flex items-center space-x-2 mb-1">
                              <i className={`${getTypeIcon(message.type)} text-xs ${getPriorityColor(message.priority)}`}></i>
                              <span className="text-xs font-medium">{message.subject}</span>
                            </div>
                            <p className="text-sm">{message.content}</p>
                            <p className={`text-xs mt-1 ${
                              message.sender.name === 'You' ? 'text-white/70' : 'text-gray-500'
                            }`}>
                              {new Date(message.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Message Input */}
                    <div className="p-4 border-t border-gray-200">
                      <div className="flex space-x-3">
                        <input
                          type="text"
                          placeholder="Type your message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                        />
                        <button
                          onClick={sendMessage}
                          disabled={!newMessage.trim()}
                          className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <i className="fas fa-paper-plane"></i>
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                        <i className="fas fa-envelope text-3xl text-gray-400"></i>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
                      <p className="text-gray-500">Choose a conversation from the list to start messaging.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
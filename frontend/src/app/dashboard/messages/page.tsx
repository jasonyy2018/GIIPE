'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import AuthGuard from '@/components/auth/AuthGuard';

function MessagesContent() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // User navigation items
  const userNavigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-home', href: '/dashboard', active: false },
    { id: 'events', label: 'My Events', icon: 'fas fa-calendar', href: '/dashboard/events', active: false },
    { id: 'bookmarks', label: 'Bookmarks', icon: 'fas fa-bookmark', href: '/dashboard/bookmarks', active: false },
    { id: 'messages', label: 'Messages', icon: 'fas fa-envelope', href: '/dashboard/messages', active: true },
    { id: 'network', label: 'Network', icon: 'fas fa-users', href: '/dashboard/network', active: false },
    { id: 'profile', label: 'Profile', icon: 'fas fa-user', href: '/dashboard/profile', active: false }
  ];

  useEffect(() => {
    // Simulate loading messages
    setTimeout(() => {
      setMessages([]);
      setLoading(false);
    }, 500);
  }, []);

  return (
    <DashboardLayout 
      title="Messages" 
      navigationItems={userNavigationItems}
      userRole="user"
    >
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <i className="fas fa-envelope-open text-4xl text-gray-400 mb-4"></i>
              <p className="text-gray-500 text-lg mb-2">No messages</p>
              <p className="text-gray-400 text-sm">Your messages will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{message.from}</h3>
                      <p className="text-gray-600">{message.subject}</p>
                      <p className="text-sm text-gray-400 mt-1">{message.date}</p>
                    </div>
                    {!message.read && (
                      <span className="h-2 w-2 bg-primary rounded-full"></span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function Messages() {
  return (
    <AuthGuard requireAuth={true}>
      <MessagesContent />
    </AuthGuard>
  );
}


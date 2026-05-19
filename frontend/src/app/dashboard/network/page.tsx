'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import AuthGuard from '@/components/auth/AuthGuard';
import Link from 'next/link';

function NetworkContent() {
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // User navigation items
  const userNavigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-home', href: '/dashboard', active: false },
    { id: 'events', label: 'My Events', icon: 'fas fa-calendar', href: '/dashboard/events', active: false },
    { id: 'bookmarks', label: 'Bookmarks', icon: 'fas fa-bookmark', href: '/dashboard/bookmarks', active: false },
    { id: 'messages', label: 'Messages', icon: 'fas fa-envelope', href: '/dashboard/messages', active: false },
    { id: 'network', label: 'Network', icon: 'fas fa-users', href: '/dashboard/network', active: true },
    { id: 'profile', label: 'Profile', icon: 'fas fa-user', href: '/dashboard/profile', active: false }
  ];

  useEffect(() => {
    // Simulate loading connections
    setTimeout(() => {
      setConnections([]);
      setLoading(false);
    }, 500);
  }, []);

  return (
    <DashboardLayout 
      title="Network" 
      navigationItems={userNavigationItems}
      userRole="user"
    >
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : connections.length === 0 ? (
            <div className="text-center py-12">
              <i className="fas fa-users text-4xl text-gray-400 mb-4"></i>
              <p className="text-gray-500 text-lg mb-2">No connections yet</p>
              <p className="text-gray-400 text-sm mb-4">Connect with other IP professionals</p>
              <Link href="/events" className="text-primary hover:text-primary-dark">
                Browse events to meet people →
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {connections.map((connection) => (
                <div key={connection.id} className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-semibold">
                      {connection.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{connection.name}</h3>
                      <p className="text-sm text-gray-600">{connection.organization}</p>
                    </div>
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

export default function Network() {
  return (
    <AuthGuard requireAuth={true}>
      <NetworkContent />
    </AuthGuard>
  );
}


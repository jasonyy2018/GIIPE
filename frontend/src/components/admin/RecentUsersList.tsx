'use client';

import { useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'Attendee' | 'Speaker' | 'Organizer' | 'Admin';
  avatar?: string;
}

export default function RecentUsersList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/admin/users', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          const usersData = data.users || data;
          
          const recentUsers = usersData?.slice(0, 5).map((user: any) => ({
              id: user.id,
              name: user.firstName && user.lastName 
                ? `${user.firstName} ${user.lastName}` 
                : user.username || 'Unknown User',
              email: user.email || 'No email',
              role: user.role || 'USER'
            }));
          
          setUsers(recentUsers);
        } else {
          console.error('Failed to fetch users');
          setUsers([]);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const getRoleBadge = (role: User['role']) => {
    const baseClasses = 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full';
    
    switch (role) {
      case 'Attendee':
        return `${baseClasses} bg-light text-primary-dark`;
      case 'Speaker':
        return `${baseClasses} bg-purple-100 text-purple-800`;
      case 'Organizer':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'Admin':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getAvatarUrl = (id: string) => {
    // Stable local placeholders (no external network dependency)
    const imgs = [
      '/images/features/innovation.jpg',
      '/images/features/research.jpg',
      '/images/features/collaboration.jpg',
    ];
    const n = Number.parseInt(id, 10);
    const idx = Number.isFinite(n) ? Math.abs(n) % imgs.length : 0;
    return imgs[idx];
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
            <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {users.map((user) => (
        <div key={user.id} className="flex items-center hover:bg-gray-50 p-2 rounded-lg transition-colors">
          <img
            className="h-10 w-10 rounded-full object-cover"
            src={user.avatar || getAvatarUrl(user.id)}
            alt={user.name}
            onError={(e) => {
              // Fallback to initials if image fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const fallback = target.nextElementSibling as HTMLElement;
              if (fallback) {
                fallback.style.display = 'flex';
              }
            }}
          />
          <div
            className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white font-semibold text-sm hidden"
          >
            {user.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
          <div className="ml-auto">
            <span className={getRoleBadge(user.role)}>
              {user.role}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
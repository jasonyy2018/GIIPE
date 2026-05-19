'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface User {
  id: number;
  name: string;
  email: string;
  avatar: string;
  role: string;
  organization: string;
  location: string;
  interests: string[];
  connectionStatus: 'none' | 'pending' | 'connected';
  lastActive: string;
}

export default function UsersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');

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
      
      // Load users (mock data for now)
      const mockUsers: User[] = [
        {
          id: 1,
          name: 'Dr. Sarah Chen',
          email: 'sarah.chen@university.edu',
          avatar: '/images/features/innovation.jpg',
          role: 'IP Researcher',
          organization: 'Stanford University',
          location: 'California, USA',
          interests: ['AI Patents', 'Innovation Policy', 'Technology Transfer'],
          connectionStatus: 'connected',
          lastActive: '2024-05-20T10:30:00Z'
        },
        {
          id: 2,
          name: 'Michael Rodriguez',
          email: 'mrodriguez@techcorp.com',
          avatar: '/images/features/research.jpg',
          role: 'Patent Attorney',
          organization: 'TechCorp Legal',
          location: 'New York, USA',
          interests: ['Software Patents', 'IP Litigation', 'Patent Strategy'],
          connectionStatus: 'pending',
          lastActive: '2024-05-19T15:45:00Z'
        },
        {
          id: 3,
          name: 'Dr. Li Wei',
          email: 'li.wei@innovation.cn',
          avatar: '/images/features/collaboration.jpg',
          role: 'Innovation Manager',
          organization: 'China Innovation Institute',
          location: 'Beijing, China',
          interests: ['Innovation Management', 'IP Policy', 'Technology Commercialization'],
          connectionStatus: 'none',
          lastActive: '2024-05-18T09:20:00Z'
        },
        {
          id: 4,
          name: 'Emma Thompson',
          email: 'emma.thompson@ipfirm.co.uk',
          avatar: '/images/features/innovation.jpg',
          role: 'IP Consultant',
          organization: 'London IP Associates',
          location: 'London, UK',
          interests: ['Trademark Law', 'Brand Protection', 'IP Valuation'],
          connectionStatus: 'none',
          lastActive: '2024-05-17T14:10:00Z'
        },
        {
          id: 5,
          name: 'Prof. James Wilson',
          email: 'j.wilson@mit.edu',
          avatar: '/images/features/research.jpg',
          role: 'Academic Researcher',
          organization: 'MIT',
          location: 'Massachusetts, USA',
          interests: ['Blockchain Patents', 'Cryptocurrency Law', 'Digital Innovation'],
          connectionStatus: 'connected',
          lastActive: '2024-05-20T08:15:00Z'
        }
      ];
      
      setUsers(mockUsers);
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.interests.some(interest => interest.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole = filterRole === 'all' || user.role.toLowerCase().includes(filterRole.toLowerCase());
    return matchesSearch && matchesRole;
  });

  const sendConnectionRequest = (userId: number) => {
    setUsers(prev =>
      prev.map(user =>
        user.id === userId ? { ...user, connectionStatus: 'pending' } : user
      )
    );
  };

  const sendMessage = (userId: number) => {
    router.push(`/messages?user=${userId}`);
  };

  const getConnectionStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'none':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getConnectionStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'pending':
        return 'Pending';
      case 'none':
        return 'Not Connected';
      default:
        return 'Unknown';
    }
  };

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
              <h1 className="text-2xl font-bold text-primary-dark">Network</h1>
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
          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Search users by name, organization, or interests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
                <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              </div>

              {/* Role Filter */}
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              >
                <option value="all">All Roles</option>
                <option value="researcher">Researchers</option>
                <option value="attorney">Attorneys</option>
                <option value="manager">Managers</option>
                <option value="consultant">Consultants</option>
              </select>
            </div>

            {/* Results Count */}
            <div className="mt-4 text-sm text-gray-600">
              {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
            </div>
          </div>

          {/* Users Grid */}
          {filteredUsers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredUsers.map((user) => (
                <div key={user.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center space-x-4 mb-4">
                    <Image
                      src={user.avatar}
                      alt={user.name}
                      width={60}
                      height={60}
                      className="rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{user.name}</h3>
                      <p className="text-sm text-gray-600">{user.role}</p>
                      <p className="text-sm text-gray-500">{user.organization}</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">
                      <i className="fas fa-map-marker-alt mr-1 text-gray-400"></i>
                      {user.location}
                    </p>
                    <p className="text-xs text-gray-500">
                      Last active: {new Date(user.lastActive).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Interests */}
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Interests:</p>
                    <div className="flex flex-wrap gap-1">
                      {user.interests.slice(0, 3).map((interest, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-light text-primary-dark"
                        >
                          {interest}
                        </span>
                      ))}
                      {user.interests.length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{user.interests.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Connection Status */}
                  <div className="mb-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConnectionStatusColor(user.connectionStatus)}`}>
                      {getConnectionStatusText(user.connectionStatus)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2">
                    {user.connectionStatus === 'none' && (
                      <button
                        onClick={() => sendConnectionRequest(user.id)}
                        className="flex-1 bg-primary text-white px-3 py-2 rounded-md hover:bg-primary-dark transition-colors text-sm"
                      >
                        <i className="fas fa-user-plus mr-1"></i>
                        Connect
                      </button>
                    )}
                    {user.connectionStatus === 'pending' && (
                      <button
                        disabled
                        className="flex-1 bg-gray-300 text-gray-500 px-3 py-2 rounded-md cursor-not-allowed text-sm"
                      >
                        <i className="fas fa-clock mr-1"></i>
                        Pending
                      </button>
                    )}
                    {user.connectionStatus === 'connected' && (
                      <button
                        onClick={() => sendMessage(user.id)}
                        className="flex-1 bg-primary text-white px-3 py-2 rounded-md hover:bg-primary-dark transition-colors text-sm"
                      >
                        <i className="fas fa-envelope mr-1"></i>
                        Message
                      </button>
                    )}
                    <button
                      onClick={() => router.push(`/users/${user.id}`)}
                      className="border border-primary text-primary px-3 py-2 rounded-md hover:bg-primary hover:text-white transition-colors text-sm"
                    >
                      <i className="fas fa-eye"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <i className="fas fa-users text-3xl text-gray-400"></i>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
              <p className="text-gray-500 mb-6">
                {searchQuery || filterRole !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Start connecting with other professionals in the IP community.'
                }
              </p>
              {(!searchQuery && filterRole === 'all') && (
                <button
                  onClick={() => router.push('/events')}
                  className="bg-primary text-white px-6 py-3 rounded-md hover:bg-primary-dark transition-colors"
                >
                  Discover Events
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
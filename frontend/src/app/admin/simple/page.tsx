'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AdminGuard from '@/components/AdminGuard';

function SimpleAdminPageContent() {
  const router = useRouter();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Simple Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-primary-dark">GIIP Admin Dashboard</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user?.profile?.firstName || user?.username || 'Admin'}</span>
              <button
                onClick={async () => {
                  await logout();
                  router.push('/login');
                }}
                className="bg-accent text-white px-4 py-2 rounded-md hover:bg-accent/90 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <i className="fas fa-users text-2xl text-primary"></i>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                      <dd className="text-lg font-medium text-gray-900">1,284</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <i className="fas fa-calendar-alt text-2xl text-primary"></i>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Upcoming Events</dt>
                      <dd className="text-lg font-medium text-gray-900">8</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <i className="fas fa-newspaper text-2xl text-primary"></i>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">News Articles</dt>
                      <dd className="text-lg font-medium text-gray-900">36</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <i className="fas fa-microphone text-2xl text-primary"></i>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Active Speakers</dt>
                      <dd className="text-lg font-medium text-gray-900">42</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white shadow rounded-lg mb-8">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button className="bg-accent text-white px-4 py-2 rounded-md hover:bg-accent/90 transition-colors">
                  <i className="fas fa-plus mr-2"></i>
                  Add New Event
                </button>
                <button className="bg-accent text-white px-4 py-2 rounded-md hover:bg-accent/90 transition-colors">
                  <i className="fas fa-newspaper mr-2"></i>
                  Create News Article
                </button>
                <button className="bg-accent text-white px-4 py-2 rounded-md hover:bg-accent/90 transition-colors">
                  <i className="fas fa-user-plus mr-2"></i>
                  Add New User
                </button>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <i className="fas fa-user-plus text-green-500"></i>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">New user registered: jane@example.com</p>
                    <p className="text-xs text-gray-500">2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <i className="fas fa-calendar-plus text-blue-500"></i>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">New event created: IP Strategy Conference</p>
                    <p className="text-xs text-gray-500">4 hours ago</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <i className="fas fa-edit text-yellow-500"></i>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">News article updated: Global Innovation Trends</p>
                    <p className="text-xs text-gray-500">6 hours ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SimpleAdminPage() {
  return (
    <AdminGuard>
      <SimpleAdminPageContent />
    </AdminGuard>
  );
}
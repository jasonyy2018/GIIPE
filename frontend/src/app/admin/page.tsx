'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import AdminGuard from '@/components/AdminGuard';

function AdminDashboardContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalEvents: 0,
    totalRegistrations: 0,
    totalRevenue: 0
  });
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [systemHealth, setSystemHealth] = useState({
    status: 'healthy',
    uptime: '99.9%',
    responseTime: '120ms',
    errorRate: '0.1%'
  });

  // Admin navigation items
  const adminNavigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt', href: '/admin', active: true },
    { id: 'users', label: 'Users', icon: 'fas fa-users', href: '/admin/users', active: false },
    { id: 'events', label: 'Events', icon: 'fas fa-calendar', href: '/admin/events', active: false },
    { id: 'registrations', label: 'Registrations', icon: 'fas fa-clipboard-list', href: '/admin/registrations', active: false },
    { id: 'analytics', label: 'Analytics', icon: 'fas fa-chart-bar', href: '/admin/analytics', active: false },
    { id: 'reports', label: 'Reports', icon: 'fas fa-file-alt', href: '/admin/reports', active: false },
    { id: 'orders', label: 'Payment Ledger', icon: 'fas fa-receipt', href: '/admin/orders', active: false }
  ];

  useEffect(() => {
    // Only load admin data if user is authenticated
    if (!user) {
      return;
    }

    // Load admin data
    const loadAdminData = async () => {
      try {
        setLoading(true);
        
        // Set default stats immediately
        setStats({
          totalUsers: 0,
          totalEvents: 0,
          totalRegistrations: 0,
          totalRevenue: 0
        });

        // Fetch real event data
        const token = localStorage.getItem('authToken');
        const eventsResponse = await fetch('/api/admin/events', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (eventsResponse.ok) {
          const eventsData = await eventsResponse.json();
          const events = eventsData.events || eventsData;
          
          const recentEventsData = events?.slice(0, 3).map((event: any) => ({
              id: event.id,
              title: event.title,
              date: new Date(event.startDate).toLocaleDateString('en-CA'), // YYYY-MM-DD format
              registrations: event.registrationCount || 0,
              status: event.status.toLowerCase()
            }));
          
          setRecentEvents(recentEventsData);
          
          // Update stats with real data
          setStats({
            totalUsers: eventsData.totalUsers || 0,
            totalEvents: events.length || 0,
            totalRegistrations: events.reduce((sum: number, e: any) => sum + (e.registrationCount || 0), 0),
            totalRevenue: 0 // TODO: Calculate from registrations if needed
          });
        } else {
          setRecentEvents([]);
        }

        // Set mock recent users (can be replaced with real API call)
        setRecentUsers([
          { id: 1, name: 'John Doe', email: 'john@example.com', joinDate: '2024-01-15', status: 'active' },
          { id: 2, name: 'Jane Smith', email: 'jane@example.com', joinDate: '2024-01-14', status: 'active' },
          { id: 3, name: 'Bob Johnson', email: 'bob@example.com', joinDate: '2024-01-13', status: 'pending' }
        ]);

        setLoading(false);
      } catch (error) {
        console.error('Error loading admin data:', error);
        setLoading(false);
      }
    };

    loadAdminData();
  }, [user]);

  if (loading) {
    return (
      <DashboardLayout 
        title="Admin Dashboard" 
        navigationItems={adminNavigationItems}
        userRole="admin"
      >
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Admin Dashboard" 
      navigationItems={adminNavigationItems}
      userRole="admin"
    >
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-primary to-primary-dark rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">Welcome back, Admin! 👋</h1>
              <p className="text-primary-light">Here's what's happening with your platform today.</p>
            </div>
            <div className="hidden md:block">
              <div className="flex space-x-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                  <div className="text-sm text-primary-light">Total Users</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{stats.totalEvents}</div>
                  <div className="text-sm text-primary-light">Total Events</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{stats.totalRegistrations}</div>
                  <div className="text-sm text-primary-light">Registrations</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-light rounded-md flex items-center justify-center">
                  <i className="fas fa-users text-primary"></i>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers.toLocaleString()}</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm text-green-600">
                <i className="fas fa-arrow-up mr-1"></i>
                <span>12% from last month</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                  <i className="fas fa-calendar text-green-600"></i>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Events</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalEvents}</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm text-green-600">
                <i className="fas fa-arrow-up mr-1"></i>
                <span>8% from last month</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                  <i className="fas fa-clipboard-list text-yellow-600"></i>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Registrations</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalRegistrations.toLocaleString()}</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm text-green-600">
                <i className="fas fa-arrow-up mr-1"></i>
                <span>15% from last month</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                  <i className="fas fa-dollar-sign text-purple-600"></i>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Revenue</p>
                <p className="text-2xl font-bold text-gray-900">${stats.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm text-green-600">
                <i className="fas fa-arrow-up mr-1"></i>
                <span>23% from last month</span>
              </div>
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">System Health</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{systemHealth.status === 'healthy' ? '✓' : '✗'}</div>
              <div className="text-sm text-gray-500">System Status</div>
              <div className="text-sm font-medium text-gray-900 capitalize">{systemHealth.status}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{systemHealth.uptime}</div>
              <div className="text-sm text-gray-500">Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{systemHealth.responseTime}</div>
              <div className="text-sm text-gray-500">Response Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{systemHealth.errorRate}</div>
              <div className="text-sm text-gray-500">Error Rate</div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Users */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Recent Users</h3>
              <a href="/admin/users" className="text-sm text-primary hover:text-primary-dark">View all</a>
            </div>
            <div className="space-y-4">
              {recentUsers.map((user: any) => (
                <div key={user.id} className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 font-medium text-sm">
                        {user.name.split(' ').map((n: string) => n[0]).join('')}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                    <p className="text-sm text-gray-500 truncate">{user.email}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {user.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Events */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Recent Events</h3>
              <a href="/admin/events" className="text-sm text-primary hover:text-primary-dark">View all</a>
            </div>
            <div className="space-y-4">
              {recentEvents.map((event: any) => (
                <div key={event.id} className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 bg-primary-light rounded-md flex items-center justify-center">
                      <i className="fas fa-calendar text-primary"></i>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{event.title}</p>
                    <p className="text-sm text-gray-500">{event.date} • {event.registrations} registrations</p>
                  </div>
                  <div className="flex-shrink-0">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      event.status === 'PUBLISHED' || event.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {event.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <i className="fas fa-user-plus text-2xl text-primary mb-2"></i>
              <span className="text-sm font-medium text-gray-900">Add User</span>
            </button>
            <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <i className="fas fa-calendar-plus text-2xl text-green-600 mb-2"></i>
              <span className="text-sm font-medium text-gray-900">Create Event</span>
            </button>
            <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <i className="fas fa-newspaper text-2xl text-purple-600 mb-2"></i>
              <span className="text-sm font-medium text-gray-900">Add News</span>
            </button>
            <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <i className="fas fa-chart-bar text-2xl text-yellow-600 mb-2"></i>
              <span className="text-sm font-medium text-gray-900">View Analytics</span>
            </button>
            <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <i className="fas fa-cog text-2xl text-gray-600 mb-2"></i>
              <span className="text-sm font-medium text-gray-900">Settings</span>
            </button>
            <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <i className="fas fa-file-export text-2xl text-red-600 mb-2"></i>
              <span className="text-sm font-medium text-gray-900">Export Data</span>
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function AdminDashboard() {
  return (
    <AdminGuard>
      <AdminDashboardContent />
    </AdminGuard>
  );
}
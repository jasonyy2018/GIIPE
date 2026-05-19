'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import AuthGuard from '@/components/auth/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { publicAPI } from '@/lib/public-api';
import { Event } from '@/types/public';
import { getImageUrl } from '@/utils/extractImage';

function UserDashboardContent() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  
  // User navigation items
  const userNavigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-home', href: '/dashboard', active: true },
    { id: 'events', label: 'My Events', icon: 'fas fa-calendar', href: '/dashboard/events', active: false },
    { id: 'bookmarks', label: 'Bookmarks', icon: 'fas fa-bookmark', href: '/dashboard/bookmarks', active: false },
    { id: 'messages', label: 'Messages', icon: 'fas fa-envelope', href: '/dashboard/messages', active: false },
    { id: 'network', label: 'Network', icon: 'fas fa-users', href: '/dashboard/network', active: false },
    { id: 'profile', label: 'Profile', icon: 'fas fa-user', href: '/dashboard/profile', active: false }
  ];

  const [stats, setStats] = useState({
    eventsAttended: 0,
    upcomingEvents: 0,
    savedArticles: 0
  });

  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch user registrations
        const registrations = await publicAPI.getMyRegistrations();
        const pastRegistrations = registrations.filter((reg: any) => {
          // Find the event to check if it's past
          return reg.event && new Date(reg.event.endDate) < new Date();
        });
        const upcomingRegistrations = registrations.filter((reg: any) => {
          return reg.event && new Date(reg.event.startDate) > new Date();
        });

        // Format upcoming registered events for display
        const upcoming = upcomingRegistrations?.slice(0, 3)
          .map((reg: any) => {
            const event = reg.event;
            return {
              id: event.id,
              title: event.title,
              date: new Date(event.startDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }),
              time: `${new Date(event.startDate).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })} - ${new Date(event.endDate).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })}`,
              location: event.location || 'TBD',
              imageUrl: getImageUrl(event.featuredImage, event.contentMarkdown, event.contentHtml, 'event'),
              status: reg.status === 'confirmed' ? 'Confirmed' : reg.status === 'pending' ? 'Pending' : 'Registered',
              event: event,
              registeredAt: reg.registeredAt
            };
          });

        // Build recent activity from registrations
        const activities: any[] = [];
        
        // Add registration activities (most recent first)
        registrations?.sort((a: any, b: any) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime())
          .slice(0, 5)
          .forEach((reg: any) => {
            if (reg.event) {
              const registeredDate = new Date(reg.registeredAt);
              const timeAgo = getTimeAgo(registeredDate);
              activities.push({
                id: `reg-${reg.id}`,
                type: 'registration',
                title: `Registered for ${reg.event.title}`,
                time: timeAgo,
                icon: 'fas fa-calendar-plus',
                timestamp: registeredDate
              });
            }
          });

        // Sort all activities by timestamp (most recent first)
        activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        
        // Take only the most recent 3 activities
        setRecentActivity(activities.slice(0, 3));

        // Update stats
        setStats({
          eventsAttended: pastRegistrations.length,
          upcomingEvents: upcomingRegistrations.length,
          savedArticles: 0 // TODO: Implement bookmarks feature
        });

        setUpcomingEvents(upcoming);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Set default values on error
        setStats({
          eventsAttended: 0,
          upcomingEvents: 0,
          savedArticles: 0
        });
      } finally {
        setLoading(false);
      }
    };

    if (authUser) {
      fetchDashboardData();
    }
  }, [authUser]);

  // Helper function to format time ago
  function getTimeAgo(date: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    } else if (diffInSeconds < 2592000) {
      const weeks = Math.floor(diffInSeconds / 604800);
      return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
    } else {
      const months = Math.floor(diffInSeconds / 2592000);
      return `${months} ${months === 1 ? 'month' : 'months'} ago`;
    }
  }

  return (
    <DashboardLayout 
      title="Dashboard" 
      navigationItems={userNavigationItems}
      userRole="user"
    >
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-primary to-primary-dark rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">Welcome back! 👋</h1>
              <p className="text-primary-light">Here's what's happening in your intellectual property world.</p>
            </div>
            <div className="hidden md:block">
              <div className="flex space-x-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">{stats.eventsAttended}</div>
                  <div className="text-sm text-primary-light">Events Attended</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{stats.upcomingEvents}</div>
                  <div className="text-sm text-primary-light">Upcoming Events</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{stats.savedArticles}</div>
                  <div className="text-sm text-primary-light">Saved Articles</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-light rounded-md flex items-center justify-center">
                  <i className="fas fa-calendar-check text-primary"></i>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Events Attended</p>
                <p className="text-2xl font-bold text-gray-900">{stats.eventsAttended}</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm text-green-600">
                <i className="fas fa-check-circle mr-1"></i>
                <span>{stats.eventsAttended} total</span>
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
                <p className="text-sm font-medium text-gray-500">Upcoming Events</p>
                <p className="text-2xl font-bold text-gray-900">{stats.upcomingEvents}</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm text-primary">
                <i className="fas fa-clock mr-1"></i>
                <span>{stats.upcomingEvents > 0 ? `${stats.upcomingEvents} registered` : 'No upcoming events'}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                  <i className="fas fa-bookmark text-yellow-600"></i>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Saved Articles</p>
                <p className="text-2xl font-bold text-gray-900">{stats.savedArticles}</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm text-green-600">
                <i className="fas fa-plus mr-1"></i>
                <span>2 new this week</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming Events */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">Upcoming Events</h3>
              <Link href="/dashboard/events" className="text-sm text-primary hover:text-primary-dark">View all</Link>
            </div>
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Loading events...</p>
                </div>
              ) : upcomingEvents.length === 0 ? (
                <div className="text-center py-8">
                  <i className="fas fa-calendar-times text-4xl text-gray-400 mb-4"></i>
                  <p className="text-sm text-gray-500">No upcoming registered events</p>
                  <Link href="/events" className="text-primary hover:text-primary-dark text-sm mt-2 inline-block">
                    Browse events →
                  </Link>
                </div>
              ) : (
                upcomingEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors block"
                  >
                    <div className="flex-shrink-0">
                      <Image
                        src={event.imageUrl}
                        alt={event.title}
                        width={64}
                        height={64}
                        className="rounded-lg object-cover"
                        unoptimized={event.imageUrl.startsWith('/api/uploads/') || event.imageUrl.includes('localhost')}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">{event.title}</h4>
                      <p className="text-sm text-gray-500">{event.date} • {event.time}</p>
                      <p className="text-sm text-gray-500">{event.location}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        event.status === 'Confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {event.status}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Recent Activity</h3>
            <div className="space-y-4">
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-start space-x-3 animate-pulse">
                      <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="text-center py-8">
                  <i className="fas fa-history text-4xl text-gray-400 mb-4"></i>
                  <p className="text-sm text-gray-500">No recent activity</p>
                </div>
              ) : (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-primary-light rounded-full flex items-center justify-center">
                        <i className={`${activity.icon} text-primary text-sm`}></i>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/events" className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-light rounded-md flex items-center justify-center">
                  <i className="fas fa-calendar-plus text-primary"></i>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Register for Event</p>
                <p className="text-xs text-gray-500">Find and join events</p>
              </div>
            </Link>

            <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                  <i className="fas fa-bookmark text-green-600"></i>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Save Article</p>
                <p className="text-xs text-gray-500">Bookmark resources</p>
              </div>
            </button>

            <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                  <i className="fas fa-users text-purple-600"></i>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Connect</p>
                <p className="text-xs text-gray-500">Network with peers</p>
              </div>
            </button>

            <Link href="/dashboard/profile" className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                  <i className="fas fa-user-edit text-yellow-600"></i>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Update Profile</p>
                <p className="text-xs text-gray-500">Edit your information</p>
              </div>
            </Link>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}

export default function UserDashboard() {
  return (
    <AuthGuard requireAuth={true}>
      <UserDashboardContent />
    </AuthGuard>
  );
}
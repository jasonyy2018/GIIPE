'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import AuthGuard from '@/components/auth/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { publicAPI } from '@/lib/public-api';
import { Event } from '@/types/public';
import { getImageUrl } from '@/utils/extractImage';
import Image from 'next/image';
import { format } from 'date-fns';

function MyEventsContent() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  // User navigation items
  const userNavigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-home', href: '/dashboard', active: false },
    { id: 'events', label: 'My Events', icon: 'fas fa-calendar', href: '/dashboard/events', active: true },
    { id: 'bookmarks', label: 'Bookmarks', icon: 'fas fa-bookmark', href: '/dashboard/bookmarks', active: false },
    { id: 'messages', label: 'Messages', icon: 'fas fa-envelope', href: '/dashboard/messages', active: false },
    { id: 'network', label: 'Network', icon: 'fas fa-users', href: '/dashboard/network', active: false },
    { id: 'profile', label: 'Profile', icon: 'fas fa-user', href: '/dashboard/profile', active: false }
  ];

  useEffect(() => {
    const fetchMyEvents = async () => {
      try {
        setLoading(true);
        
        // Fetch user registrations
        const registrationsData = await publicAPI.getMyRegistrations();
        setRegistrations(registrationsData);
        
        // Extract event IDs from registrations
        const eventIds = registrationsData.map((reg: any) => reg.eventId || reg.event?.id).filter(Boolean);
        
        // Fetch events
        const allEvents: Event[] = [];
        for (const eventId of eventIds) {
          try {
            const event = await publicAPI.getEvent(eventId);
            if (event) allEvents.push(event);
          } catch (err) {
            console.error(`Error fetching event ${eventId}:`, err);
          }
        }
        
        setEvents(allEvents);
      } catch (error) {
        console.error('Error fetching my events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMyEvents();
  }, []);

  const now = new Date();
  const upcomingEvents = events.filter(event => new Date(event.startDate) > now);
  const pastEvents = events.filter(event => new Date(event.endDate) < now);

  const displayEvents = activeTab === 'upcoming' ? upcomingEvents : pastEvents;

  return (
    <DashboardLayout 
      title="My Events" 
      navigationItems={userNavigationItems}
      userRole="user"
    >
      <div className="space-y-6">
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('upcoming')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'upcoming'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Upcoming Events ({upcomingEvents.length})
              </button>
              <button
                onClick={() => setActiveTab('past')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'past'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Past Events ({pastEvents.length})
              </button>
            </nav>
          </div>

          {/* Events List */}
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : displayEvents.length === 0 ? (
              <div className="text-center py-12">
                <i className="fas fa-calendar-times text-4xl text-gray-400 mb-4"></i>
                <p className="text-gray-500 text-lg mb-2">No {activeTab === 'upcoming' ? 'upcoming' : 'past'} events</p>
                <Link href="/events" className="text-primary hover:text-primary-dark">
                  Browse all events →
                </Link>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {displayEvents.map((event) => {
                  const imageUrl = getImageUrl(event.featuredImage, event.contentMarkdown, event.contentHtml, 'event');
                  const registration = registrations.find((reg: any) => 
                    (reg.eventId || reg.event?.id) === event.id
                  );
                  
                  return (
                    <Link
                      key={event.id}
                      href={`/events/${event.id}`}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden"
                    >
                      <div className="relative h-48 w-full">
                        <Image
                          src={imageUrl}
                          alt={event.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          unoptimized={imageUrl.startsWith('/api/uploads/') || imageUrl.includes('localhost')}
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-lg mb-2 line-clamp-2">{event.title}</h3>
                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex items-center">
                            <i className="fas fa-calendar w-4 mr-2 text-primary"></i>
                            {format(new Date(event.startDate), 'MMM dd, yyyy')}
                          </div>
                          {event.location && (
                            <div className="flex items-center">
                              <i className="fas fa-map-marker-alt w-4 mr-2 text-primary"></i>
                              {event.location}
                            </div>
                          )}
                          {registration && (
                            <div className="flex items-center text-primary">
                              <i className="fas fa-check-circle w-4 mr-2"></i>
                              Registered
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function MyEvents() {
  return (
    <AuthGuard requireAuth={true}>
      <MyEventsContent />
    </AuthGuard>
  );
}


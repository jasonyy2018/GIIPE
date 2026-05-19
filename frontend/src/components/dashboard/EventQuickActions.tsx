'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Event, Registration } from '@/types/public';
import { publicAPI } from '@/lib/public-api';

interface QuickActionProps {
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'success' | 'warning';
}

interface EventQuickActionsProps {
  userId: string;
}

function QuickActionCard({ icon, title, description, onClick, loading, disabled, variant = 'primary' }: QuickActionProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'border-primary bg-primary/5 hover:bg-primary/10 text-primary';
      case 'secondary':
        return 'border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700';
      case 'success':
        return 'border-green-300 bg-green-50 hover:bg-green-100 text-green-700';
      case 'warning':
        return 'border-yellow-300 bg-yellow-50 hover:bg-yellow-100 text-yellow-700';
      default:
        return 'border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700';
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        w-full p-4 border-2 rounded-lg transition-all duration-200 text-left
        ${getVariantClasses()}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}
        ${loading ? 'animate-pulse' : ''}
      `}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {loading ? (
            <i className="fas fa-spinner fa-spin text-xl"></i>
          ) : (
            <i className={`${icon} text-xl`}></i>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm mb-1">{title}</h4>
          <p className="text-xs opacity-80 line-clamp-2">{description}</p>
        </div>
      </div>
    </button>
  );
}

export default function EventQuickActions({ userId }: EventQuickActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [recentEvent, setRecentEvent] = useState<Event | null>(null);

  useEffect(() => {
    loadQuickActionData();
  }, [userId]);

  const loadQuickActionData = async () => {
    try {
      // Load upcoming events and user registrations
      const [eventsResponse, userRegistrations] = await Promise.all([
        publicAPI.getEvents({
          status: 'published' as any,
          startDate: new Date().toISOString(),
          limit: 5,
          page: 1
        }),
        publicAPI.getMyRegistrations()
      ]);

      setUpcomingEvents(eventsResponse.data || eventsResponse.events || []);
      setRegistrations(userRegistrations);

      // Set the most recent upcoming event for quick actions
      const events = eventsResponse.data || eventsResponse.events || [];
      if (events.length > 0) {
        setRecentEvent(events[0]);
      }
    } catch (err) {
      console.error('Error loading quick action data:', err);
    }
  };

  const setActionLoading = (action: string, isLoading: boolean) => {
    setLoading(prev => ({ ...prev, [action]: isLoading }));
  };

  const handleQuickRegister = async () => {
    if (!recentEvent) return;

    setActionLoading('register', true);
    try {
      const registration = await publicAPI.registerForEvent(recentEvent.id);
      setRegistrations(prev => [...prev, registration]);
      
      // Update the event in the list
      setUpcomingEvents(prev => prev.map(event => 
        event.id === recentEvent.id 
          ? { ...event, registrationCount: (event.registrationCount || 0) + 1, isRegistered: true }
          : event
      ));

      // Show success feedback (in a real app, you might use a toast notification)
      console.log('Successfully registered for event');
    } catch (err) {
      console.error('Error registering for event:', err);
    } finally {
      setActionLoading('register', false);
    }
  };

  const handleExportCalendar = async () => {
    setActionLoading('calendar', true);
    try {
      // Get user's registered events
      const registeredEventIds = registrations.map(r => r.eventId);
      const registeredEvents = upcomingEvents.filter(e => registeredEventIds.includes(e.id));

      if (registeredEvents.length === 0) {
        alert('No registered events to export');
        return;
      }

      // Generate ICS file content
      const icsContent = generateICSFile(registeredEvents);
      
      // Create and download the file
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'my-events.ics';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('Calendar exported successfully');
    } catch (err) {
      console.error('Error exporting calendar:', err);
    } finally {
      setActionLoading('calendar', false);
    }
  };

  const generateICSFile = (events: Event[]): string => {
    const formatDateForICS = (dateString: string): string => {
      const date = new Date(dateString);
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Your App//Event Calendar//EN',
      'CALSCALE:GREGORIAN'
    ];

    events.forEach(event => {
      icsContent.push(
        'BEGIN:VEVENT',
        `UID:${event.id}@yourapp.com`,
        `DTSTART:${formatDateForICS(event.startDate)}`,
        `DTEND:${formatDateForICS(event.endDate)}`,
        `SUMMARY:${event.title}`,
        `DESCRIPTION:${event.description?.replace(/\n/g, '\\n') || ''}`,
        `LOCATION:${event.location}`,
        `STATUS:CONFIRMED`,
        'END:VEVENT'
      );
    });

    icsContent.push('END:VCALENDAR');
    return icsContent.join('\r\n');
  };

  const handleShareEvents = async () => {
    setActionLoading('share', true);
    try {
      const registeredEventIds = registrations.map(r => r.eventId);
      const registeredEvents = upcomingEvents.filter(e => registeredEventIds.includes(e.id));

      if (registeredEvents.length === 0) {
        alert('No registered events to share');
        return;
      }

      const shareText = `Check out the events I'm attending:\n\n${registeredEvents.map(event => 
        `📅 ${event.title}\n📍 ${event.location}\n🗓️ ${new Date(event.startDate).toLocaleDateString()}\n${window.location.origin}/events/${event.id}`
      ).join('\n\n')}`;

      if (navigator.share) {
        await navigator.share({
          title: 'My Upcoming Events',
          text: shareText,
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(shareText);
        alert('Event details copied to clipboard!');
      }

      console.log('Events shared successfully');
    } catch (err) {
      console.error('Error sharing events:', err);
    } finally {
      setActionLoading('share', false);
    }
  };

  const handleCreateEvent = () => {
    // Navigate to event creation page (if available)
    router.push('/events/create');
  };

  const handleFindEvents = () => {
    router.push('/events');
  };

  const handleManageRegistrations = () => {
    router.push('/profile?tab=events');
  };

  const isRegisteredForRecentEvent = recentEvent && registrations.some(r => r.eventId === recentEvent.id);
  const hasRegisteredEvents = registrations.length > 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Quick Register for Latest Event */}
      {recentEvent && !isRegisteredForRecentEvent && (
        <QuickActionCard
          icon="fas fa-bolt"
          title="Quick Register"
          description={`Register for "${recentEvent.title}" - ${new Date(recentEvent.startDate).toLocaleDateString()}`}
          onClick={handleQuickRegister}
          loading={loading.register}
          variant="primary"
        />
      )}

      {/* Export Calendar */}
      <QuickActionCard
        icon="fas fa-calendar-download"
        title="Export Calendar"
        description={hasRegisteredEvents 
          ? `Export ${registrations.length} registered event${registrations.length !== 1 ? 's' : ''} to your calendar`
          : "Export your registered events to calendar (no events registered yet)"
        }
        onClick={handleExportCalendar}
        loading={loading.calendar}
        disabled={!hasRegisteredEvents}
        variant={hasRegisteredEvents ? "success" : "secondary"}
      />

      {/* Share Events */}
      <QuickActionCard
        icon="fas fa-share-alt"
        title="Share My Events"
        description={hasRegisteredEvents
          ? `Share your ${registrations.length} upcoming event${registrations.length !== 1 ? 's' : ''} with others`
          : "Share your event schedule (no events registered yet)"
        }
        onClick={handleShareEvents}
        loading={loading.share}
        disabled={!hasRegisteredEvents}
        variant={hasRegisteredEvents ? "primary" : "secondary"}
      />

      {/* Find Events */}
      <QuickActionCard
        icon="fas fa-search"
        title="Find Events"
        description="Discover new events based on your interests and location"
        onClick={handleFindEvents}
        variant="secondary"
      />

      {/* Manage Registrations */}
      <QuickActionCard
        icon="fas fa-list-check"
        title="Manage Registrations"
        description={hasRegisteredEvents
          ? `View and manage your ${registrations.length} event registration${registrations.length !== 1 ? 's' : ''}`
          : "View your event registrations (none yet)"
        }
        onClick={handleManageRegistrations}
        variant="secondary"
      />

      {/* Create Event (if user has permission) */}
      <QuickActionCard
        icon="fas fa-plus-circle"
        title="Create Event"
        description="Organize your own event and invite others to join"
        onClick={handleCreateEvent}
        variant="warning"
      />
    </div>
  );
}
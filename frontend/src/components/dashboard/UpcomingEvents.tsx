'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Event, Registration, RegistrationStatus, EventStatus } from '@/types/public';
import { publicAPI } from '@/lib/public-api';

interface EventCardProps {
  event: Event;
  registration?: Registration;
  onRegister: (eventId: string) => void;
  onCancel: (registrationId: string) => void;
  onAddToCalendar: (event: Event) => void;
  onShare: (event: Event) => void;
}

interface UpcomingEventsProps {
  userId: string;
  limit?: number;
}

function EventCard({ event, registration, onRegister, onCancel, onAddToCalendar, onShare }: EventCardProps) {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const eventTime = new Date(event.startDate).getTime();
      const difference = eventTime - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

        if (days > 0) {
          setTimeLeft(`${days}d ${hours}h`);
        } else if (hours > 0) {
          setTimeLeft(`${hours}h ${minutes}m`);
        } else {
          setTimeLeft(`${minutes}m`);
        }
      } else {
        setTimeLeft('Started');
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [event.startDate]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusColor = (status?: RegistrationStatus) => {
    switch (status) {
      case RegistrationStatus.CONFIRMED:
        return 'bg-green-100 text-green-800';
      case RegistrationStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800';
      case RegistrationStatus.WAITLISTED:
        return 'bg-light text-primary-dark';
      case RegistrationStatus.CANCELLED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status?: RegistrationStatus) => {
    switch (status) {
      case RegistrationStatus.CONFIRMED:
        return 'Registered';
      case RegistrationStatus.PENDING:
        return 'Pending';
      case RegistrationStatus.WAITLISTED:
        return 'Waitlisted';
      case RegistrationStatus.CANCELLED:
        return 'Cancelled';
      default:
        return 'Available';
    }
  };

  const isRegistered = registration && registration.status !== RegistrationStatus.CANCELLED;
  const canRegister = !isRegistered && event.registrationDeadline && new Date(event.registrationDeadline) > new Date();

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      {/* Event Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 
            className="font-semibold text-gray-900 hover:text-primary cursor-pointer line-clamp-2"
            onClick={() => router.push(`/events/${event.id}`)}
          >
            {event.title}
          </h4>
          <div className="flex items-center text-sm text-gray-500 mt-1">
            <i className="fas fa-calendar-alt mr-1"></i>
            <span>{formatDate(event.startDate)}</span>
            <span className="mx-2"></span>
            <i className="fas fa-clock mr-1"></i>
            <span>{formatTime(event.startDate)}</span>
          </div>
        </div>
        
        {/* Status Badge */}
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(registration?.status)}`}>
          {getStatusText(registration?.status)}
        </span>
      </div>

      {/* Event Details */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <i className="fas fa-map-marker-alt mr-2 w-4"></i>
          <span className="truncate">{event.location}</span>
        </div>
        
        {/* Countdown Timer */}
        <div className="flex items-center text-sm">
          <i className="fas fa-hourglass-half mr-2 w-4 text-primary"></i>
          <span className="font-medium text-primary">{timeLeft}</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex space-x-2">
          {canRegister && (
            <button
              onClick={() => onRegister(event.id)}
              className="flex items-center px-3 py-1.5 bg-primary text-white text-sm rounded-md hover:bg-primary-dark transition-colors"
            >
              <i className="fas fa-plus mr-1"></i>
              Register
            </button>
          )}
          
          {isRegistered && registration && (
            <button
              onClick={() => onCancel(registration.id)}
              className="flex items-center px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
            >
              <i className="fas fa-times mr-1"></i>
              Cancel
            </button>
          )}
        </div>

        <div className="flex space-x-1">
          <button
            onClick={() => onAddToCalendar(event)}
            className="p-2 text-gray-400 hover:text-primary transition-colors"
            title="Add to Calendar"
          >
            <i className="fas fa-calendar-plus"></i>
          </button>
          
          <button
            onClick={() => onShare(event)}
            className="p-2 text-gray-400 hover:text-primary transition-colors"
            title="Share Event"
          >
            <i className="fas fa-share-alt"></i>
          </button>
          
          <button
            onClick={() => router.push(`/events/${event.id}`)}
            className="p-2 text-gray-400 hover:text-primary transition-colors"
            title="View Details"
          >
            <i className="fas fa-external-link-alt"></i>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UpcomingEvents({ userId, limit = 5 }: UpcomingEventsProps) {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadUpcomingEvents();
    loadUserRegistrations();
  }, [userId]);

  const loadUpcomingEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get upcoming events (published events only, no date filtering)
      // Show all PUBLISHED events regardless of startDate
      const response = await publicAPI.getEvents({
        status: EventStatus.PUBLISHED,
        limit: limit,
        page: 1,
        sortBy: 'startDate',
        sortOrder: 'asc' // Sort by start date ascending (earliest first for upcoming events)
      });
      
      // Handle both response.events and response.data for backward compatibility
      const events = response.events || response.data || [];
      setEvents(events);
    } catch (err) {
      console.error('Error loading upcoming events:', err);
      setError('Failed to load upcoming events');
    } finally {
      setLoading(false);
    }
  };

  const loadUserRegistrations = async () => {
    try {
      const userRegistrations = await publicAPI.getMyRegistrations();
      setRegistrations(userRegistrations);
    } catch (err) {
      console.error('Error loading user registrations:', err);
      // Don't set error for registrations as it's not critical
    }
  };

  const handleRegister = async (eventId: string) => {
    setActionLoading(prev => ({ ...prev, [eventId]: true }));
    try {
      const registration = await publicAPI.registerForEvent(eventId);
      setRegistrations(prev => [...prev, registration]);
      
      // Update event registration count
      setEvents(prev => prev.map(event => 
        event.id === eventId 
          ? { ...event, registrationCount: (event.registrationCount || 0) + 1, isRegistered: true }
          : event
      ));
    } catch (err) {
      console.error('Error registering for event:', err);
      // You might want to show a toast notification here
    } finally {
      setActionLoading(prev => ({ ...prev, [eventId]: false }));
    }
  };

  const handleCancel = async (registrationId: string) => {
    setActionLoading(prev => ({ ...prev, [registrationId]: true }));
    try {
      await publicAPI.cancelRegistration(registrationId);
      
      // Remove registration from state
      const cancelledRegistration = registrations.find(r => r.id === registrationId);
      setRegistrations(prev => prev.filter(r => r.id !== registrationId));
      
      // Update event registration count
      if (cancelledRegistration) {
        setEvents(prev => prev.map(event => 
          event.id === cancelledRegistration.eventId 
            ? { ...event, registrationCount: Math.max((event.registrationCount || 1) - 1, 0), isRegistered: false }
            : event
        ));
      }
    } catch (err) {
      console.error('Error cancelling registration:', err);
      // You might want to show a toast notification here
    } finally {
      setActionLoading(prev => ({ ...prev, [registrationId]: false }));
    }
  };

  const handleAddToCalendar = (event: Event) => {
    // Create calendar event URL (Google Calendar format)
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);
    
    const formatDateForCalendar = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${formatDateForCalendar(startDate)}/${formatDateForCalendar(endDate)}&details=${encodeURIComponent(event.description || '')}&location=${encodeURIComponent(event.location || '')}`;
    
    window.open(calendarUrl, '_blank');
  };

  const handleShare = (event: Event) => {
    const eventUrl = `${window.location.origin}/events/${event.id}`;
    
    if (navigator.share) {
      navigator.share({
        title: event.title,
        text: event.description,
        url: eventUrl,
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(eventUrl).then(() => {
        // You might want to show a toast notification here
        console.log('Event URL copied to clipboard');
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse bg-gray-100 rounded-lg p-4">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 mb-3"></div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 mb-2">
          <i className="fas fa-exclamation-triangle text-2xl"></i>
        </div>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={loadUpcomingEvents}
          className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <i className="fas fa-calendar-alt text-3xl mb-4"></i>
        <p className="mb-2">No upcoming events</p>
        <p className="text-sm mb-4">Check back later for new events</p>
        <button
          onClick={() => router.push('/events')}
          className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors"
        >
          Browse All Events
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.map(event => {
        const registration = registrations.find(r => r.eventId === event.id && r.status !== RegistrationStatus.CANCELLED);
        return (
          <EventCard
            key={event.id}
            event={event}
            registration={registration}
            onRegister={handleRegister}
            onCancel={handleCancel}
            onAddToCalendar={handleAddToCalendar}
            onShare={handleShare}
          />
        );
      })}
      
      {events.length >= limit && (
        <div className="text-center pt-4">
          <button
            onClick={() => router.push('/events')}
            className="text-primary hover:text-primary-dark font-medium"
          >
            View All Events �?
          </button>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';

interface Event {
  id: string;
  title: string;
  date: string;
  location: string;
  status: 'Confirmed' | 'Pending' | 'Cancelled';
}

export default function UpcomingEventsTable() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/admin/events', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          const eventsData = data.events || data;
          
          // Refetch data to ensure synchronization
          const upcomingEvents = eventsData?.filter((event: any) => new Date(event.startDate) > new Date())
            .slice(0, 5).map((event: any) => ({
              id: event.id,
              title: event.title,
              date: new Date(event.startDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }),
              location: event.location || 'TBD',
              status: event.status === 'PUBLISHED' ? 'Confirmed' : 'Pending'
            }));
          
          setEvents(upcomingEvents);
        } else {
          console.error('Failed to fetch events');
          setEvents([]);
        }
      } catch (error) {
        console.error('Error fetching events:', error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const getStatusBadge = (status: Event['status']) => {
    const baseClasses = 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full';
    
    switch (status) {
      case 'Confirmed':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'Pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'Cancelled':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Event
            </th>
            <th className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Location
            </th>
            <th className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {events.map((event) => (
            <tr key={event.id} className="hover:bg-gray-50">
              <td className="py-4 whitespace-nowrap">
                <div className="font-medium text-gray-900">{event.title}</div>
              </td>
              <td className="py-4 whitespace-nowrap text-sm text-gray-500">
                {event.date}
              </td>
              <td className="py-4 whitespace-nowrap text-sm text-gray-500">
                {event.location}
              </td>
              <td className="py-4 whitespace-nowrap">
                <span className={getStatusBadge(event.status)}>
                  {event.status}
                </span>
              </td>
              <td className="py-4 whitespace-nowrap text-right text-sm font-medium">
                <button className="text-primary hover:text-primary-dark mr-3 transition-colors">
                  Edit
                </button>
                <button className="text-accent hover:text-accent/80 transition-colors">
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import EventForm from '@/components/admin/EventForm';
import EventWorkflowManager from '@/components/admin/EventWorkflowManager';
import { Copy as CopyIcon, FileSpreadsheet, Pencil, Plus, Trash2 } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  location?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
  maxAttendees?: number;
  registrationCount: number;
  submissionCount: number;
  tags: string[];
  creator: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface EventFilters {
  search?: string;
  status?: string;
  location?: string;
  tag?: string;
  startDateFrom?: string;
  startDateTo?: string;
  createdBy?: string;
  limit: number; // Required, no longer optional
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export default function AdminEventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalEvents, setTotalEvents] = useState(0);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDuplicateForm, setShowDuplicateForm] = useState(false);
  const [showWorkflowManager, setShowWorkflowManager] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [filters, setFilters] = useState<EventFilters>({
    limit: 100, // Use max limit to get all events (backend max is 100)
    offset: 0,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      
      // Build query parameters for pagination and filtering
      const queryParams = new URLSearchParams();
      // Backend limit max is 100, so we'll use pagination if needed
      // Ensure limit never exceeds 100, use 100 as default to get all events
      const limit = Math.min(Math.max(filters.limit || 100, 1), 100); // Min 1, Max 100 as per backend validation
      queryParams.append('limit', limit.toString());
      console.log('[Events] Fetching with limit:', limit, 'filters.limit:', filters.limit, 'offset:', filters.offset, 'full query:', queryParams.toString());
      if (filters.offset !== undefined) queryParams.append('offset', filters.offset.toString());
      if (filters.sortBy) queryParams.append('sortBy', filters.sortBy);
      if (filters.sortOrder) queryParams.append('sortOrder', filters.sortOrder);
      // Only add status filter if it's not empty (All Status means no filter)
      if (filters.status && filters.status.trim() !== '') {
        queryParams.append('status', filters.status);
      }
      if (filters.location) queryParams.append('location', filters.location);
      if (filters.tag) queryParams.append('tag', filters.tag);
      if (filters.startDateFrom) queryParams.append('startDateFrom', filters.startDateFrom);
      if (filters.startDateTo) queryParams.append('startDateTo', filters.startDateTo);
      if (filters.createdBy) queryParams.append('createdBy', filters.createdBy);
      
      const response = await fetch(`/api/events?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        cache: 'no-store' // Always fetch fresh data
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[Events] API response:', { 
          hasEvents: !!data.events, 
          eventsCount: data.events?.length || 0, 
          total: data.total,
          dataKeys: Object.keys(data),
          fullData: data
        });
        
        // Backend returns PaginatedEventsDto with structure: { events: [...], total: number, limit: number, offset: number, hasMore: boolean }
        let eventsData = data.events || data.data || [];
        
        // Ensure eventsData is an array
        if (!Array.isArray(eventsData)) {
          console.warn('[Events] eventsData is not an array:', eventsData);
          eventsData = [];
        }
        
        console.log('[Events] Before frontend search filter:', eventsData.length, 'events');
        
        // Apply frontend search filter (other filters handled by backend)
        if (filters.search) {
          const beforeFilter = eventsData.length;
          eventsData = eventsData.filter((event: Event) => 
            event.title.toLowerCase().includes(filters.search!.toLowerCase()) ||
            event.description?.toLowerCase().includes(filters.search!.toLowerCase())
          );
          console.log('[Events] After frontend search filter:', eventsData.length, 'events (filtered from', beforeFilter, ')');
        }

        console.log('[Events] Final events count:', eventsData.length, 'total:', data.total || eventsData.length, 'hasMore:', data.hasMore);
        setEvents(eventsData);
        setTotalEvents(data.total || eventsData.length);
      } else {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('[Events] Failed to fetch:', response.status, response.statusText, errorText);
        setEvents([]);
        setTotalEvents(0);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleCreateEvent = async (formData: any) => {
    setIsSubmitting(true);
    try {
      // Clean the form data to only include supported fields
      const cleanedData: any = {
        title: formData.title,
        description: formData.description,
        // Use contentMarkdown from formData (EventForm sends content as contentMarkdown)
        contentMarkdown: formData.contentMarkdown || formData.content || '',
        featuredImage: formData.featuredImage,
        pdfAttachment: formData.pdfAttachment,
        pdfAttachmentName: formData.pdfAttachmentName,
        showPdfAttachment: formData.showPdfAttachment ?? true,
        submitUrl: formData.submitUrl,
        honorableGuests: formData.honorableGuests || [],
        startDate: formData.startDate,
        endDate: formData.endDate,
        location: formData.location,
        maxAttendees: formData.maxAttendees,
        // Only include registrationDeadline if it's a valid non-empty ISO 8601 string
        registrationDeadline: formData.registrationDeadline && 
          formData.registrationDeadline.trim() !== '' && 
          formData.registrationDeadline !== 'undefined'
          ? formData.registrationDeadline 
          : undefined,
        status: formData.status,
        tags: formData.tags || [],
        price: formData.price || 0,
        isPaymentEnabled: formData.isPaymentEnabled || false,
      };

      // PDF: empty string must become explicit null on save, otherwise PATCH/create omits the field and DB keeps old paths.
      if (!formData.pdfAttachment || String(formData.pdfAttachment).trim() === '') {
        cleanedData.pdfAttachment = null;
        cleanedData.pdfAttachmentName = null;
      }

      // Remove undefined, null, and empty string fields (especially for optional dates)
      Object.keys(cleanedData).forEach(key => {
        const value = cleanedData[key];
        if (
          (key === 'pdfAttachment' || key === 'pdfAttachmentName') &&
          value === null
        ) {
          return;
        }
        if (value === undefined || value === null || value === '' || value === 'undefined') {
          delete cleanedData[key];
        }
      });

      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cleanedData)
      });

      if (response.ok) {
        const newEvent = await response.json();
        setShowCreateForm(false);
        alert('Event created successfully!');
        // Refetch data to ensure synchronization
        await fetchEvents();
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Failed to create event' }));
        
        // Handle 401 Unauthorized - token expired or invalid
        if (response.status === 401) {
          alert('Your session has expired. Please login again.');
          localStorage.removeItem('authToken');
          localStorage.removeItem('refreshToken');
          router.push('/login');
          return;
        }
        
        throw new Error(errorData.message || 'Failed to create event');
      }
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Failed to create event: ' + (error instanceof Error ? error.message : 'Unknown error'));
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateEvent = async (formData: any) => {
    if (!selectedEvent) return;

    setIsSubmitting(true);
    try {
      // Clean the form data to only include supported fields
      const cleanedData: any = {
        title: formData.title,
        description: formData.description,
        // Use contentMarkdown from formData (EventForm sends content as contentMarkdown)
        contentMarkdown: formData.contentMarkdown || formData.content || '',
        featuredImage: formData.featuredImage,
        pdfAttachment: formData.pdfAttachment,
        pdfAttachmentName: formData.pdfAttachmentName,
        showPdfAttachment: formData.showPdfAttachment ?? true,
        submitUrl: formData.submitUrl,
        honorableGuests: formData.honorableGuests || [],
        startDate: formData.startDate,
        endDate: formData.endDate,
        location: formData.location,
        maxAttendees: formData.maxAttendees,
        // Only include registrationDeadline if it's a valid non-empty ISO 8601 string
        registrationDeadline: formData.registrationDeadline && 
          formData.registrationDeadline.trim() !== '' && 
          formData.registrationDeadline !== 'undefined'
          ? formData.registrationDeadline 
          : undefined,
        status: formData.status,
        tags: formData.tags || [],
        price: formData.price || 0,
        isPaymentEnabled: formData.isPaymentEnabled || false,
      };

      // PDF: empty string must become explicit null on PATCH, otherwise the field is omitted and Prisma leaves the old file path.
      if (!formData.pdfAttachment || String(formData.pdfAttachment).trim() === '') {
        cleanedData.pdfAttachment = null;
        cleanedData.pdfAttachmentName = null;
      }

      // Remove undefined, null, and empty string fields (especially for optional dates)
      Object.keys(cleanedData).forEach(key => {
        const value = cleanedData[key];
        if (
          (key === 'pdfAttachment' || key === 'pdfAttachmentName') &&
          value === null
        ) {
          return;
        }
        if (value === undefined || value === null || value === '' || value === 'undefined') {
          delete cleanedData[key];
        }
      });

      const token = localStorage.getItem('authToken');
      
      if (!token) {
        alert('Please login again. Your session has expired.');
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/events/${selectedEvent.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cleanedData)
      });

      if (response.ok) {
        setShowEditForm(false);
        setSelectedEvent(null);
        alert('Event updated successfully!');
        // Refetch data to ensure synchronization
        await fetchEvents();
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Failed to update event' }));
        
        // Handle 401 Unauthorized - token expired or invalid
        if (response.status === 401) {
          alert('Your session has expired. Please login again.');
          localStorage.removeItem('authToken');
          localStorage.removeItem('refreshToken');
          router.push('/login');
          return;
        }
        
        throw new Error(errorData.message || 'Failed to update event');
      }
    } catch (error) {
      console.error('Error updating event:', error);
      alert('Failed to update event: ' + (error instanceof Error ? error.message : 'Unknown error'));
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDuplicateEvent = async (formData: any) => {
    if (!selectedEvent) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/admin/events/${selectedEvent.id}/duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formData.title,
          startDate: formData.startDate,
          endDate: formData.endDate,
          copyRegistrations: false,
          copySubmissions: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to duplicate event');
      }

      setShowDuplicateForm(false);
      setSelectedEvent(null);
      await fetchEvents();
    } catch (error) {
      console.error('Error duplicating event:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWorkflowUpdate = async (eventId: string, targetStatus: string, note?: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/admin/events/${eventId}/workflow`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetStatus,
          note,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update workflow');
      }

      alert('Event workflow updated successfully!');
      setShowWorkflowManager(false);
      setSelectedEvent(null);
      // Force refresh events list after update - add timestamp to bypass cache
      await fetchEvents();
    } catch (error) {
      console.error('Error updating workflow:', error);
      alert('Failed to update event workflow: ' + (error instanceof Error ? error.message : 'Unknown error'));
      throw error;
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        alert('Event deleted successfully!');
        // Refetch data to ensure synchronization
        await fetchEvents();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete event');
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedEvents.length === 0) {
      alert('Please select events to perform bulk action');
      return;
    }

    const confirmMessage = `Are you sure you want to ${action} ${selectedEvents.length} selected event(s)?`;
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/admin/events/bulk-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          eventIds: selectedEvents,
          action,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to perform bulk action');
      }

      const result = await response.json();
      alert(`Bulk action completed: ${result.success} successful, ${result.failed} failed`);
      
      setSelectedEvents([]);
      await fetchEvents();
    } catch (error) {
      console.error('Error performing bulk action:', error);
      alert('Failed to perform bulk action: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      DRAFT: 'bg-yellow-100 text-yellow-800',
      PUBLISHED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
      COMPLETED: 'bg-light text-primary-dark'
    };
    return `px-2 py-1 text-xs font-semibold rounded-full ${statusConfig[status as keyof typeof statusConfig] || 'bg-gray-100 text-gray-800'}`;
  };

  if (showCreateForm) {
    return (
      <EventForm
        mode="create"
        onSubmit={handleCreateEvent}
        onCancel={() => setShowCreateForm(false)}
        isLoading={isSubmitting}
      />
    );
  }

  if (showEditForm && selectedEvent) {
    return (
      <EventForm
        mode="edit"
        event={selectedEvent}
        onSubmit={handleUpdateEvent}
        onCancel={() => {
          setShowEditForm(false);
          setSelectedEvent(null);
        }}
        isLoading={isSubmitting}
      />
    );
  }

  if (showDuplicateForm && selectedEvent) {
    return (
      <EventForm
        mode="duplicate"
        event={selectedEvent}
        onSubmit={handleDuplicateEvent}
        onCancel={() => {
          setShowDuplicateForm(false);
          setSelectedEvent(null);
        }}
        isLoading={isSubmitting}
      />
    );
  }

  if (showWorkflowManager && selectedEvent) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <button
            onClick={() => {
              setShowWorkflowManager(false);
              setSelectedEvent(null);
            }}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            Back to Events
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Event Workflow Management</h1>
          <p className="text-gray-600 mt-1">Manage the status and workflow of: {selectedEvent.title}</p>
        </div>
        
        <EventWorkflowManager
          event={selectedEvent}
          onWorkflowUpdate={handleWorkflowUpdate}
        />
      </div>
    );
  }

  return (
      <div className="p-6">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Events Management</h1>
              <p className="text-gray-600 mt-1">Manage conferences, workshops, and seminars</p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-accent text-white px-4 py-2 rounded-md hover:bg-accent/90 transition-colors"
            >
              <Plus className="inline-block h-4 w-4 mr-2" aria-hidden="true" />
              Create Event
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search events..."
                value={filters.search || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, offset: 0 }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="flex gap-4">
              <select
                value={filters.status || ''}
                onChange={(e) => {
                  const statusValue = e.target.value || undefined; // Convert empty string to undefined
                  setFilters(prev => ({ ...prev, status: statusValue, offset: 0 }));
                }}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">All Status</option>
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="COMPLETED">Completed</option>
              </select>
              <input
                type="text"
                placeholder="Filter by location"
                value={filters.location || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value, offset: 0 }))}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
        </div>

        {/* Events List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-20">
              <i className="fas fa-calendar-alt text-4xl text-gray-400 mb-4"></i>
              <p className="text-gray-500 text-lg">No events found</p>
              <p className="text-gray-400 text-sm">Create your first event to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Event
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Attendance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Creator
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {events.map((event) => (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-medium text-gray-900">{event.title}</div>
                          <div className="text-sm text-gray-500">
                            {event.description 
                              ? (event.description.length > 100 
                                  ? `${event.description.substring(0, 100)}...` 
                                  : event.description)
                              : ''}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {event.tags.slice(0, 3).map((tag, index) => (
                              <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-800">
                                {tag}
                              </span>
                            ))}
                            {event.tags.length > 3 && (
                              <span className="text-xs text-gray-500">+{event.tags.length - 3} more</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm text-gray-900">
                            {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-gray-500">{event.location || 'No location'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm text-gray-900">
                            {event.registrationCount} {event.maxAttendees ? `/ ${event.maxAttendees}` : ''}
                          </div>
                          {event.maxAttendees && (
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                              <div
                                className="bg-primary h-2 rounded-full"
                                style={{ width: `${Math.min((event.registrationCount / event.maxAttendees) * 100, 100)}%` }}
                              ></div>
                            </div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            {event.submissionCount} submissions
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={getStatusBadge(event.status)}>
                          {event.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {event.creator.firstName && event.creator.lastName 
                            ? `${event.creator.firstName} ${event.creator.lastName}`
                            : event.creator.username
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={async () => {
                              // Fetch full event data including contentMarkdown before editing
                              try {
                                const token = localStorage.getItem('authToken');
                                const response = await fetch(`/api/events/${event.id}`, {
                                  headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json',
                                  },
                                });
                                if (response.ok) {
                                  const fullEvent = await response.json();
                                  setSelectedEvent(fullEvent);
                                  setShowEditForm(true);
                                } else {
                                  // Fallback to list event data if fetch fails
                                  setSelectedEvent(event);
                                  setShowEditForm(true);
                                }
                              } catch (error) {
                                console.error('Error fetching full event data:', error);
                                // Fallback to list event data if fetch fails
                                setSelectedEvent(event);
                                setShowEditForm(true);
                              }
                            }}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Edit"
                            aria-label="Edit"
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedEvent(event);
                              setShowDuplicateForm(true);
                            }}
                            className="text-primary hover:text-primary-dark"
                            title="Duplicate"
                            aria-label="Duplicate"
                          >
                            <CopyIcon className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                const token = localStorage.getItem('authToken');
                                if (!token) {
                                  alert('Please login to download');
                                  return;
                                }
                                
                                // Check if there are registrations
                                if (event.registrationCount === 0) {
                                  if (!confirm('No registrations found for this event. Do you want to download an empty CSV file?')) {
                                    return;
                                  }
                                }
                                
                                const response = await fetch(`/api/admin/events/${event.id}/registrations/export?format=csv`, {
                                  headers: {
                                    'Authorization': `Bearer ${token}`,
                                  },
                                });
                                
                                if (!response.ok) {
                                  if (response.status === 404) {
                                    alert('No registrations found for this event.');
                                    return;
                                  }
                                  throw new Error('Failed to download CSV');
                                }
                                
                                const blob = await response.blob();
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `event-${event.id}-registrations-${new Date().toISOString().split('T')[0]}.csv`;
                                document.body.appendChild(a);
                                a.click();
                                window.URL.revokeObjectURL(url);
                                document.body.removeChild(a);
                              } catch (error) {
                                console.error('Error downloading CSV:', error);
                                alert('Failed to download CSV file. Please try again.');
                              }
                            }}
                            className="text-primary hover:text-primary-dark"
                            title="Download Registration List (CSV)"
                            aria-label="Download registration list (CSV)"
                          >
                            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(event.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                            aria-label="Delete"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
  );
}
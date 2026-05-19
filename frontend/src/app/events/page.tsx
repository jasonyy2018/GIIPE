'use client'

import { useEffect, useState } from 'react';
import { Search, Filter, Calendar, MapPin } from 'lucide-react';
import PublicLayout from '@/components/public/PublicLayout';
import EventCard from '@/components/public/EventCard';
import HeroSection from '@/components/ui/HeroSection';
import { Event, EventFilters, EventStatus, PaginatedResponse } from '@/types/public';
import { publicAPI } from '@/lib/public-api';

export default function EventsPage() {
  // Refetch data to ensure synchronization
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [pastEvents, setPastEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0
  });
  
  const [filters, setFilters] = useState<EventFilters>({
    status: EventStatus.PUBLISHED,
    page: 1,
    limit: 12
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  
  // Refetch data to ensure synchronization
  const [dataCache, setDataCache] = useState({
    upcoming: { loaded: false, data: [], pagination: null },
    past: { loaded: false, data: [], pagination: null }
  });

  useEffect(() => {
    // Always fetch fresh data to ensure sorting is applied
    fetchEvents();
  }, [filters, activeTab]);

  const hasFiltersChanged = () => {
    // Refetch data to ensure synchronization
    return !!(filters.search || filters.location || filters.startDate || filters.endDate);
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // For upcoming events: filter by status=PUBLISHED only (similar to Past Events using status=COMPLETED)
      // For past events: filter by status=COMPLETED only (reference implementation)
      // No date filtering for upcoming events - show all PUBLISHED events regardless of startDate
      // Sort by startDate descending (newest first - dates from new to old) for upcoming events
      // Sort by endDate descending (newest first) for past events
      // Build event filters with proper date field mapping
      const eventFilters: EventFilters = {
        status: activeTab === 'upcoming' ? EventStatus.PUBLISHED : EventStatus.COMPLETED,
        sortBy: activeTab === 'past' ? 'endDate' : 'startDate',
        sortOrder: 'desc' as const,
        page: filters.page || 1,
        limit: filters.limit || 12,
        // Map startDate to startDateFrom and endDate to endDateTo for backend compatibility
        ...(filters.startDate && { startDateFrom: filters.startDate }),
        ...(filters.endDate && { endDateTo: filters.endDate }),
        // Include other filters
        ...(filters.search && { search: filters.search }),
        ...(filters.location && { location: filters.location }),
        ...(filters.tags && filters.tags.length > 0 && { tags: filters.tags }),
      };
      
      console.log('[Events] Fetching with filters:', eventFilters);
      const response: PaginatedResponse<Event> = await publicAPI.getEvents(eventFilters);
      console.log('[Events] Response:', { 
        count: response.events?.length || response.data?.length || 0,
        firstEvent: response.events?.[0] || response.data?.[0] 
      });
      const events = response.events || response.data || [];
      const paginationData = {
        page: Math.floor(response.offset / response.limit) + 1,
        limit: response.limit,
        total: response.total,
        totalPages: Math.ceil(response.total / response.limit)
      };
      
      // Refetch data to ensure synchronization
      if (activeTab === 'upcoming') {
        setUpcomingEvents(events);
      } else {
        setPastEvents(events);
      }
      setPagination(paginationData);
      
      // Refetch data to ensure synchronization
      // Always clear cache when sorting changes to ensure fresh data
      setDataCache(prev => ({
        ...prev,
        [activeTab]: {
          loaded: true,
          data: events,
          pagination: paginationData
        }
      }));
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const status = (err as any)?.status;
      const isUpstreamUnavailable =
        /fetch failed|ECONNREFUSED|Bad Gateway|upstream fetch failed|502|503|504/i.test(errMsg) ||
        [502, 503, 504].includes(status);

      // Backend is down/unreachable locally is expected; don't spam console.error.
      if (isUpstreamUnavailable) {
        console.warn('Events API unavailable:', errMsg);
        setError('Backend unavailable (please try again in a moment).');
      } else {
        console.error('Error fetching events:', errMsg);
        setError('Failed to load events.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters(prev => ({
      ...prev,
      search: searchTerm || undefined,
      page: 1
    }));
  };

  const handleFilterChange = (key: keyof EventFilters, value: any) => {
    // Don't allow status changes via filter - it's controlled by activeTab
    if (key === 'status') return;
    
    setFilters(prev => {
      const newFilters: EventFilters = {
        ...prev,
        page: 1
      };
      
      // Handle date fields - clear if empty, otherwise set the value
      if (key === 'startDate' || key === 'endDate') {
        if (value && typeof value === 'string' && value.trim() !== '') {
          newFilters[key] = value;
        } else {
          // Remove the key if value is empty
          delete newFilters[key];
        }
      } else {
        // For other fields, set the value (or remove if empty)
        if (value !== undefined && value !== null && value !== '') {
          if (typeof value === 'string' && value.trim() !== '') {
            (newFilters as any)[key] = value;
          } else if (typeof value !== 'string') {
            (newFilters as any)[key] = value;
          } else {
            delete newFilters[key];
          }
        } else {
          delete newFilters[key];
        }
      }
      
      return newFilters;
    });
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({
      ...prev,
      page: newPage
    }));
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      limit: 12
      // Status is controlled by activeTab, other filters are cleared
    });
    setSearchTerm('');
  };

  const getCurrentEvents = () => {
    return activeTab === 'upcoming' ? upcomingEvents : pastEvents;
  };

  return (
    <PublicLayout>
      {/* Hero Section */}
      <HeroSection
        title="Conference Events"
        subtitle="Discover upcoming and past conferences, workshops, and academic events in intellectual property and innovation"
        backgroundImage="hero-bg"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('upcoming')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'upcoming'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Upcoming Events (Published)
              </button>
              <button
                onClick={() => setActiveTab('past')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'past'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Past Events (Completed)
              </button>
            </nav>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <form onSubmit={handleSearch} className="mb-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </button>
            </div>
          </form>

          {showFilters && (
            <div className="border-t pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Shanghai, New York"
                    value={filters.location || ''}
                    onChange={(e) => handleFilterChange('location', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date From
                  </label>
                  <input
                    type="date"
                    value={filters.startDate || ''}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date To
                  </label>
                  <input
                    type="date"
                    value={filters.endDate || ''}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="mb-6">
          <p className="text-gray-600">
            {loading ? 'Loading...' : `Showing ${getCurrentEvents()?.length || 0} of ${pagination.total} events`}
          </p>
        </div>

        {/* Events Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="h-3 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-4"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500">{error}</p>
          </div>
        ) : getCurrentEvents() && getCurrentEvents().length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {getCurrentEvents().map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center">
                <nav className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  {[...Array(pagination.totalPages)].map((_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          page === pagination.page
                            ? 'bg-primary text-white'
                            : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </nav>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
            <p className="text-gray-500">Try adjusting your search criteria or filters.</p>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import EventAnalyticsDashboard from '@/components/admin/EventAnalyticsDashboard';
import EventRegistrationManager from '@/components/admin/EventRegistrationManager';
import EventComparisonTool from '@/components/admin/EventComparisonTool';
import { ArrowLeft, BarChart3, Users, TrendingUp } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  location?: string;
  status: string;
  maxAttendees?: number;
}

export default function EventAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'analytics' | 'registrations' | 'comparison'>('analytics');
  const [selectedComparisonEvents, setSelectedComparisonEvents] = useState<string[]>([eventId]);

  useEffect(() => {
    fetchEventDetails();
  }, [eventId]);

  const fetchEventDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/events/${eventId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch event details');
      }

      const data = await response.json();
      setEvent(data);
    } catch (error) {
      console.error('Error fetching event details:', error);
      setError('Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToEvents = () => {
    router.push('/admin/events');
  };

  const tabs = [
    {
      id: 'analytics' as const,
      label: 'Analytics Dashboard',
      icon: BarChart3,
      description: 'View comprehensive event analytics and performance metrics'
    },
    {
      id: 'registrations' as const,
      label: 'Registration Management',
      icon: Users,
      description: 'Manage event registrations and attendee information'
    },
    {
      id: 'comparison' as const,
      label: 'Event Comparison',
      icon: TrendingUp,
      description: 'Compare this event with other events'
    }
  ];

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !event) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <i className="fas fa-exclamation-triangle text-red-400 mr-3 mt-1"></i>
              <div>
                <h3 className="text-red-800 font-medium">Error Loading Event</h3>
                <p className="text-red-600 text-sm mt-1">{error}</p>
                <button
                  onClick={fetchEventDetails}
                  className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleBackToEvents}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </button>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Event Analytics & Management
                </h1>
                <h2 className="text-xl text-gray-700 mb-2">{event.title}</h2>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>
                    <i className="fas fa-calendar mr-1"></i>
                    {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
                  </span>
                  {event.location && (
                    <span>
                      <i className="fas fa-map-marker-alt mr-1"></i>
                      {event.location}
                    </span>
                  )}
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    event.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' :
                    event.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' :
                    event.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {event.status}
                  </span>
                </div>
                {event.description && (
                  <p className="text-gray-600 mt-2">{event.description}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`mr-2 h-5 w-5 ${
                      activeTab === tab.id ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                    }`} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
          
          {/* Tab Description */}
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              {tabs.find(tab => tab.id === activeTab)?.description}
            </p>
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'analytics' && (
            <EventAnalyticsDashboard eventId={eventId} />
          )}

          {activeTab === 'registrations' && (
            <EventRegistrationManager 
              eventId={eventId} 
              eventTitle={event.title}
            />
          )}

          {activeTab === 'comparison' && (
            <EventComparisonTool
              selectedEventIds={selectedComparisonEvents}
              onEventSelect={setSelectedComparisonEvents}
            />
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
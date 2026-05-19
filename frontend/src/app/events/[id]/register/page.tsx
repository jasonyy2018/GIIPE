'use client'

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar, MapPin, Users, Clock, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import PublicLayout from '@/components/public/PublicLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Event } from '@/types/public';
import { publicAPI } from '@/lib/public-api';
import { format } from 'date-fns';

export default function EventRegistrationPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const { user, isAuthenticated } = useAuth();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [additionalInfo, setAdditionalInfo] = useState({
    dietaryRestrictions: '',
    accessibilityNeeds: '',
    emergencyContact: '',
    comments: ''
  });

  useEffect(() => {
    if (eventId) {
      fetchEvent();
    }
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      const eventData = await publicAPI.getEvent(eventId);
      setEvent(eventData);
      
      // Debug: Log event status for troubleshooting
      console.log('Event data:', {
        id: eventData.id,
        status: eventData.status,
        startDate: eventData.startDate,
        registrationDeadline: eventData.registrationDeadline,
        now: new Date().toISOString()
      });
    } catch (err: any) {
      console.error('Error fetching event:', err);
      
      // Handle different error types
      if (err?.status === 403 || err?.code === 'FORBIDDEN') {
        setError('This event is not available to the public. It may be a draft or unpublished event.');
      } else if (err?.status === 404 || err?.code === 'NOT_FOUND') {
        setError('The event you are looking for does not exist.');
      } else {
        setError('Failed to load event details. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAdditionalInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      // Redirect to login with redirect back to registration page
      router.push(`/login?redirect=/events/${eventId}/register`);
      return;
    }

    setRegistering(true);
    setError(null);

    try {
      await publicAPI.registerForEvent(eventId, additionalInfo);
      setSuccess(true);
      // Refresh dashboard data if user is on dashboard
      // The registration will be visible in dashboard after refresh
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <PublicLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded mb-8"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (error && !event) {
    const isForbidden = error?.includes('not available') || error?.includes('draft') || error?.includes('unpublished');
    const title = isForbidden ? 'Event Not Available' : 'Event Not Found';
    
    return (
      <PublicLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{title}</h1>
            <p className="text-gray-600 mb-8">{error || 'The event you are looking for does not exist.'}</p>
            <Link
              href="/events"
              className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Events
            </Link>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (success) {
    return (
      <PublicLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Registration Successful!</h1>
            <p className="text-lg text-gray-600 mb-8">
              You have successfully registered for <strong>{event?.title || 'this event'}</strong>. 
              You will receive a confirmation email shortly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/dashboard"
                className="px-6 py-3 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
              >
                View My Registrations
              </Link>
              <Link
                href={`/events/${eventId}`}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Back to Event
              </Link>
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (!event) return null;

  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);
  // Check if registrationDeadline exists and is valid
  const registrationDeadline = event.registrationDeadline ? new Date(event.registrationDeadline) : null;
  const now = new Date();
  
  // Registration is open if: deadline hasn't passed (or no deadline), event is published, and event hasn't started
  // Check status case-insensitively to handle both 'PUBLISHED' and 'published'
  const statusUpper = event.status?.toUpperCase();
  const isRegistrationOpen = statusUpper === 'PUBLISHED' 
    && (registrationDeadline ? registrationDeadline > now : true)
    && startDate > now;
  
  const registrationProgress = event.maxAttendees && event.maxAttendees > 0 
    ? ((event.registrationCount || 0) / event.maxAttendees) * 100: 0;

  // Debug log
  console.log('Registration check:', {
    status: event.status,
    statusUpper,
    isPublished: statusUpper === 'PUBLISHED',
    deadline: registrationDeadline ? registrationDeadline.toISOString() : 'none',
    deadlinePassed: registrationDeadline ? registrationDeadline <= now : false,
    startDate: startDate.toISOString(),
    eventStarted: startDate <= now,
    isRegistrationOpen
  });

  // Show registration closed message only if event has started, deadline passed, or status is not PUBLISHED
  if (!isRegistrationOpen) {
    return (
      <PublicLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Registration Closed</h1>
            <p className="text-lg text-gray-600 mb-8">
              {startDate <= now
                ? 'This event has already started.' 
                : registrationDeadline && registrationDeadline <= now
                ? 'Registration deadline has passed.'
                : statusUpper !== 'PUBLISHED'
                ? 'This event is not published yet.'
                : 'Registration for this event is no longer available.'}
            </p>
            <Link
              href={`/events/${eventId}`}
              className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Event
            </Link>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Link
            href={`/events/${eventId}`}
            className="inline-flex items-center text-primary hover:text-primary-dark transition-colors no-underline"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span className="text-primary">Back to Event Details</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Registration Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border p-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-6">
                Register for Event
              </h1>


              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <div className="ml-3">
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleRegistration} className="space-y-6">
                <div>
                  <label htmlFor="dietaryRestrictions" className="block text-sm font-medium text-gray-700 mb-2">
                    Dietary Restrictions
                  </label>
                  <input
                    type="text"
                    id="dietaryRestrictions"
                    name="dietaryRestrictions"
                    value={additionalInfo.dietaryRestrictions}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    placeholder="e.g., Vegetarian, Gluten-free, None"
                  />
                </div>

                <div>
                  <label htmlFor="accessibilityNeeds" className="block text-sm font-medium text-gray-700 mb-2">
                    Accessibility Needs
                  </label>
                  <input
                    type="text"
                    id="accessibilityNeeds"
                    name="accessibilityNeeds"
                    value={additionalInfo.accessibilityNeeds}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    placeholder="e.g., Wheelchair access, Sign language interpreter"
                  />
                </div>

                <div>
                  <label htmlFor="emergencyContact" className="block text-sm font-medium text-gray-700 mb-2">
                    Emergency Contact
                  </label>
                  <input
                    type="text"
                    id="emergencyContact"
                    name="emergencyContact"
                    value={additionalInfo.emergencyContact}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    placeholder="Name and phone number"
                  />
                </div>

                <div>
                  <label htmlFor="comments" className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Comments
                  </label>
                  <textarea
                    id="comments"
                    name="comments"
                    rows={4}
                    value={additionalInfo.comments}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    placeholder="Any additional information or questions..."
                  />
                </div>

                <div className="border-t pt-6">
                  <button
                    type="submit"
                    disabled={registering || !isAuthenticated}
                    style={{ backgroundColor: '#1B5E20' }}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0B4D3E'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1B5E20'}
                  >
                    {registering ? 'Registering...' : 'Complete Registration'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Event Summary */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Summary</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">{event.title}</h4>
                  <p className="text-sm text-gray-600">{event.description}</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>
                      {format(startDate, 'EEEE, MMMM dd, yyyy')}
                      {startDate.toDateString() !== endDate.toDateString() && 
                        ` - ${format(endDate, 'EEEE, MMMM dd, yyyy')}`
                      }
                    </span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>{event.location}</span>
                  </div>
                </div>

                {/* Registration Progress - Removed */}
                {false && event!.maxAttendees > 0 && (
                  <div>
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>Capacity</span>
                      <span>{Math.round(registrationProgress)}% full</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(registrationProgress, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {registrationDeadline && (
                  <div className="text-sm text-gray-500 pt-4 border-t">
                    Registration deadline: {format(registrationDeadline, 'MMM dd, yyyy')}
                  </div>
                )}
              </div>
            </div>

            {/* Registration Info */}
            <div className="bg-primary-light rounded-lg p-6">
              <h3 className="text-lg font-semibold text-primary-dark mb-2">Registration Info</h3>
              <ul className="text-sm text-primary-dark space-y-2">
                <li>• You will receive a confirmation email after registration</li>
                <li>• Event details and updates will be sent to your registered email</li>
                <li>• You can cancel your registration from your dashboard</li>
                <li>• Contact support if you need assistance</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
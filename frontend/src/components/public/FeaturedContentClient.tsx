'use client'

import { useEffect, useState } from 'react';
import { Event } from '@/types/public';
import EventCard from './EventCard';
import LazyLoadSection from '@/components/performance/LazyLoadSection';

interface FeaturedContentClientProps {
  initialEvents?: Event[];
  initialConferences?: Event[];
}

export default function FeaturedContentClient({
  initialEvents = [],
  initialConferences = [],
}: FeaturedContentClientProps) {
  // Initialize state with SSR data immediately
  // This ensures data is available even before useEffect runs
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [conferences, setConferences] = useState<Event[]>(initialConferences);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update state when SSR data changes (e.g., on navigation)
  // CRITICAL: Only use length and first item ID in dependencies to prevent infinite loops
  // DO NOT include initialEvents/initialConferences themselves as they are new array references each time
  useEffect(() => {
    // Only update if data actually changed (by comparing lengths and first item ID)
    const eventsChanged = initialEvents.length !== events.length || 
      (initialEvents.length > 0 && events.length > 0 && initialEvents[0]?.id !== events[0]?.id);
    const conferencesChanged = initialConferences.length !== conferences.length ||
      (initialConferences.length > 0 && conferences.length > 0 && initialConferences[0]?.id !== conferences[0]?.id);
    
    if (eventsChanged && initialEvents.length > 0) {
      setEvents(initialEvents);
    }
    if (conferencesChanged && initialConferences.length > 0) {
      setConferences(initialConferences);
    }
  }, [initialEvents.length, initialConferences.length, initialEvents[0]?.id, initialConferences[0]?.id, events.length, conferences.length]);

  // Fetch data on client side if SSR data is missing or incomplete
  // CRITICAL: Only run once on mount to prevent infinite loops
  useEffect(() => {
    // Always set initial data to state first (even if we're going to fetch)
    // This ensures the page renders immediately with SSR data
    if (initialEvents.length > 0) {
      setEvents(initialEvents);
    }
    if (initialConferences.length > 0) {
      setConferences(initialConferences);
    }
    
    // Only fetch if SSR data is missing or incomplete
    const shouldFetch = initialEvents.length === 0 || initialConferences.length === 0;
    
    if (!shouldFetch) {
      // We have complete SSR data, skip fetch
      if (process.env.NODE_ENV === 'development') {
        console.log('[FeaturedContentClient] Using SSR data, skipping fetch');
      }
      return;
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[FeaturedContentClient] SSR data incomplete, fetching on client:', {
        eventsCount: initialEvents.length,
        conferencesCount: initialConferences.length,
      });
    }

    // CRITICAL: Track if component is mounted to prevent state updates after unmount
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 2;
    const retryDelay = 1000; // 1 second
    let retryTimeoutId: NodeJS.Timeout | null = null; // Track retry timeout for cleanup
    let abortController: AbortController | null = null; // Track abort controller for cleanup

    const fetchData = async (isRetry = false) => {
      // CRITICAL: Don't proceed if component is unmounted
      if (!isMounted) {
        return;
      }
      
      try {
        if (!isRetry) {
          setLoading(true);
        }
        setError(null);

        // CRITICAL: Create new AbortController for each fetch attempt
        // Cancel previous request if it exists
        if (abortController) {
          abortController.abort();
        }
        abortController = new AbortController();

        // Add timeout to fetch requests - reduced from 8s to 5s for faster failure
        const fetchWithTimeout = (url: string, timeout = 5000) => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);
          
          return fetch(url, { 
            signal: abortController?.signal || controller.signal // Use main abort controller
          })
            .finally(() => clearTimeout(timeoutId))
            .catch((error) => {
              if (error.name === 'AbortError') {
                throw new Error('Request timeout');
              }
              throw error;
            });
        };

        // For upcoming events: filter by status=PUBLISHED only (similar to Past Events using status=COMPLETED)
        // No date filtering - show all PUBLISHED events regardless of startDate
        // Sort by startDate descending (newest first - dates from new to old)
        const [eventsRes, conferencesRes] = await Promise.all([
          // Upcoming Events: status=PUBLISHED only (like Past Events uses status=COMPLETED only)
          fetchWithTimeout(`/api/events?status=PUBLISHED&limit=100&offset=0&sortBy=startDate&sortOrder=desc`),
          // Past Events: status=COMPLETED only (reference implementation for Upcoming Events)
          fetchWithTimeout('/api/events?status=COMPLETED&limit=100&offset=0&sortBy=endDate&sortOrder=desc'),
        ]);

        // CRITICAL: Check if component is still mounted before updating state
        if (!isMounted) {
          return;
        }

        if (eventsRes.ok) {
          const eventsData = await eventsRes.json();
          const fetchedEvents = eventsData.events || eventsData.data || [];
          // Only update events state if we got events, otherwise keep initial events
          // This ensures we don't overwrite SSR data with empty arrays
          if (fetchedEvents.length > 0 && isMounted) {
            setEvents(fetchedEvents);
          }
        }
        // If fetch failed, keep using initial events from SSR (silent fail)

        if (conferencesRes.ok) {
          const conferencesData = await conferencesRes.json();
          const fetchedConferences = conferencesData.events || conferencesData.data || [];
          // Only update conferences if we got new data, otherwise keep initial
          if (fetchedConferences.length > 0 && isMounted) {
            setConferences(fetchedConferences);
          }
        }

        // Check if all requests failed
        if (!eventsRes.ok && !conferencesRes.ok) {
          // Retry if we haven't exceeded max retries
          if (retryCount < maxRetries && isMounted) {
            retryCount++;
            retryTimeoutId = setTimeout(() => {
              if (isMounted) {
                fetchData(true);
              }
            }, retryDelay * retryCount);
            return;
          }
          if (isMounted) {
            setError('Failed to load featured content. Please refresh the page.');
          }
        } else {
          // Success - reset retry count
          retryCount = 0;
        }
      } catch (err) {
        // CRITICAL: Don't log or update state if component is unmounted
        if (!isMounted) {
          return;
        }
        
        console.error('Error fetching featured content on client:', err);
        
        // Retry on network errors
        if (retryCount < maxRetries && (err instanceof Error && (
          err.message.includes('timeout') || 
          err.message.includes('fetch') ||
          err.message.includes('network')
        ))) {
          retryCount++;
          retryTimeoutId = setTimeout(() => {
            if (isMounted) {
              fetchData(true);
            }
          }, retryDelay * retryCount);
          return;
        }
        
        // Only show error if we've exhausted retries or it's not a network error
        if (retryCount >= maxRetries || !(err instanceof Error && err.message.includes('timeout'))) {
          if (isMounted) {
            setError('Failed to load featured content. Please refresh the page.');
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Always try to fetch if we don't have complete SSR data
    // This ensures data loads even if SSR failed silently
    fetchData();
    
    // CRITICAL: Cleanup function to prevent memory leaks
    return () => {
      isMounted = false; // Mark as unmounted
      
      // Cancel any ongoing fetch requests
      if (abortController) {
        abortController.abort();
        abortController = null;
      }
      
      // Clear any pending retry timeouts
      if (retryTimeoutId) {
        clearTimeout(retryTimeoutId);
        retryTimeoutId = null;
      }
    };
  }, []); // CRITICAL: Only run once on mount to prevent infinite loops

  // Use current state if data was fetched, otherwise use initial props
  // For events: prefer fetched events, but fall back to initialEvents if fetched is empty
  // This ensures we show events even if client-side fetch fails or returns empty
  // Important: Only use fetched events if they exist, otherwise always use initialEvents
  // This prevents empty arrays from hiding SSR data
  // If events state was never updated (still equals initialEvents), use initialEvents
  // If events state was updated but is empty, also use initialEvents
  const displayEvents = (events.length > 0) ? events : initialEvents;
  const displayConferences = conferences.length > 0 ? conferences : initialConferences;
  
  // Removed debug logging for production performance

  return (
    <div>
      {/* About Us Section (replacing News) */}
      <section id="news" className="relative py-20 md:py-[50px] bg-gray-50" aria-labelledby="about-heading">
        <div className="container mx-auto px-5 max-w-[1200px]">
          <div className="mb-12">
            <div>
              <h2 id="about-heading" className="text-[1.4rem] md:text-[2rem] font-bold text-primary mb-2">
                About Us
              </h2>
              <div className="w-24 h-1 bg-gradient-to-r from-accent to-primary"></div>
            </div>
          </div>

          <div className="mb-8">
            <div className="prose prose-lg max-w-none mb-8">
              <p className="text-text text-[0.9rem] md:text-base leading-relaxed mb-6">
                In 2019, we decided to develop a high-level forum on global innovation and intellectual property (GIIP). We believe that global competition is increasingly defined by rivalry for technological leadership, and that the boundary between firm competitiveness and institutional infrastructure is blurring. Therefore, it is important to bring together scholars, practitioners, and policymakers to engage in rigorous, cross-disciplinary discussions on this important topic. What we did not anticipate was how quickly this topic would move from important to urgent in the years that followed.
              </p>
              <p className="text-text text-[0.9rem] md:text-base leading-relaxed mb-6">
                The conference was briefly interrupted by the Covid-19 pandemic, but since its resumption in 2024, it has earned growing recognition among leading IP scholars worldwide. Staying true to our founding vision, we intentionally keep the conference small, striving for deeper conversations at the frontier of research.
              </p>
            </div>

            {/* Co-organizers Section */}
            <div className="mt-12">
              <h3 className="text-[1.4rem] md:text-2xl font-semibold text-primary-dark mb-8">Co-organizers</h3>
              <div className="grid grid-cols-2 md:grid-cols-2 gap-8">
                {/* Changqi Wu */}
                <div className="bg-white rounded-lg shadow-md p-6 flex flex-col items-center text-center">
                  <div className="w-[100px] h-[100px] md:w-48 md:h-48 rounded-full overflow-hidden mb-4 border-4 border-primary/20">
                    <img 
                      src="/images/speakers/Changqi Wu Peking University.jpeg" 
                      alt="Changqi Wu"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4 className="text-[1.4rem] md:text-xl font-semibold text-primary-dark mb-2">Changqi Wu</h4>
                  <p className="text-text text-[0.9rem] md:text-base">Guanghua School of Management, Peking University</p>
                </div>

                {/* Minyuan Zhao */}
                <div className="bg-white rounded-lg shadow-md p-6 flex flex-col items-center text-center">
                  <div className="w-[100px] h-[100px] md:w-48 md:h-48 rounded-full overflow-hidden mb-4 border-4 border-primary/20">
                    <img 
                      src="/images/speakers/Minyuan Zhao WashU.jpeg" 
                      alt="Minyuan Zhao"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4 className="text-[1.4rem] md:text-xl font-semibold text-primary-dark mb-2">Minyuan Zhao</h4>
                  <p className="text-text text-[0.9rem] md:text-base">Olin School of Business, WashU</p>
                </div>
              </div>
            </div>

            {/* Action buttons removed */}
          </div>
        </div>
      </section>

      {/* Upcoming Events Section - Load immediately since it's part of first screen content */}
      <LazyLoadSection
        rootMargin="300px"
        eager={true}
        placeholder={
          <section id="events" className="py-16 bg-white" aria-labelledby="events-heading">
            <div className="container mx-auto px-5 max-w-[1200px]">
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-gray-500 mt-4">Loading events...</p>
              </div>
            </div>
          </section>
        }
      >
        <section id="events" className="py-16 bg-white" aria-labelledby="events-heading">
        <div className="container mx-auto px-5 max-w-[1200px]">
          <div className="section-title text-center mb-10 md:mb-[30px]">
            <h2 
              id="events-heading"
              className="text-[1.4rem] md:text-xl text-primary-dark relative inline-block mb-[15px] md:mb-3 font-semibold leading-tight md:leading-[1.3] after:content-[''] after:absolute after:-bottom-2.5 after:left-1/2 after:-translate-x-1/2 after:w-20 after:h-1 after:bg-accent after:rounded-sm"
            >
              Upcoming Events
            </h2>
            <p className="text-text max-w-[700px] mx-auto text-[0.9rem] md:text-[15px] leading-normal md:leading-normal">
              Join us for upcoming lectures, seminars, and workshops on innovation and intellectual property
            </p>
          </div>

          <div id="upcoming-events-grid" className="flex flex-col gap-4 mb-8">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-gray-500 mt-4">Loading events...</p>
              </div>
            ) : error && displayEvents.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">{error}</p>
              </div>
            ) : displayEvents && displayEvents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <i className="fas fa-calendar text-4xl text-gray-400 mb-4"></i>
                <p className="text-gray-500">No upcoming events scheduled at the moment.</p>
              </div>
            )}
          </div>
        </div>
      </section>
      </LazyLoadSection>

      {/* Past Conferences Section - Lazy loaded when near viewport */}
      <LazyLoadSection
        rootMargin="300px"
        placeholder={
          <section
            id="past-conferences"
            className="past-conferences bg-gray-100 relative py-20 md:py-[50px] pb-[100px] md:pb-20"
          >
            <div className="container mx-auto px-5 max-w-[1200px]">
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-gray-500 mt-4">Loading conferences...</p>
              </div>
            </div>
          </section>
        }
      >
        <section 
        id="past-conferences"
        className="past-conferences bg-gray-100 relative py-20 md:py-[50px] pb-[100px] md:pb-20"
        aria-labelledby="conferences-heading"
      >
        <div className="container mx-auto px-5 max-w-[1200px]">
          <div className="section-title text-center mb-10 md:mb-[30px]">
            <h2 
              id="conferences-heading"
              className="text-[1.4rem] md:text-xl text-primary-dark relative inline-block mb-[15px] md:mb-3 font-semibold leading-tight md:leading-[1.3] after:content-[''] after:absolute after:-bottom-2.5 after:left-1/2 after:-translate-x-1/2 after:w-20 after:h-1 after:bg-accent after:rounded-sm"
            >
              Past Conferences
            </h2>
            <p className="text-text max-w-[700px] mx-auto text-[0.9rem] md:text-[15px] leading-normal md:leading-normal">
              Explore our archive of completed conferences, including summaries, presentations, and key takeaways from our intellectual property and innovation events. All conferences shown here have been successfully completed.
            </p>
          </div>

          {/* Conferences Grid */}
          <div className="conferences-slider grid grid-cols-1 md:grid-cols-3 gap-6" role="list">
            {loading ? (
              <div className="col-span-full text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-gray-500 mt-4">Loading conferences...</p>
              </div>
            ) : error && displayConferences.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500">{error}</p>
              </div>
            ) : displayConferences && displayConferences.length > 0 ? (
              displayConferences.map((conference) => (
                <EventCard key={conference.id} event={conference} isPastEvent />
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <i className="fas fa-history text-4xl text-gray-400 mb-4"></i>
                <p className="text-gray-500">No past conferences available at the moment.</p>
              </div>
            )}
          </div>
        </div>
      </section>
      </LazyLoadSection>
    </div>
  );
}


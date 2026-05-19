'use client'

import { useEffect, useState } from 'react';
import PublicLayout from '@/components/public/PublicLayout';
import EventCard from '@/components/public/EventCard';
import { Event, EventStatus } from '@/types/public';
import { publicAPI } from '@/lib/public-api';

export default function Conferences() {
  const [pastConferences, setPastConferences] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPastConferences = async () => {
      try {
        setLoading(true);
        // Fetch only COMPLETED events for past conferences
        const response = await publicAPI.getEvents({
          status: EventStatus.COMPLETED,
          limit: 12,
          page: 1,
          sortBy: 'endDate',
          sortOrder: 'desc' // Most recent completed events first
        });
        setPastConferences(response.events || response.data || []);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        const status = (err as any)?.status;
        const isUpstreamUnavailable =
          /fetch failed|ECONNREFUSED|Bad Gateway|upstream fetch failed|502|503|504/i.test(errMsg) ||
          [502, 503, 504].includes(status);

        // Backend is down/unreachable locally is expected; don't spam console.error.
        if (isUpstreamUnavailable) {
          console.warn('Conferences API unavailable:', errMsg);
          setError('Backend unavailable (please try again in a moment).');
        } else {
          console.error('Error fetching past conferences:', errMsg);
          setError('Failed to load past conferences.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPastConferences();
  }, []);

  return (
    <PublicLayout>
      <div className="container mx-auto px-5 max-w-[1200px] py-16">
        <div className="text-center mb-12">
          <h1 className="text-[1.4rem] md:text-[2rem] font-bold text-primary-dark mb-4">
            Past Conferences
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-accent to-primary mx-auto mb-8"></div>
          <p className="text-[0.9rem] md:text-xl text-text max-w-3xl mx-auto leading-relaxed">
            Explore our archive of completed conferences, including summaries, presentations, and key takeaways 
            from our intellectual property and innovation events. All conferences shown here have been successfully completed.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mb-4"></div>
            <p className="text-gray-600 text-sm">Loading past conferences...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <i className="fas fa-exclamation-triangle text-4xl text-gray-400 mb-4"></i>
            <p className="text-gray-500">{error}</p>
          </div>
        ) : pastConferences && pastConferences.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pastConferences.map((conference) => (
              <EventCard key={conference.id} event={conference} isPastEvent />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <i className="fas fa-history text-4xl text-gray-400 mb-4"></i>
            <p className="text-gray-500">No past conferences available at the moment.</p>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Event, EventStatus } from '@/types/public';
import { formatDateFixed, isSameDate } from '@/utils/dateFormat';
import { getImageUrl, getDefaultImage } from '@/utils/extractImage';
import { memo, useState, useEffect } from 'react';

interface EventCardProps {
  event: Event;
  isPastEvent?: boolean;
}

const EventCard = memo(function EventCard({ event, isPastEvent = false }: EventCardProps) {
  // Use date strings directly for display to avoid timezone conversion
  // Only convert to Date objects when needed for comparison
  const registrationDeadline = event.registrationDeadline;
  const initialImageUrl = getImageUrl(event.featuredImage, event.contentMarkdown, event.contentHtml, 'event');
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const [imageError, setImageError] = useState(false);
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const defaultImage = getDefaultImage('event');

  // Update image URL when event content changes (e.g., markdown first image updated)
  useEffect(() => {
    const newImageUrl = getImageUrl(event.featuredImage, event.contentMarkdown, event.contentHtml, 'event');
    setImageUrl((currentUrl) => {
      // Only update if the new URL is different from current
      if (newImageUrl !== currentUrl) {
        setImageError(false); // Reset error state when URL changes
        return newImageUrl;
      }
      return currentUrl;
    });
  }, [event.featuredImage, event.contentMarkdown, event.contentHtml, event.id]);

  // Calculate registration status only on client side to avoid hydration mismatch
  useEffect(() => {
    if (!registrationDeadline || isPastEvent) {
      setIsRegistrationOpen(false);
      return;
    }
    
    // Compare dates by date string to avoid timezone issues
    // Extract date part (YYYY-MM-DD) and compare
    const deadlineDateMatch = registrationDeadline.match(/^(\d{4}-\d{2}-\d{2})/);
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    if (deadlineDateMatch) {
      setIsRegistrationOpen(deadlineDateMatch[1] >= todayStr);
    } else {
      // Fallback to Date comparison if format doesn't match
      const deadlineDate = new Date(registrationDeadline);
      setIsRegistrationOpen(deadlineDate > new Date());
    }
  }, [registrationDeadline, isPastEvent]);

  const getStatusInfo = () => {
    if (isPastEvent || event.status === EventStatus.COMPLETED) {
      return { label: 'Completed', className: 'bg-gray-100/90 text-gray-800 border border-gray-200/50' };
    }
    
    switch (event.status) {
      case EventStatus.PUBLISHED:
        return { label: 'Published', className: 'bg-green-100/90 text-green-800 border border-green-200/50' };
      case EventStatus.CANCELLED:
        return { label: 'Cancelled', className: 'bg-red-100/90 text-red-800 border border-red-200/50' };
      case EventStatus.DRAFT:
        return { label: 'Draft', className: 'bg-yellow-100/90 text-yellow-800 border border-yellow-200/50' };
      default:
        return { label: 'Unknown', className: 'bg-gray-100/90 text-gray-800 border border-gray-200/50' };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="bg-white rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.15)] transition-all duration-300 hover:-translate-y-1 overflow-hidden">
      {/* Thumbnail - Show on all devices */}
      <div className="relative h-32 md:h-48 overflow-hidden bg-gray-100">
        {/* Use native img tag for local uploads (via Next.js proxy) to enable proper error handling */}
        {/* Use Next.js Image component for external URLs (unsplash, etc.) */}
        {imageUrl.startsWith('/api/uploads/') || 
         imageUrl.includes('localhost') || 
         imageUrl.includes('backend:') ? (
          // For local uploads, use img tag with error handling
          <img
            src={imageUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 hover:scale-105 max-md:[object-position:center_20%]"
            loading="lazy"
            onError={(e) => {
              // If image fails to load and it's not already the default image, switch to default
              if (imageUrl !== defaultImage) {
                setImageUrl(defaultImage);
                // Retry with default image
                (e.target as HTMLImageElement).src = defaultImage;
              } else {
                // If default image also fails, show placeholder
                setImageError(true);
                (e.target as HTMLImageElement).style.display = 'none';
              }
            }}
          />
        ) : (
          // For external URLs, use Next.js Image component
          <Image
            src={imageUrl}
            alt=""
            fill
            className="object-cover transition-transform duration-300 hover:scale-105 max-md:[object-position:center_20%]"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            loading="lazy"
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
            onError={() => {
              // Fallback to default image if external URL fails
              if (imageUrl !== defaultImage) {
                setImageUrl(defaultImage);
              } else {
                // If default image also fails, show placeholder
                setImageError(true);
              }
            }}
            // CRITICAL: avoid server-side optimization fetches to external hosts.
            // In restricted networks this can time out and crash Next.js (-> 504).
            unoptimized
          />
        )}
        {/* Fallback placeholder if image fails to load */}
        {imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
            <div className="text-center text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-xs">Event Image</p>
            </div>
          </div>
        )}
      </div>

      <div className="p-6">
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-primary-dark mb-2 leading-tight line-clamp-2">
            <Link 
              href={`/events/${event.id}`}
              className="hover:text-accent transition-colors"
            >
              {event.title}
            </Link>
          </h3>
          {/* Description - Hidden on all devices */}
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-text">
            <i className="fas fa-calendar w-4 mr-2 text-accent"></i>
            <span>
              {formatDateFixed(event.startDate, 'MMM dd, yyyy')}
              {!isSameDate(event.startDate, event.endDate) && 
                ` - ${formatDateFixed(event.endDate, 'MMM dd, yyyy')}`
              }
            </span>
          </div>
          
          <div className="flex items-center text-sm text-text">
            <i className="fas fa-map-marker-alt w-4 mr-2 text-accent"></i>
            <span>{event.location}</span>
          </div>
        </div>

        {/* Tags - Hidden on mobile */}
        {event.tags && event.tags.length > 0 && (
          <div className="hidden md:flex flex-wrap gap-2 mb-4">
            {event.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-light text-primary-dark text-xs rounded-full"
              >
                {tag}
              </span>
            ))}
            {event.tags.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                +{event.tags.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Buttons - Show on all devices, but adjust layout for mobile */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {!isPastEvent && event.registrationDeadline && (
            <div className="hidden md:block text-sm text-gray-500">
              Registration deadline: {formatDateFixed(event.registrationDeadline, 'MMM dd, yyyy')}
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-2 md:ml-auto md:space-x-2">
            <Link
              href={`/events/${event.id}`}
              className="px-4 py-2 text-primary-dark hover:text-accent text-sm font-medium transition-colors border border-primary-dark/20 rounded-md hover:border-accent text-center"
            >
              {isPastEvent ? 'View Details' : 'Learn More'}
            </Link>
            {isRegistrationOpen && event.status === EventStatus.PUBLISHED && (
              <Link
                href={`/events/${event.id}/register`}
                className="px-4 py-2 bg-accent hover:bg-accent/90 text-white text-sm font-medium rounded-md transition-all duration-300 hover:-translate-y-0.5 text-center"
              >
                Register
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default EventCard;
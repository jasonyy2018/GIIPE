/**
 * Server-side API utilities for SSR
 * These functions are only used on the server side
 */

import { getBackendUrl } from './api-config';
import { Event, EventStatus } from '@/types/public';
import { sanitizeForRSC } from '@/lib/rsc-sanitize';

const BACKEND_URL = getBackendUrl();

/** Ensure no NaN/invalid numbers in event so RSC serialization doesn't throw (returnNaN is not defined) */
function normalizeEvent(e: Event): Event {
  // CRITICAL: Return null (not undefined) for missing/non-finite numbers.
  // RSC can serialize null, but undefined in props triggers "returnNaN is not defined".
  const safeNum = (n: unknown): number | null => {
    if (n == null) return null;
    const v = Number(n);
    return Number.isFinite(v) ? v : null;
  };
  // JSON roundtrip: converts NaN→null, Infinity→null, undefined→omitted, Date→string.
  // Use a replacer to guard against non-finite numbers sneaking through Prisma Decimal types.
  const sanitized = JSON.parse(
    JSON.stringify(e, (_k, v) => {
      if (typeof v === 'number' && !Number.isFinite(v)) return null;
      if (typeof v === 'bigint') return Number(v);
      return v;
    })
  );
  return {
    ...sanitized,
    // Override specific numeric fields to ensure they are finite or null (never undefined).
    price: safeNum(e.price),
    maxAttendees: safeNum(e.maxAttendees) ?? 0,
    registrationCount: safeNum(e.registrationCount),
  };
}

// sanitizeForRSC is shared in '@/lib/rsc-sanitize'

// Allow backend timeout to be configured via environment, with a safe default.
const DEFAULT_API_TIMEOUT = Math.max(1000, Math.min(30000, Number(process.env.SERVER_API_TIMEOUT) || 4000));

interface FetchOptions {
  timeout?: number;
  cache?: RequestCache;
}

/**
 * Fetch with timeout for server-side requests
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit & FetchOptions = {}
): Promise<Response> {
  const { timeout = DEFAULT_API_TIMEOUT, cache, ...fetchOptions } = options; // Slightly higher default to reduce false timeouts

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.warn(`[Server API] Request timeout after ${timeout}ms for URL: ${url}`);
    controller.abort();
  }, timeout);

  try {
    // CRITICAL: Disable ISR and caching to prevent accumulation issues
    // Use no-store to ensure fresh data on every request
    const fetchOptions_clean: RequestInit = {
      ...fetchOptions,
      signal: controller.signal,
      cache: 'no-store', // Always fetch fresh data, no caching
    };
    
    let lastError: unknown = null;
    // Simple retry mechanism for connection failures during startup
    for (let i = 0; i < 3; i++) {
      try {
        const response = await fetch(url, fetchOptions_clean);
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        lastError = error;
        // Node 22 native fetch throws TypeError with 'fetch failed' message
        // The actual reason might be in error.cause
        const errorCause = error instanceof Error && 'cause' in error ? (error as any).cause : null;
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        console.warn(
          `[Server API] Attempt ${i + 1} failed for ${url}. Error: ${errorMessage}`,
          errorCause ? { cause: errorCause } : ''
        );

        const isNetworkError =
          errorMessage.includes('fetch failed') ||
          errorMessage.includes('ECONNREFUSED') ||
          errorMessage.includes('ECONNRESET') ||
          errorMessage.includes('undici') ||
          String(errorCause).includes('ECONNREFUSED') ||
          String(errorCause).includes('ECONNRESET');
           
        if (isNetworkError && i < 2) {
          console.warn('[Server API] Retrying in 2s...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        throw error;
      }
    }

    // If we exhausted retries, surface the last error below
    throw lastError;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      // AbortError is expected on timeout; instead of throwing and breaking SSR,
      // return a synthetic timeout response that callers can handle gracefully.
      console.warn(`[Server API] Request hard timeout after ${timeout}ms for URL: ${url}`);
      return new Response(null, {
        status: 504,
        statusText: `Request timeout after ${timeout}ms`,
      });
    }

    // When upstream is down (e.g. local backend not running), don't spam console.error.
    const errMsg = error instanceof Error ? error.message : String(error);
    const isConnRefused =
      errMsg.includes('fetch failed') ||
      errMsg.includes('ECONNREFUSED') ||
      errMsg.includes('undici') ||
      (error as any)?.cause?.message?.includes?.('ECONNREFUSED');

    if (isConnRefused) {
      console.warn(`[Server API] Upstream unavailable for ${url}: ${errMsg}`);
    } else {
      console.error(`[Server API] Fetch error for URL: ${url}`, error);
    }
    return new Response(null, {
      status: 502,
      statusText: 'Bad Gateway - upstream fetch failed',
    });
  }
}

/**
 * Get upcoming events (PUBLISHED status) for homepage
 */
export async function getUpcomingEvents(limit: number = 6): Promise<Event[]> {
  try {
    const serverApiUrl = process.env.SERVER_API_URL || BACKEND_URL;
    const url = `${serverApiUrl}/api/events?status=${EventStatus.PUBLISHED}&limit=${limit}&offset=0&sortBy=startDate&sortOrder=desc`;
    
    console.log(`[Server API] Fetching upcoming events from: ${url} (timeout=${DEFAULT_API_TIMEOUT}ms)`);
    
    const response = await fetchWithTimeout(url, {
      timeout: DEFAULT_API_TIMEOUT,
      // Don't specify cache option - using next.revalidate instead
    });

    if (!response.ok) {
      console.warn(
        `[Server API] Failed to fetch upcoming events: ${response.status} ${response.statusText}`
      );
      return [];
    }

    const data = await response.json();
    const raw = data.events || data.data || [];
    const events = raw.map((e: Event) => normalizeEvent(e));
    console.log(`[Server API] Successfully fetched ${events.length} upcoming events`);
    return sanitizeForRSC(events);
  } catch (error) {
    // Keep homepage resilient when backend is unavailable.
    const errMsg = error instanceof Error ? error.message : String(error);
    console.warn('[Server API] Error fetching upcoming events:', errMsg);
    // Return empty array instead of throwing to prevent SSR failure
    return [];
  }
}

/**
 * Get past conferences (COMPLETED status) for homepage
 */
export async function getPastConferences(limit: number = 3): Promise<Event[]> {
  try {
    const serverApiUrl = process.env.SERVER_API_URL || BACKEND_URL;
    const url = `${serverApiUrl}/api/events?status=${EventStatus.COMPLETED}&limit=${limit}&offset=0&sortBy=endDate&sortOrder=desc`;
    
    console.log(`[Server API] Fetching past conferences from: ${url} (timeout=${DEFAULT_API_TIMEOUT}ms)`);
    
    const response = await fetchWithTimeout(url, {
      timeout: DEFAULT_API_TIMEOUT,
      // Don't specify cache option - using next.revalidate instead
    });

    if (!response.ok) {
      console.warn(
        `[Server API] Failed to fetch past conferences: ${response.status} ${response.statusText}`
      );
      return [];
    }

    const data = await response.json();
    const raw = data.events || data.data || [];
    const conferences = raw.map((e: Event) => normalizeEvent(e));
    console.log(`[Server API] Successfully fetched ${conferences.length} past conferences`);
    return sanitizeForRSC(conferences);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.warn('[Server API] Error fetching past conferences:', errMsg);
    // Return empty array instead of throwing to prevent SSR failure
    return [];
  }
}

/**
 * Get homepage data (both upcoming events and past conferences)
 * This function fetches both in parallel for better performance
 * CRITICAL: Each function has its own timeout (4s), so total max time is ~4s, not 8s
 */
export async function getHomepageData() {
  try {
    // Fetch both in parallel with individual error handling
    // This ensures one failure doesn't block the other
    // Each function has 4s timeout, so both should complete or timeout within ~4s
    const [eventsResult, conferencesResult] = await Promise.allSettled([
      getUpcomingEvents(100),
      getPastConferences(100),
    ]);

    const events = eventsResult.status === 'fulfilled' ? eventsResult.value : [];
    const conferences = conferencesResult.status === 'fulfilled' ? conferencesResult.value : [];

    // Log if any request failed
    if (eventsResult.status === 'rejected') {
      console.error('[Homepage Data] Failed to fetch upcoming events:', eventsResult.reason);
    }
    if (conferencesResult.status === 'rejected') {
      console.error('[Homepage Data] Failed to fetch past conferences:', conferencesResult.reason);
    }

    return {
      events: sanitizeForRSC(events),
      conferences: sanitizeForRSC(conferences),
    };
  } catch (error) {
    console.error('[Homepage Data] Error fetching homepage data:', error);
    return {
      events: [],
      conferences: [],
    };
  }
}


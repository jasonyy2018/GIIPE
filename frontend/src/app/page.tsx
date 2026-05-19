import { Suspense } from 'react';
import Link from 'next/link';
import PublicLayout from '@/components/public/PublicLayout';
import FeaturedContentClient from '@/components/public/FeaturedContentClient';
import LazyLoadSection from '@/components/performance/LazyLoadSection';
import LazyImage from '@/components/performance/LazyImage';
import HeroSection from '@/components/ui/HeroSection';
import { getHomepageData } from '@/lib/server-api';
import { Event } from '@/types/public';

// Loading skeleton component
function ContentSkeleton() {
  return (
    <div className="flex flex-col justify-center items-center py-20">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mb-4"></div>
      <p className="text-gray-600 text-sm">Loading content...</p>
    </div>
  );
}

// CRITICAL: Disable caching and ISR for homepage to prevent accumulation issues
// Force dynamic rendering to prevent Next.js from caching and revalidating
export const dynamic = 'force-dynamic';
export const revalidate = 0; // Disable ISR completely

// Main page component - Now supports SSR for faster initial load
export default async function Home() {
  // Fetch data on the server side for faster initial render
  // This eliminates the need for client-side API calls on first load
  let initialEvents: Event[] = [];
  let initialConferences: Event[] = [];

  // Optimized SSR: Use a bounded timeout and fail-fast to prevent hanging.
  // If SSR takes too long, render page immediately with empty data (client will fetch).
  // CRITICAL FIX: Use Promise.race with timeout, but ensure timeout is cleaned up.
  let timeoutId: NodeJS.Timeout | null = null;
  try {
    // Tie SSR timeout to server API timeout; cap at 8s so we never freeze SSR.
    const apiTimeout = Math.max(1000, Math.min(15000, Number(process.env.SERVER_API_TIMEOUT) || 4000));
    const SSR_TIMEOUT = Math.min(apiTimeout + 1000, 8000);
    
    // Create a timeout promise that resolves with empty data
    // CRITICAL: Track timeoutId so we can clean it up
    const timeoutPromise = new Promise<{events: Event[], conferences: Event[]}>((resolve) => {
      timeoutId = setTimeout(() => {
        console.warn(
          `[Homepage SSR] Timeout reached after ${SSR_TIMEOUT}ms, rendering with empty data (client will fetch)`
        );
        resolve({ events: [], conferences: [] });
      }, SSR_TIMEOUT);
    });
    
    // Race between data fetch and timeout
    // If timeout wins, we get empty arrays and page still renders immediately
    const homepageData = await Promise.race([
      getHomepageData().finally(() => {
        // CRITICAL: Clean up timeout if data fetch completes first
        // This prevents memory leak from accumulating timers
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      }),
      timeoutPromise
    ]);
    
    // CRITICAL: Ensure timeout is always cleaned up
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    
    // Defensive: ensure nothing non-serializable (e.g. NaN) can reach RSC payload.
    // JSON roundtrip converts NaN/Infinity to null and drops undefined.
    initialEvents = JSON.parse(JSON.stringify(homepageData.events || []));
    initialConferences = JSON.parse(JSON.stringify(homepageData.conferences || []));
    
    // Log for debugging (always log in production for troubleshooting)
    console.log('[Homepage SSR] Loaded data:', {
      eventsCount: initialEvents.length,
      conferencesCount: initialConferences.length,
    });
  } catch (error) {
    // CRITICAL: Always clean up timeout on error
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    
    console.error('[Homepage SSR] Unexpected error:', error);
    // Continue with empty arrays - client will retry
    // This ensures the page still renders even if SSR data fetch fails
    initialEvents = [];
    initialConferences = [];
    
    // Log error details for debugging
    if (error instanceof Error) {
      console.error('[Homepage SSR] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
  }

  return (
    <PublicLayout>
      {/* Hero Section (Banner) */}
      <HeroSection
        title="Global Innovation and Intellectual Property"
        subtitle="Firm Strategies and Policy Challenges in a Rapidly Changing World"
        backgroundImage="hero-bg"
        size="extra-large"
        className="id-home"
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
          <Link
            href="/events"
            className="inline-block py-2 px-4 md:py-3 md:px-6 bg-accent text-white no-underline rounded-[30px] font-semibold transition-all duration-300 border-2 border-accent uppercase tracking-widest text-xs md:text-sm hover:bg-transparent hover:-translate-y-1 hover:shadow-[0_10px_20px_rgba(230,57,70,0.3)] min-w-[100px] md:min-w-[200px] text-center"
          >
            UPCOMING EVENTS
          </Link>
          <Link
            href="/contact"
            className="inline-block py-2 px-4 md:py-3 md:px-6 bg-transparent text-white no-underline rounded-[30px] font-semibold transition-all duration-300 border-2 border-accent uppercase tracking-widest text-xs md:text-sm hover:bg-accent hover:-translate-y-1 hover:shadow-[0_10px_20px_rgba(230,57,70,0.3)] min-w-[100px] md:min-w-[200px] text-center"
          >
            CONTACT US
          </Link>
        </div>
      </HeroSection>

      {/* Featured Content - Load immediately for first screen content */}
      <LazyLoadSection
        rootMargin="300px"
        eager={true}
        placeholder={<ContentSkeleton />}
        minHeight="400px"
      >
        <Suspense fallback={<ContentSkeleton />}>
          <FeaturedContentClient
            initialEvents={initialEvents}
            initialConferences={initialConferences}
          />
        </Suspense>
      </LazyLoadSection>

      {/* Highlights Section - Lazy loaded */}
      <LazyLoadSection
        rootMargin="200px"
        placeholder={
          <div className="highlights bg-gray-100 py-20 md:py-[50px]">
            <div className="container mx-auto px-5 max-w-[1200px]">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-300 rounded w-48 mx-auto mb-10"></div>
                <div className="grid grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-24 bg-gray-300 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        }
      >
        <section className="highlights bg-gray-100 py-20 md:py-[50px]" id="highlights">
          <div className="container mx-auto px-5 max-w-[1200px]">
            <div className="section-title text-center mb-10 md:mb-[30px]">
              <h2 className="text-[1.4rem] md:text-xl text-primary-dark relative inline-block mb-[15px] md:mb-3 font-semibold leading-tight md:leading-[1.3] after:content-[''] after:absolute after:-bottom-2.5 after:left-1/2 after:-translate-x-1/2 after:w-20 after:h-1 after:bg-accent after:rounded-sm">
                Our Sponsors
              </h2>
            </div>

            <div className="sponsors border-t border-black/10 pt-10 md:pt-10 space-y-8 md:space-y-12">
              {/* GIIP1 Beijing 2019 */}
              <div>
                <h3 className="text-lg md:text-xl font-semibold text-primary-dark mb-4 md:mb-6 text-center">GIIP1 Beijing 2019</h3>
                <div className="grid grid-cols-3 gap-4 md:gap-[30px]">
                  <div className="flex items-center justify-center">
                    <LazyImage 
                      src="/images/sponsors/penn-global-research-engagement-grant-program.png"
                      alt="Penn Global Research & Engagement Grant Program"
                      width={200}
                      height={100}
                      className="sponsor-logo h-[100px] md:h-[100px] max-w-full object-contain opacity-80 transition-all duration-300 hover:opacity-100 hover:scale-110"
                      unoptimized
                    />
                  </div>
                  <div className="flex items-center justify-center">
                    <LazyImage 
                      src={encodeURI("/images/sponsors/Penn Wharton China Center.png")} 
                      alt="Penn Wharton China Center"
                      width={200}
                      height={100}
                      className="sponsor-logo h-[100px] md:h-[100px] max-w-full object-contain opacity-80 transition-all duration-300 hover:opacity-100 hover:scale-110"
                      unoptimized
                    />
                  </div>
                  <div className="flex items-center justify-center">
                    <LazyImage 
                      src={encodeURI("/images/sponsors/Guanghua School of Management at Peking University.png")} 
                      alt="Guanghua School of Management, Peking University"
                      width={200}
                      height={100}
                      className="sponsor-logo h-[100px] md:h-[100px] max-w-full object-contain opacity-80 transition-all duration-300 hover:opacity-100 hover:scale-110"
                      unoptimized
                    />
                  </div>
                  <div className="flex items-center justify-center">
                    <LazyImage 
                      src="/images/sponsors/college-business-shufe.jpeg"
                      alt="College of Business, Shanghai University of Finance and Economics"
                      width={200}
                      height={100}
                      className="sponsor-logo h-[100px] md:h-[100px] max-w-full object-contain opacity-80 transition-all duration-300 hover:opacity-100 hover:scale-110"
                      unoptimized
                    />
                  </div>
                  <div className="flex items-center justify-center">
                    <LazyImage 
                      src="/images/sponsors/shu-uts-silc-shanghai-university.png"
                      alt="SHU-UTS SILC Business School, Shanghai University"
                      width={200}
                      height={100}
                      className="sponsor-logo h-[100px] md:h-[100px] max-w-full object-contain opacity-80 transition-all duration-300 hover:opacity-100 hover:scale-110"
                      unoptimized
                    />
                  </div>
              </div>
            </div>
            
            {/* GIIP2 Hangzhou 2024 */}
            <div>
              <h3 className="text-lg md:text-xl font-semibold text-primary-dark mb-4 md:mb-6 text-center">GIIP2 Hangzhou 2024</h3>
              <div className="grid grid-cols-3 gap-4 md:gap-[30px]">
                <div className="flex items-center justify-center">
                  <LazyImage 
                    src={encodeURI("/images/sponsors/Washington University in St.Louis MCDONNELL INTERNATIONAL SCHOLARS ACADEMY.jpeg")} 
                    alt="the McDonnell International Scholars Academy at Washington University in St. Louis"
                    width={200}
                    height={100}
                    className="sponsor-logo h-[100px] md:h-[100px] max-w-full object-contain opacity-80 transition-all duration-300 hover:opacity-100 hover:scale-110"
                    unoptimized
                  />
                </div>
                <div className="flex items-center justify-center">
                  <LazyImage 
                    src={encodeURI("/images/sponsors/the National Institute for Innovation Management and Institute for Intellectual Property Management at Zhejiang University.png")} 
                    alt="the National Institute for Innovation Management at Zhejiang University"
                    width={200}
                    height={100}
                    className="sponsor-logo h-[100px] md:h-[100px] max-w-full object-contain opacity-80 transition-all duration-300 hover:opacity-100 hover:scale-110"
                    unoptimized
                  />
                </div>
                <div className="flex items-center justify-center">
                  <LazyImage 
                    src={encodeURI("/images/sponsors/Institute for Intellectual Property Management at Zhejiang University.png")} 
                    alt="Institute for Intellectual Property Management at Zhejiang University"
                    width={200}
                    height={100}
                    className="sponsor-logo h-[100px] md:h-[100px] max-w-full object-contain opacity-80 transition-all duration-300 hover:opacity-100 hover:scale-110"
                    unoptimized
                  />
                </div>
                <div className="flex items-center justify-center">
                  <LazyImage 
                    src={encodeURI("/images/sponsors/Guanghua School of Management at Peking University.png")} 
                    alt="Guanghua School of Management at Peking University"
                    width={200}
                    height={100}
                    className="sponsor-logo h-[100px] md:h-[100px] max-w-full object-contain opacity-80 transition-all duration-300 hover:opacity-100 hover:scale-110"
                    unoptimized
                  />
                </div>
                <div className="flex items-center justify-center">
                  <LazyImage 
                    src={encodeURI("/images/sponsors/SHANDONUNIVERSIT BUSINESSSCHOOL.jpeg")} 
                    alt="SHANDONUNIVERSIT BUSINESSSCHOOL"
                    width={200}
                    height={100}
                    className="sponsor-logo h-[100px] md:h-[100px] max-w-full object-contain opacity-80 transition-all duration-300 hover:opacity-100 hover:scale-110"
                    unoptimized
                  />
                </div>
              </div>
            </div>
            
            {/* GIIP3 Shanghai 2025 */}
            <div>
              <h3 className="text-lg md:text-xl font-semibold text-primary-dark mb-4 md:mb-6 text-center">GIIP3 Shanghai 2025</h3>
              <div className="grid grid-cols-3 gap-4 md:gap-[30px]">
                <div className="flex items-center justify-center">
                  <LazyImage 
                    src={encodeURI("/images/sponsors/Washington University in St.Louis MCDONNELL INTERNATIONAL SCHOLARS ACADEMY.jpeg")} 
                    alt="the McDonnell International Scholars Academy at Washington University in St. Louis"
                    width={200}
                    height={100}
                    className="sponsor-logo h-[100px] md:h-[100px] max-w-full object-contain opacity-80 transition-all duration-300 hover:opacity-100 hover:scale-110"
                    unoptimized
                  />
                </div>
                <div className="flex items-center justify-center">
                  <LazyImage 
                    src={encodeURI("/images/sponsors/WashU olin Business School.jpeg")} 
                    alt="WashU Olin Business School"
                    width={200}
                    height={100}
                    className="sponsor-logo h-[100px] md:h-[100px] max-w-full object-contain opacity-80 transition-all duration-300 hover:opacity-100 hover:scale-110"
                    unoptimized
                  />
                </div>
                <div className="flex items-center justify-center">
                  <LazyImage 
                    src={encodeURI("/images/sponsors/Guanghua School of Management at Peking University.png")} 
                    alt="Guanghua School of Management, Peking University"
                    width={200}
                    height={100}
                    className="sponsor-logo h-[100px] md:h-[100px] max-w-full object-contain opacity-80 transition-all duration-300 hover:opacity-100 hover:scale-110"
                    unoptimized
                  />
                </div>
                <div className="flex items-center justify-center">
                  <LazyImage 
                    src={encodeURI("/images/sponsors/SCHOOL OF MANAGEMENT FUDAN UNIVERSITY.jpg")} 
                    alt="SCHOOL OF MANAGEMENT FUDAN UNIVERSITY"
                    width={200}
                    height={100}
                    className="sponsor-logo h-[100px] md:h-[100px] max-w-full object-contain opacity-80 transition-all duration-300 hover:opacity-100 hover:scale-110"
                    unoptimized
                  />
                </div>
              </div>
            </div>
            
            {/* GIIP4 Beijing 2026 */}
            <div>
              <h3 className="text-lg md:text-xl font-semibold text-primary-dark mb-4 md:mb-6 text-center">GIIP4 Beijing 2026</h3>
              <div className="grid grid-cols-3 gap-4 md:gap-[30px]">
                <div className="flex items-center justify-center">
                  <LazyImage 
                    src={encodeURI("/images/sponsors/Washington University in St.Louis MCDONNELL INTERNATIONAL SCHOLARS ACADEMY.jpeg")} 
                    alt="The McDonnell International Scholars Academy"
                    width={200}
                    height={100}
                    className="sponsor-logo h-[100px] md:h-[100px] max-w-full object-contain opacity-80 transition-all duration-300 hover:opacity-100 hover:scale-110"
                    unoptimized
                  />
                </div>
                <div className="flex items-center justify-center">
                  <LazyImage 
                    src={encodeURI("/images/sponsors/Boeing Center for Supply Chain Innovation.png")} 
                    alt="Boeing Center for Supply Chain Innovation"
                    width={200}
                    height={100}
                    className="sponsor-logo h-[100px] md:h-[100px] max-w-full object-contain opacity-80 transition-all duration-300 hover:opacity-100 hover:scale-110"
                    unoptimized
                  />
                </div>
                <div className="flex items-center justify-center">
                  <LazyImage 
                    src={encodeURI("/images/sponsors/Guanghua School of Management at Peking University.png")} 
                    alt="Guanghua School of Management, Peking University"
                    width={200}
                    height={100}
                    className="sponsor-logo h-[100px] md:h-[100px] max-w-full object-contain opacity-80 transition-all duration-300 hover:opacity-100 hover:scale-110"
                    unoptimized
                  />
                </div>
              </div>
              </div>
            </div>
          </div>
        </section>
      </LazyLoadSection>
    </PublicLayout>
  );
}
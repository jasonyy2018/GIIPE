'use client'

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, Download } from 'lucide-react';
import PublicLayout from '@/components/public/PublicLayout';
import { Event } from '@/types/public';
import { publicAPI } from '@/lib/public-api';
import { renderMarkdownToHtml } from '@/utils/markdownRenderer';
import { preparePublicEventContentHtml } from '@/utils/eventContentHtml';

export default function EventDetailPage() {
  const params = useParams();
  const eventId = params?.id as string;
  
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (eventId) {
      fetchEvent();
    }
  }, [eventId]);

  // Refresh data when page becomes visible (handles updates from admin)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && eventId) {
        fetchEvent(true); // Force refresh when page becomes visible
      }
    };

    const handleFocus = () => {
      if (eventId) {
        fetchEvent(true); // Force refresh when window regains focus
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [eventId]);

  const fetchEvent = async (forceRefresh = false) => {
    try {
      setLoading(true);
      // Add cache-busting parameter if force refresh
      const url = forceRefresh ? `${eventId}?_t=${Date.now()}` : eventId;
      const eventData = await publicAPI.getEvent(url);
      setEvent(eventData);
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

  if (error || !event) {
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


  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Link
            href="/events"
            className="inline-flex items-center text-primary hover:text-primary-dark transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Events
          </Link>
        </div>

        {/* Event content: prefer backend contentHtml (remark + sanitize) so <mark>/<span style> match what was saved; fallback to client markdown renderer */}
        {(event.contentMarkdown?.trim() || event.contentHtml) ? (
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <h2 className="text-[1.4rem] md:text-2xl font-bold text-gray-900 mb-6">Event Details</h2>
            
            {event.contentHtml?.trim() ? (
              <div 
                className="prose prose-lg max-w-none [&>p]:text-[0.9rem] md:[&>p]:text-base [&>li]:text-[0.9rem] md:[&>li]:text-base [&>h1]:text-[1.4rem] md:[&>h1]:text-3xl [&>h2]:text-[1.4rem] md:[&>h2]:text-2xl [&>h3]:text-[1.4rem] md:[&>h3]:text-xl [&>table]:my-4 [&>table]:w-full [&_th]:border [&_td]:border [&_th]:px-3 [&_td]:px-3 [&_th]:py-2 [&_td]:py-2"
                dangerouslySetInnerHTML={{ 
                  __html: preparePublicEventContentHtml(event.contentHtml!)
                }}
              />
            ) : event.contentMarkdown?.trim() ? (
              <div 
                className="prose prose-lg max-w-none [&>p]:text-[0.9rem] md:[&>p]:text-base [&>li]:text-[0.9rem] md:[&>li]:text-base [&>h1]:text-[1.4rem] md:[&>h1]:text-3xl [&>h2]:text-[1.4rem] md:[&>h2]:text-2xl [&>h3]:text-[1.4rem] md:[&>h3]:text-xl [&>table]:my-4 [&>table]:w-full [&_th]:border [&_td]:border [&_th]:px-3 [&_td]:px-3 [&_th]:py-2 [&_td]:py-2"
                dangerouslySetInnerHTML={{ 
                  __html: renderMarkdownToHtml(event.contentMarkdown!, { includeImageControls: false })
                }}
              />
            ) : null}

            {/* Payment Section - placed above Honorable Guests */}
            {event.isPaymentEnabled && (
              <div className="mt-6">
                <div className="p-5 bg-white border border-gray-200 shadow-sm rounded-lg">
                  <div className="flex flex-col gap-4">
                    {/* Payment Info section */}
                    <div className="flex items-start space-x-4 min-w-0">
                      {event.price && (
                        <>
                          <div className="font-bold text-2xl text-green-600 flex-shrink-0 whitespace-nowrap">
                            ￥{(event.price / 100).toFixed(2)}
                          </div>
                          <div className="min-w-0 border-l border-gray-200 pl-4">
                            <h4 className="text-base font-medium text-gray-900">
                              Registration Payment
                            </h4>
                            <p className="text-sm text-gray-500 mt-0.5">
                              Secure your spot for the event.
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                    
                    {/* Payment action + methods (always below, avoids overlap) */}
                    <div className="flex flex-col items-start w-full border-t border-gray-100 pt-4">
                      {(() => {
                         const today = new Date();
                         today.setHours(0,0,0,0);
                         const eventStart = new Date(event.startDate);
                         eventStart.setHours(0,0,0,0);
                         
                         const isChannelClosed = today >= eventStart;
                         
                         if (isChannelClosed) {
                            return (
                              <button
                                disabled
                                className="px-6 py-2.5 bg-gray-400 text-white text-sm font-medium rounded-md inline-flex items-center gap-2 whitespace-nowrap w-full md:w-auto justify-center cursor-not-allowed"
                              >
                                <span>Payment Channel Closed</span>
                              </button>
                            );
                         } else {
                            return (
                              <div className="flex flex-col gap-3 w-full">
                                <button
                                  onClick={async () => {
                                    try {
                                       const res = await publicAPI.createPaymentOrder(event.id);
                                       if (res.success && res.cashierUrl) {
                                          sessionStorage.setItem('lastOrderId', res.orderId);
                                          sessionStorage.setItem('lastOrderEventTitle', event.title);
                                          sessionStorage.setItem('lastOrderAmount', String(event.price));
                                          let url = res.cashierUrl;
                                          if (!/^https?:\/\//i.test(url)) {
                                            url = `https://${url}`;
                                          }
                                          window.location.href = url;
                                       }
                                    } catch (e: any) {
                                       const msg = e?.message || 'Failed to initialize payment';
                                       const isDbError = /database error|database operation/i.test(msg);
                                       alert(isDbError
                                         ? 'Payment service is temporarily unavailable. Please try again later or contact the administrator.'
                                         : msg);
                                    }
                                  }}
                                  className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-md shadow-sm transition-all inline-flex items-center gap-2 whitespace-nowrap w-full md:w-auto justify-center"
                                >
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                                  <span>Pay to Register</span>
                                </button>
                                
                                {/* 支持支付方式：银联、微信、支付宝、Visa、Mastercard */}
                                <div className="flex flex-col gap-1 w-full">
                                  <span className="text-[11px] text-gray-400">
                                    支持支付方式 / Accepted
                                  </span>
                                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                                    <div className="flex items-center gap-1.5" title="银联 在线支付 / UnionPay Online Payment">
                                      <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden><rect width="24" height="24" rx="4" fill="#0E4595"/><rect x="5" y="7" width="14" height="10" rx="2" fill="none" stroke="#fff" strokeWidth="1.2"/><circle cx="9.5" cy="12" r="2" fill="#fff"/><path fill="#fff" d="M14 10.5h3v3h-3zM14 13.5h3v1h-3z"/></svg>
                                      <span>银联 · 在线支付</span>
                                      <span className="text-[10px] text-gray-400">UnionPay</span>
                                    </div>
                                    <div className="flex items-center gap-1.5" title="微信支付 / WeChat Pay">
                                      <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="#07C160" aria-hidden><path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18z"/></svg>
                                      <span>微信支付</span>
                                      <span className="text-[10px] text-gray-400">WeChat Pay</span>
                                    </div>
                                    <div className="flex items-center gap-1.5" title="支付宝 / Alipay">
                                      <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="#1677FF" aria-hidden><path d="M21.422 15.358c-.578-.27-3.556-1.46-4.346-1.834-.79-.375-1.18-.375-1.578.375s-1.328 1.687-1.625 2.03c-.297.345-.594.39-.86.234-.734-.39-2.062-.76-3.922-2.422-1.453-1.295-2.437-2.89-2.72-3.375-.28-.484-.03-.75.21-1.125.217-.36.484-.75.727-1.125.24-.375.32-.64.484-1.07.163-.438.08-.82-.04-1.148-.12-.33-1.094-2.64-1.5-3.617-.39-.96-.79-.835-1.082-.835h-.93c-.296 0-.78.11-1.187.555-.406.446-1.55 1.524-1.55 3.71 0 2.188 1.594 4.305 1.812 4.594.22.29 3.129 4.78 7.574 6.703 1.06.456 1.886.728 2.531.932.062.02.125.032.188.048.703.203 1.344.172 1.852.102.563-.086 1.734-.703 1.984-1.383.25-.68.25-1.258.172-1.383-.078-.125-.297-.203-.625-.36z"/></svg>
                                      <span>支付宝</span>
                                      <span className="text-[10px] text-gray-400">Alipay</span>
                                    </div>
                                    <div className="flex items-center gap-1.5" title="Visa">
                                      <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-white border border-gray-200">
                                        <span className="text-[10px] font-bold text-[#1A1F71] leading-none">VISA</span>
                                      </span>
                                      <span className="text-[10px] text-gray-500">Visa</span>
                                    </div>
                                    <div className="flex items-center gap-1.5" title="Mastercard">
                                      <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" aria-hidden>
                                        <rect width="24" height="24" rx="4" fill="#F5F5F5" />
                                        <circle cx="10" cy="12" r="4" fill="#EB001B" />
                                        <circle cx="14" cy="12" r="4" fill="#F79E1B" fillOpacity="0.9" />
                                      </svg>
                                      <span className="text-[10px] text-gray-500">Mastercard</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-[11px] text-gray-500 font-normal mt-1 w-full">
                                  外卡（Visa / Mastercard）收取 0.013% 手续费 / Foreign cards incur 0.013% fee.
                                </div>
                              </div>
                            );
                         }
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Honorable Guests Photo Gallery */}
            {event.honorableGuests && event.honorableGuests.length > 0 && (
              <div className="mt-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Honorable Guests</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[...event.honorableGuests]
                    .sort((a, b) => {
                      // Extract last name from full name
                      const getLastName = (name: string): string => {
                        if (!name || !name.trim()) return '';
                        const parts = name.trim().split(/\s+/);
                        // Last name is the last part of the name
                        return parts[parts.length - 1] || '';
                      };
                      
                      const nameA = typeof a === 'string' ? '' : (a.name || '');
                      const nameB = typeof b === 'string' ? '' : (b.name || '');
                      
                      const lastNameA = getLastName(nameA).toLowerCase();
                      const lastNameB = getLastName(nameB).toLowerCase();
                      
                      // Sort by last name, case-insensitive
                      if (lastNameA < lastNameB) return -1;
                      if (lastNameA > lastNameB) return 1;
                      // If last names are equal, sort by full name
                      return nameA.toLowerCase().localeCompare(nameB.toLowerCase());
                    })
                    .map((guest, index) => {
                    // Handle both old format (string) and new format (object)
                    const photoUrl = typeof guest === 'string' ? guest : guest.photoUrl;
                    const name = typeof guest === 'string' ? '' : (guest.name || '');
                    const title = typeof guest === 'string' ? '' : (guest.title || '');
                    
                    // Normalize image URL (convert to relative path if needed)
                    let normalizedUrl = photoUrl;
                    if (photoUrl.includes('localhost:3001/api/uploads/')) {
                      const pathMatch = photoUrl.match(/\/api\/uploads\/(.+)$/);
                      if (pathMatch) {
                        normalizedUrl = `/api/uploads/${pathMatch[1]}`;
                      }
                    } else if (photoUrl.includes('/uploads/') && (photoUrl.includes('localhost:3001') || photoUrl.includes('localhost:3000'))) {
                      const pathMatch = photoUrl.match(/\/uploads\/(.+)$/);
                      if (pathMatch) {
                        normalizedUrl = `/api/uploads/${pathMatch[1]}`;
                      }
                    } else if (photoUrl.startsWith('/uploads/')) {
                      normalizedUrl = `/api${photoUrl}`;
                    }
                    
                    return (
                      <div key={index} className="relative group flex flex-col">
                        <div className="relative">
                          <img
                            src={normalizedUrl}
                            alt={name || `Honorable Guest ${index + 1}`}
                            className="w-full h-48 object-cover rounded-lg border border-gray-200 hover:shadow-lg transition-shadow"
                            onError={(e) => {
                              console.error('Failed to load honorable guest photo:', normalizedUrl);
                              // Hide broken images
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                        {(name || title) && (
                          <div className="mt-2 text-center">
                            {name && (
                              <p className="text-sm font-semibold text-gray-900">{name}</p>
                            )}
                            {title && (
                              <p className="text-xs text-gray-600 mt-1">{title}</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* PDF module visibility is controlled by admin checkbox: showPdfAttachment */}
            {event.pdfAttachment && event.showPdfAttachment !== false && (
              <div className="mt-8">
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {event.pdfAttachmentName || 'Event Document'}
                        </p>
                        <p className="text-xs text-gray-500">PDF attachment available for download</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <a
                        href={`/api/events/${event.id}/pdf?v=${encodeURIComponent(event.updatedAt)}`}
                        download
                        className="px-4 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-md transition-colors inline-flex items-center gap-2 whitespace-nowrap w-full md:w-auto justify-center"
                        onClick={async (e) => {
                          e.preventDefault();
                          try {
                            const response = await fetch(
                              `/api/events/${event.id}/pdf?v=${encodeURIComponent(event.updatedAt)}`
                            );
                            if (!response.ok) {
                              if (response.status === 404) {
                                alert('PDF file not found or not available for this event.');
                              } else {
                                alert('Failed to download PDF. Please try again later.');
                              }
                              return;
                            }
                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = event.pdfAttachmentName || `event-${event.id}.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                          } catch (error) {
                            console.error('Error downloading PDF:', error);
                            alert('An error occurred while downloading the PDF.');
                          }
                        }}
                      >
                        <Download className="w-4 h-4" />
                        <span>Download PDF</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        ) : null}
      </div>
    </PublicLayout>
  );
}
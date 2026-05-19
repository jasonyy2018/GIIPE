'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import AuthGuard from '@/components/auth/AuthGuard';
import Link from 'next/link';
import Image from 'next/image';
import { getImageUrl } from '@/utils/extractImage';
import { format } from 'date-fns';

function BookmarksContent() {
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // User navigation items
  const userNavigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-home', href: '/dashboard', active: false },
    { id: 'events', label: 'My Events', icon: 'fas fa-calendar', href: '/dashboard/events', active: false },
    { id: 'bookmarks', label: 'Bookmarks', icon: 'fas fa-bookmark', href: '/dashboard/bookmarks', active: true },
    { id: 'messages', label: 'Messages', icon: 'fas fa-envelope', href: '/dashboard/messages', active: false },
    { id: 'network', label: 'Network', icon: 'fas fa-users', href: '/dashboard/network', active: false },
    { id: 'profile', label: 'Profile', icon: 'fas fa-user', href: '/dashboard/profile', active: false }
  ];

  useEffect(() => {
    // Load bookmarks from localStorage
    const loadBookmarks = () => {
      try {
        const saved = localStorage.getItem('bookmarks');
        if (saved) {
          setBookmarks(JSON.parse(saved));
        }
      } catch (error) {
        console.error('Error loading bookmarks:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBookmarks();
  }, []);

  const removeBookmark = (id: string, type: 'event' | 'news') => {
    const updated = bookmarks.filter((b: any) => !(b.id === id && b.type === type));
    setBookmarks(updated);
    localStorage.setItem('bookmarks', JSON.stringify(updated));
  };

  return (
    <DashboardLayout 
      title="Bookmarks" 
      navigationItems={userNavigationItems}
      userRole="user"
    >
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : bookmarks.length === 0 ? (
            <div className="text-center py-12">
              <i className="fas fa-bookmark text-4xl text-gray-400 mb-4"></i>
              <p className="text-gray-500 text-lg mb-2">No bookmarks yet</p>
              <Link href="/events" className="text-primary hover:text-primary-dark">
                Browse events →
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {bookmarks.map((bookmark: any) => {
                const imageUrl = getImageUrl(
                  bookmark.featuredImage, 
                  bookmark.contentMarkdown, 
                  bookmark.contentHtml, 
                  bookmark.type
                );
                const href = bookmark.type === 'event' ? `/events/${bookmark.id}` : '#';
                
                return (
                  <div
                    key={`${bookmark.type}-${bookmark.id}`}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden"
                  >
                    <Link href={href} className="block">
                      <div className="relative h-48 w-full">
                        <Image
                          src={imageUrl}
                          alt={bookmark.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          unoptimized={imageUrl.startsWith('/api/uploads/') || imageUrl.includes('localhost')}
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-lg mb-2 line-clamp-2">{bookmark.title}</h3>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">
                            {bookmark.type === 'event' ? 'Event' : 'News'}
                            {bookmark.date && ` • ${format(new Date(bookmark.date), 'MMM dd, yyyy')}`}
                          </span>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              removeBookmark(bookmark.id, bookmark.type);
                            }}
                            className="text-red-500 hover:text-red-700"
                            title="Remove bookmark"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function Bookmarks() {
  return (
    <AuthGuard requireAuth={true}>
      <BookmarksContent />
    </AuthGuard>
  );
}


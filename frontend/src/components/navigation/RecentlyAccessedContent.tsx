'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRecentlyAccessed, type RecentlyAccessedItem } from '@/services/recentlyAccessedService';

interface RecentlyAccessedContentProps {
  maxItems?: number;
  showSearch?: boolean;
  showClearAll?: boolean;
  groupByType?: boolean;
  excludeTypes?: string[];
  className?: string;
  onItemClick?: (item: RecentlyAccessedItem) => void;
}

export default function RecentlyAccessedContent({
  maxItems = 10,
  showSearch = true,
  showClearAll = true,
  groupByType = false,
  excludeTypes = [],
  className = '',
  onItemClick
}: RecentlyAccessedContentProps) {
  const { items, removeItem, clearAll, searchItems } = useRecentlyAccessed({
    maxItems,
    excludeTypes,
    groupByType
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState<RecentlyAccessedItem[]>([]);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  useEffect(() => {
    if (searchQuery.trim()) {
      setFilteredItems(searchItems(searchQuery, maxItems));
    } else {
      setFilteredItems(items);
    }
  }, [searchQuery, items, searchItems, maxItems]);

  const handleItemClick = (item: RecentlyAccessedItem) => {
    if (onItemClick) {
      onItemClick(item);
    }
  };

  const handleRemoveItem = (e: React.MouseEvent, url: string) => {
    e.preventDefault();
    e.stopPropagation();
    removeItem(url);
  };

  const handleClearAll = () => {
    if (showConfirmClear) {
      clearAll();
      setShowConfirmClear(false);
    } else {
      setShowConfirmClear(true);
      // Auto-hide confirmation after 3 seconds
      setTimeout(() => setShowConfirmClear(false), 3000);
    }
  };

  const getTypeIcon = (type: string): string => {
    const typeIcons: Record<string, string> = {
      'event': 'fas fa-calendar',
      'article': 'fas fa-file-alt',
      'news': 'fas fa-newspaper',
      'user': 'fas fa-user',
      'page': 'fas fa-file'
    };
    return typeIcons[type] || 'fas fa-file';
  };

  const getTypeLabel = (type: string): string => {
    const typeLabels: Record<string, string> = {
      'event': 'Event',
      'article': 'Article',
      'news': 'News',
      'user': 'User',
      'page': 'Page'
    };
    return typeLabels[type] || type.charAt(0).toUpperCase() + type.slice(1);
  };

  const formatTimestamp = (timestamp: Date): string => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return timestamp.toLocaleDateString();
  };

  if (items.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <i className="fas fa-clock text-3xl mb-3 text-gray-300"></i>
          <p className="text-sm">No recently accessed content</p>
          <p className="text-xs text-gray-400 mt-1">
            Your recently viewed pages will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <i className="fas fa-clock mr-2 text-primary"></i>
            Recently Accessed
          </h3>
          {showClearAll && items.length > 0 && (
            <button
              onClick={handleClearAll}
              className={`text-sm px-3 py-1 rounded transition-colors ${
                showConfirmClear
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'text-gray-500 hover:text-red-600'
              }`}
            >
              {showConfirmClear ? (
                <>
                  <i className="fas fa-exclamation-triangle mr-1"></i>
                  Confirm Clear
                </>
              ) : (
                <>
                  <i className="fas fa-trash mr-1"></i>
                  Clear All
                </>
              )}
            </button>
          )}
        </div>

        {/* Search */}
        {showSearch && (
          <div className="relative">
            <input
              type="text"
              placeholder="Search recently accessed..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            />
            <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="max-h-96 overflow-y-auto">
        {filteredItems.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <i className="fas fa-search text-2xl mb-2 text-gray-300"></i>
            <p className="text-sm">No items match your search</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredItems.map((item) => (
              <div key={`${item.url}-${item.timestamp.getTime()}`} className="group">
                <Link
                  href={item.url}
                  onClick={() => handleItemClick(item)}
                  className="block p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start space-x-3">
                    {/* Icon or Image */}
                    <div className="flex-shrink-0">
                      {item.image ? (
                        <div className="w-10 h-10 rounded-lg overflow-hidden">
                          <Image
                            src={item.image}
                            alt={item.title}
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          <i className={`${item.icon || getTypeIcon(item.type)} text-gray-600`}></i>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate group-hover:text-primary">
                            {item.title}
                          </p>
                          {item.description && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {item.description}
                            </p>
                          )}
                          <div className="flex items-center mt-2 space-x-3 text-xs text-gray-400">
                            <span className="flex items-center">
                              <i className={`${getTypeIcon(item.type)} mr-1`}></i>
                              {getTypeLabel(item.type)}
                            </span>
                            <span>{formatTimestamp(item.timestamp)}</span>
                            {item.category && (
                              <span className="px-2 py-1 bg-gray-100 rounded text-gray-600">
                                {item.category}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Remove button */}
                        <button
                          onClick={(e) => handleRemoveItem(e, item.url)}
                          className="opacity-0 group-hover:opacity-100 ml-2 p-1 text-gray-400 hover:text-red-600 transition-all"
                          title="Remove from recent"
                        >
                          <i className="fas fa-times text-xs"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {filteredItems.length > 0 && (
        <div className="p-3 border-t border-gray-100 bg-gray-50 text-center">
          <p className="text-xs text-gray-500">
            Showing {filteredItems.length} of {items.length} recent items
          </p>
        </div>
      )}
    </div>
  );
}
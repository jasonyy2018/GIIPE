'use client';

import { useState, useEffect, useMemo } from 'react';
import { SavedItem, SavedContentFilters, SavedContentStats } from '@/types/savedContent';
import { savedContentService } from '@/services/savedContentService';

interface SavedContentProps {
  userId: string;
  limit?: number;
  showFilters?: boolean;
  showBulkActions?: boolean;
}

export default function SavedContent({ 
  userId, 
  limit, 
  showFilters = true, 
  showBulkActions = true 
}: SavedContentProps) {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [stats, setStats] = useState<SavedContentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SavedContentFilters>({
    type: 'all',
    sortBy: 'savedAt',
    sortOrder: 'desc'
  });
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  });

  useEffect(() => {
    loadData();
  }, [userId, filters]);

  useEffect(() => {
    loadMetadata();
  }, [userId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [itemsData, statsData] = await Promise.all([
        savedContentService.getSavedContent(userId, filters),
        savedContentService.getSavedContentStats(userId)
      ]);
      
      setItems(limit ? itemsData.slice(0, limit) : itemsData);
      setStats(statsData);
    } catch (err) {
      setError('Failed to load saved content');
      console.error('Error loading saved content:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMetadata = async () => {
    try {
      const [categories, tags] = await Promise.all([
        savedContentService.getAvailableCategories(userId),
        savedContentService.getAvailableTags(userId)
      ]);
      
      setAvailableCategories(categories);
      setAvailableTags(tags);
    } catch (err) {
      console.error('Error loading metadata:', err);
    }
  };

  const handleFilterChange = (newFilters: Partial<SavedContentFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setSelectedItems(new Set()); // Clear selection when filters change
  };

  const handleTagToggle = (tag: string) => {
    const newSelectedTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    
    setSelectedTags(newSelectedTags);
    handleFilterChange({ tags: newSelectedTags.length > 0 ? newSelectedTags : undefined });
  };

  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    const newDateRange = { ...dateRange, [field]: value };
    setDateRange(newDateRange);
    
    if (newDateRange.start && newDateRange.end) {
      handleFilterChange({
        dateRange: {
          start: new Date(newDateRange.start),
          end: new Date(newDateRange.end)
        }
      });
    } else {
      handleFilterChange({ dateRange: undefined });
    }
  };

  const handleBulkCategorize = async (category: string) => {
    if (selectedItems.size === 0) return;
    
    try {
      await savedContentService.performBulkAction(userId, {
        type: 'categorize',
        itemIds: Array.from(selectedItems),
        metadata: { category }
      });
      
      setSelectedItems(new Set());
      await loadData();
    } catch (err) {
      console.error('Error performing bulk categorize:', err);
    }
  };

  const handleBulkTag = async (tags: string[]) => {
    if (selectedItems.size === 0) return;
    
    try {
      await savedContentService.performBulkAction(userId, {
        type: 'tag',
        itemIds: Array.from(selectedItems),
        metadata: { tags }
      });
      
      setSelectedItems(new Set());
      await loadData();
    } catch (err) {
      console.error('Error performing bulk tag:', err);
    }
  };

  const handleExport = async (format: 'json' | 'csv' | 'pdf') => {
    const itemsToExport = selectedItems.size > 0 
      ? Array.from(selectedItems) 
      : items.map(item => item.id);
    
    try {
      await savedContentService.performBulkAction(userId, {
        type: 'export',
        itemIds: itemsToExport,
        metadata: { format }
      });
    } catch (err) {
      console.error('Error exporting content:', err);
    }
  };

  const handleItemSelect = (itemId: string, selected: boolean) => {
    const newSelection = new Set(selectedItems);
    if (selected) {
      newSelection.add(itemId);
    } else {
      newSelection.delete(itemId);
    }
    setSelectedItems(newSelection);
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedItems(new Set(items.map(item => item.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;
    
    try {
      await savedContentService.performBulkAction(userId, {
        type: 'delete',
        itemIds: Array.from(selectedItems)
      });
      
      setSelectedItems(new Set());
      await loadData();
    } catch (err) {
      console.error('Error performing bulk delete:', err);
    }
  };

  const handleUnsave = async (itemId: string) => {
    try {
      await savedContentService.unsaveContent(userId, itemId);
      await loadData();
    } catch (err) {
      console.error('Error unsaving content:', err);
    }
  };

  const displayedItems = useMemo(() => {
    return limit ? items.slice(0, limit) : items;
  }, [items, limit]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'event': return 'fas fa-calendar';
      case 'article': return 'fas fa-file-alt';
      case 'news': return 'fas fa-newspaper';
      default: return 'fas fa-bookmark';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'event': return 'text-primary';
      case 'article': return 'text-green-600';
      case 'news': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex space-x-4">
            <div className="w-16 h-16 bg-gray-200 rounded"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 mb-2">
          <i className="fas fa-exclamation-triangle text-2xl"></i>
        </div>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={loadData}
          className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Stats and Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold">Saved Content</h3>
          {stats && (
            <span className="text-sm text-gray-500">
              {stats.total} items
            </span>
          )}
        </div>
        
        {showFilters && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              className={`p-2 rounded-md transition-colors ${
                showFiltersPanel 
                  ? 'bg-primary text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="Toggle Filters"
            >
              <i className="fas fa-filter"></i>
            </button>
            
            {showBulkActions && selectedItems.size > 0 && (
              <button
                onClick={handleBulkDelete}
                className="p-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200 transition-colors"
                title="Delete Selected"
              >
                <i className="fas fa-trash"></i>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Stats Overview */}
      {stats && !limit && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{stats.byType.event}</div>
            <div className="text-sm text-gray-600">Events</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.byType.article}</div>
            <div className="text-sm text-gray-600">Articles</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.byType.news}</div>
            <div className="text-sm text-gray-600">News</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.recentlyAdded}</div>
            <div className="text-sm text-gray-600">Recent</div>
          </div>
        </div>
      )}

      {/* Filters Panel */}
      {showFiltersPanel && showFilters && (
        <div className="p-4 bg-gray-50 rounded-lg space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Content Type
              </label>
              <select
                value={filters.type || 'all'}
                onChange={(e) => handleFilterChange({ 
                  type: e.target.value as any 
                })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="event">Events</option>
                <option value="article">Articles</option>
                <option value="news">News</option>
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={filters.category || ''}
                onChange={(e) => handleFilterChange({ 
                  category: e.target.value || undefined 
                })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">All Categories</option>
                {availableCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Sort Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort By
              </label>
              <div className="flex space-x-2">
                <select
                  value={filters.sortBy || 'savedAt'}
                  onChange={(e) => handleFilterChange({ 
                    sortBy: e.target.value as any 
                  })}
                  className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="savedAt">Date Saved</option>
                  <option value="title">Title</option>
                  <option value="type">Type</option>
                  <option value="category">Category</option>
                </select>
                <button
                  onClick={() => handleFilterChange({ 
                    sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' 
                  })}
                  className="p-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                  title={`Sort ${filters.sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                >
                  <i className={`fas fa-sort-${filters.sortOrder === 'asc' ? 'up' : 'down'}`}></i>
                </button>
              </div>
            </div>
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              value={filters.search || ''}
              onChange={(e) => handleFilterChange({ 
                search: e.target.value || undefined 
              })}
              placeholder="Search titles, descriptions, or tags..."
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Clear Filters */}
          <div className="flex justify-end">
            <button
              onClick={() => setFilters({ 
                type: 'all', 
                sortBy: 'savedAt', 
                sortOrder: 'desc' 
              })}
              className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Bulk Actions Header */}
      {showBulkActions && items.length > 0 && (
        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedItems.size === items.length && items.length > 0}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-600">
              Select All ({selectedItems.size} selected)
            </span>
          </label>
        </div>
      )}

      {/* Content List */}
      {displayedItems.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <i className="fas fa-bookmark text-3xl mb-4"></i>
          <p className="mb-2">No saved content found</p>
          <p className="text-sm">
            {filters.search || filters.type !== 'all' || filters.category 
              ? 'Try adjusting your filters' 
              : 'Start saving content to see it here'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedItems.map((item) => (
            <div
              key={item.id}
              className={`flex items-start space-x-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors ${
                selectedItems.has(item.id) ? 'bg-blue-50 border-blue-200' : 'border-gray-200'
              }`}
            >
              {/* Selection Checkbox */}
              {showBulkActions && (
                <input
                  type="checkbox"
                  checked={selectedItems.has(item.id)}
                  onChange={(e) => handleItemSelect(item.id, e.target.checked)}
                  className="mt-1 rounded border-gray-300 text-primary focus:ring-primary"
                />
              )}

              {/* Content Image */}
              {item.image && (
                <div className="flex-shrink-0">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-16 h-16 object-cover rounded"
                  />
                </div>
              )}

              {/* Content Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <i className={`${getTypeIcon(item.type)} ${getTypeColor(item.type)}`}></i>
                      <span className="text-xs font-medium text-gray-500 uppercase">
                        {item.type}
                      </span>
                      {item.category && (
                        <>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500">{item.category}</span>
                        </>
                      )}
                    </div>
                    
                    <h4 className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
                      <a 
                        href={item.url}
                        className="hover:text-primary transition-colors"
                      >
                        {item.title}
                      </a>
                    </h4>
                    
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                      {item.description}
                    </p>
                    
                    {/* Tags */}
                    {item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {item.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                        {item.tags.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{item.tags.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Metadata */}
                    <div className="flex items-center space-x-3 text-xs text-gray-500">
                      <span>Saved {formatDate(item.savedAt)}</span>
                      {item.metadata?.author && (
                        <>
                          <span>•</span>
                          <span>by {item.metadata.author}</span>
                        </>
                      )}
                      {item.metadata?.readTime && (
                        <>
                          <span>•</span>
                          <span>{item.metadata.readTime} min read</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center space-x-2 ml-4">
                    <a
                      href={item.url}
                      className="p-1 text-gray-400 hover:text-primary transition-colors"
                      title="View Content"
                    >
                      <i className="fas fa-external-link-alt text-sm"></i>
                    </a>
                    <button
                      onClick={() => handleUnsave(item.id)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      title="Remove from Saved"
                    >
                      <i className="fas fa-bookmark-slash text-sm"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load More / View All */}
      {limit && items.length > limit && (
        <div className="text-center pt-4">
          <button
            onClick={() => window.location.href = '/bookmarks'}
            className="text-primary hover:text-primary-dark font-medium text-sm"
          >
            View All Saved Content ({stats?.total || items.length})
          </button>
        </div>
      )}
    </div>
  );
}


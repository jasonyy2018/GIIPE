'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AdvancedSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  onSearch?: (searchParams: AdvancedSearchParams) => void;
}

interface AdvancedSearchParams {
  allWords?: string;
  exactPhrase?: string;
  anyWords?: string;
  excludeWords?: string;
  contentType?: string[];
  dateRange?: {
    from?: string;
    to?: string;
    preset?: 'today' | 'week' | 'month' | 'year' | 'custom';
  };
  author?: string;
  category?: string[];
  tags?: string[];
  location?: string;
  language?: string;
  fileType?: string[];
  sortBy?: 'relevance' | 'date' | 'popularity' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export default function AdvancedSearchModal({
  isOpen,
  onClose,
  initialQuery = '',
  onSearch
}: AdvancedSearchModalProps) {
  const router = useRouter();
  const [searchParams, setSearchParams] = useState<AdvancedSearchParams>({
    allWords: initialQuery,
    exactPhrase: '',
    anyWords: '',
    excludeWords: '',
    contentType: [],
    dateRange: { preset: 'year' },
    author: '',
    category: [],
    tags: [],
    location: '',
    language: 'en',
    fileType: [],
    sortBy: 'relevance',
    sortOrder: 'desc'
  });

  const [activeTab, setActiveTab] = useState<'basic' | 'filters' | 'advanced'>('basic');

  useEffect(() => {
    if (initialQuery) {
      setSearchParams(prev => ({ ...prev, allWords: initialQuery }));
    }
  }, [initialQuery]);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleInputChange = (field: keyof AdvancedSearchParams, value: any) => {
    setSearchParams(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleArrayFieldChange = (field: keyof AdvancedSearchParams, value: string, checked: boolean) => {
    setSearchParams(prev => {
      const currentArray = (prev[field] as string[]) || [];
      const newArray = checked 
        ? [...currentArray, value]
        : currentArray.filter(item => item !== value);
      
      return {
        ...prev,
        [field]: newArray
      };
    });
  };

  const handleDateRangeChange = (field: string, value: any) => {
    setSearchParams(prev => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        [field]: value
      }
    }));
  };

  const buildSearchQuery = (): string => {
    const queryParts: string[] = [];

    if (searchParams.allWords) {
      queryParts.push(searchParams.allWords);
    }

    if (searchParams.exactPhrase) {
      queryParts.push(`"${searchParams.exactPhrase}"`);
    }

    if (searchParams.anyWords) {
      const words = searchParams.anyWords.split(' ').filter(w => w.trim());
      if (words.length > 0) {
        queryParts.push(`(${words.join(' OR ')})`);
      }
    }

    if (searchParams.excludeWords) {
      const words = searchParams.excludeWords.split(' ').filter(w => w.trim());
      words.forEach(word => {
        queryParts.push(`-${word}`);
      });
    }

    if (searchParams.author) {
      queryParts.push(`author:"${searchParams.author}"`);
    }

    if (searchParams.location) {
      queryParts.push(`location:"${searchParams.location}"`);
    }

    return queryParts.join(' ');
  };

  const handleSearch = () => {
    const query = buildSearchQuery();
    
    if (!query.trim()) {
      return;
    }

    const urlParams = new URLSearchParams();
    urlParams.set('q', query);
    
    if (searchParams.contentType && searchParams.contentType.length > 0) {
      searchParams.contentType.forEach(type => urlParams.append('type', type));
    }
    
    if (searchParams.category && searchParams.category.length > 0) {
      searchParams.category.forEach(cat => urlParams.append('category', cat));
    }
    
    if (searchParams.dateRange?.preset && searchParams.dateRange.preset !== 'custom') {
      urlParams.set('date', searchParams.dateRange.preset);
    } else if (searchParams.dateRange?.from || searchParams.dateRange?.to) {
      if (searchParams.dateRange.from) urlParams.set('from', searchParams.dateRange.from);
      if (searchParams.dateRange.to) urlParams.set('to', searchParams.dateRange.to);
    }
    
    if (searchParams.language && searchParams.language !== 'en') {
      urlParams.set('lang', searchParams.language);
    }
    
    if (searchParams.sortBy && searchParams.sortBy !== 'relevance') {
      urlParams.set('sort', searchParams.sortBy);
    }
    
    if (searchParams.sortOrder && searchParams.sortOrder !== 'desc') {
      urlParams.set('order', searchParams.sortOrder);
    }

    onSearch?.(searchParams);
    router.push(`/search?${urlParams.toString()}`);
    onClose();
  };

  const resetForm = () => {
    setSearchParams({
      allWords: '',
      exactPhrase: '',
      anyWords: '',
      excludeWords: '',
      contentType: [],
      dateRange: { preset: 'year' },
      author: '',
      category: [],
      tags: [],
      location: '',
      language: 'en',
      fileType: [],
      sortBy: 'relevance',
      sortOrder: 'desc'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div className="inline-block w-full max-w-4xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-200">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Advanced Search</h3>
              <p className="text-sm text-gray-600 mt-1">
                Build complex search queries with multiple criteria
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 mt-6 bg-gray-100 p-1 rounded-lg">
            {[
              { key: 'basic', label: 'Basic Search', icon: 'fas fa-search' },
              { key: 'filters', label: 'Filters', icon: 'fas fa-filter' },
              { key: 'advanced', label: 'Advanced', icon: 'fas fa-cogs' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex-1 flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.key
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <i className={`${tab.icon} mr-2`}></i>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="mt-6 max-h-96 overflow-y-auto">
            {/* Basic Search Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    All of these words
                  </label>
                  <input
                    type="text"
                    value={searchParams.allWords || ''}
                    onChange={(e) => handleInputChange('allWords', e.target.value)}
                    placeholder="Enter words that must appear in results"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    All these words must appear in the search results
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    This exact phrase
                  </label>
                  <input
                    type="text"
                    value={searchParams.exactPhrase || ''}
                    onChange={(e) => handleInputChange('exactPhrase', e.target.value)}
                    placeholder="Enter exact phrase to match"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Find results containing this exact phrase
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Any of these words
                  </label>
                  <input
                    type="text"
                    value={searchParams.anyWords || ''}
                    onChange={(e) => handleInputChange('anyWords', e.target.value)}
                    placeholder="Enter alternative words (space separated)"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Results must contain at least one of these words
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    None of these words
                  </label>
                  <input
                    type="text"
                    value={searchParams.excludeWords || ''}
                    onChange={(e) => handleInputChange('excludeWords', e.target.value)}
                    placeholder="Enter words to exclude (space separated)"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Exclude results containing any of these words
                  </p>
                </div>
              </div>
            )}

            {/* Filters Tab */}
            {activeTab === 'filters' && (
              <div className="space-y-6">
                {/* Content Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Content Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'event', label: 'Events', icon: 'fas fa-calendar' },
                      { value: 'article', label: 'Articles', icon: 'fas fa-file-alt' },
                      { value: 'news', label: 'News', icon: 'fas fa-newspaper' },
                      { value: 'user', label: 'Users', icon: 'fas fa-user' }
                    ].map(type => (
                      <label key={type.value} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={searchParams.contentType?.includes(type.value) || false}
                          onChange={(e) => handleArrayFieldChange('contentType', type.value, e.target.checked)}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <i className={`${type.icon} text-gray-400`}></i>
                        <span className="text-sm font-medium text-gray-700">{type.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Date Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Date Range
                  </label>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: 'today', label: 'Today' },
                        { value: 'week', label: 'This Week' },
                        { value: 'month', label: 'This Month' },
                        { value: 'year', label: 'This Year' },
                        { value: 'custom', label: 'Custom Range' }
                      ].map(preset => (
                        <button
                          key={preset.value}
                          onClick={() => handleDateRangeChange('preset', preset.value)}
                          className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                            searchParams.dateRange?.preset === preset.value
                              ? 'bg-primary text-white border-primary'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    
                    {searchParams.dateRange?.preset === 'custom' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">From</label>
                          <input
                            type="date"
                            value={searchParams.dateRange?.from || ''}
                            onChange={(e) => handleDateRangeChange('from', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">To</label>
                          <input
                            type="date"
                            value={searchParams.dateRange?.to || ''}
                            onChange={(e) => handleDateRangeChange('to', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Categories */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Categories
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      'Conference',
                      'Workshop',
                      'Research',
                      'Professional',
                      'Regulatory',
                      'Technology',
                      'Innovation',
                      'Legal'
                    ].map(category => (
                      <label key={category} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={searchParams.category?.includes(category) || false}
                          onChange={(e) => handleArrayFieldChange('category', category, e.target.checked)}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-sm font-medium text-gray-700">{category}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Advanced Tab */}
            {activeTab === 'advanced' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Author
                    </label>
                    <input
                      type="text"
                      value={searchParams.author || ''}
                      onChange={(e) => handleInputChange('author', e.target.value)}
                      placeholder="Search by author name"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location
                    </label>
                    <input
                      type="text"
                      value={searchParams.location || ''}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      placeholder="Search by location"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Language
                    </label>
                    <select
                      value={searchParams.language || 'en'}
                      onChange={(e) => handleInputChange('language', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                      <option value="zh">Chinese</option>
                      <option value="ja">Japanese</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sort Results
                    </label>
                    <div className="flex space-x-2">
                      <select
                        value={searchParams.sortBy || 'relevance'}
                        onChange={(e) => handleInputChange('sortBy', e.target.value)}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        <option value="relevance">Relevance</option>
                        <option value="date">Date</option>
                        <option value="popularity">Popularity</option>
                        <option value="title">Title</option>
                      </select>
                      <select
                        value={searchParams.sortOrder || 'desc'}
                        onChange={(e) => handleInputChange('sortOrder', e.target.value)}
                        className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        <option value="desc">↓</option>
                        <option value="asc">↑</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* File Types */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    File Types
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'pdf', label: 'PDF', icon: 'fas fa-file-pdf' },
                      { value: 'doc', label: 'Word', icon: 'fas fa-file-word' },
                      { value: 'ppt', label: 'PowerPoint', icon: 'fas fa-file-powerpoint' },
                      { value: 'xls', label: 'Excel', icon: 'fas fa-file-excel' },
                      { value: 'img', label: 'Images', icon: 'fas fa-file-image' },
                      { value: 'video', label: 'Videos', icon: 'fas fa-file-video' }
                    ].map(fileType => (
                      <label key={fileType.value} className="flex items-center space-x-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={searchParams.fileType?.includes(fileType.value) || false}
                          onChange={(e) => handleArrayFieldChange('fileType', fileType.value, e.target.checked)}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <i className={`${fileType.icon} text-gray-400 text-sm`}></i>
                        <span className="text-sm text-gray-700">{fileType.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Query Preview */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Query Preview
                  </label>
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <code className="text-sm text-gray-800 font-mono">
                      {buildSearchQuery() || 'Enter search criteria above to see query preview'}
                    </code>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-200">
            <button
              onClick={resetForm}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <i className="fas fa-undo mr-2"></i>
              Reset Form
            </button>
            
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSearch}
                disabled={!buildSearchQuery().trim()}
                className="px-6 py-3 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <i className="fas fa-search mr-2"></i>
                Search
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
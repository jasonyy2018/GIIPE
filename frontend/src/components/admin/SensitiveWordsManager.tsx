'use client';

import { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  AlertTriangle,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Shield,
  X,
  Save
} from 'lucide-react';

interface SensitiveWord {
  id: string;
  word: string;
  level: number;
  category: string;
  isActive: boolean;
  createdAt: string;
  detectionCount?: number;
  detectionRate?: number;
}

interface SensitiveWordsResponse {
  words: SensitiveWord[];
  total: number;
}

interface SensitiveWordsManagerProps {
  onRefresh?: () => void;
}

export function SensitiveWordsManager({ onRefresh }: SensitiveWordsManagerProps) {
  const [data, setData] = useState<SensitiveWordsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingWord, setEditingWord] = useState<SensitiveWord | null>(null);
  const [editForm, setEditForm] = useState({ word: '', level: 1, category: 'general', isActive: true });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newWord, setNewWord] = useState({ word: '', level: 1, category: 'general', isActive: true });
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    level: '',
    isActive: '',
    page: 1,
    limit: 20,
  });

  useEffect(() => {
    fetchSensitiveWords();
  }, [filters]);

  const fetchSensitiveWords = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, value.toString());
        }
      });

      const response = await fetch(`/api/admin/sensitive-words?${queryParams}`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      } else {
        console.error('Failed to fetch sensitive words');
      }
    } catch (error) {
      console.error('Error fetching sensitive words:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleEdit = (word: SensitiveWord) => {
    setEditingWord(word);
    setEditForm({
      word: word.word,
      level: word.level,
      category: word.category,
      isActive: word.isActive,
    });
  };

  const handleCancelEdit = () => {
    setEditingWord(null);
    setEditForm({ word: '', level: 1, category: 'general', isActive: true });
  };

  const handleSaveEdit = async () => {
    if (!editingWord) return;

    if (!editForm.word.trim()) {
      alert('Word cannot be empty');
      return;
    }

    try {
      const response = await fetch(`/api/admin/sensitive-words/${editingWord.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          word: editForm.word.trim(),
          level: editForm.level,
          category: editForm.category,
          isActive: editForm.isActive,
        }),
      });

      if (response.ok) {
        await fetchSensitiveWords();
        handleCancelEdit();
        if (onRefresh) onRefresh();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to update word');
      }
    } catch (error) {
      console.error('Error updating word:', error);
      alert('Error updating word');
    }
  };

  const handleDelete = async (wordId: string, wordText: string) => {
    if (!confirm(`Are you sure you want to delete the word "${wordText}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/sensitive-words/${wordId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchSensitiveWords();
        if (onRefresh) onRefresh();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to delete word');
      }
    } catch (error) {
      console.error('Error deleting word:', error);
      alert('Error deleting word');
    }
  };

  const handleAddWord = async () => {
    if (!newWord.word.trim()) {
      alert('Word cannot be empty');
      return;
    }

    try {
      const response = await fetch('/api/admin/sensitive-words', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          word: newWord.word.trim(),
          level: newWord.level,
          category: newWord.category,
          isActive: newWord.isActive,
        }),
      });

      if (response.ok) {
        setNewWord({ word: '', level: 1, category: 'general', isActive: true });
        setShowAddForm(false);
        await fetchSensitiveWords();
        if (onRefresh) onRefresh();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to add word');
      }
    } catch (error) {
      console.error('Error adding word:', error);
      alert('Error adding word');
    }
  };

  const getLevelBadge = (level: number) => {
    const badges = {
      1: 'bg-green-100 text-green-800',
      2: 'bg-yellow-100 text-yellow-800',
      3: 'bg-orange-100 text-orange-800',
      4: 'bg-red-100 text-red-800',
      5: 'bg-purple-100 text-purple-800',
    };
    return badges[level as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  const getLevelLabel = (level: number) => {
    const labels = {
      1: 'Low',
      2: 'Medium',
      3: 'High',
      4: 'Critical',
      5: 'Severe',
    };
    return labels[level as keyof typeof labels] || 'Unknown';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        {/* Header and Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h3 className="text-lg font-medium text-gray-900">Sensitive Words</h3>
            
            <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search words..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                value={filters.search}
                onChange={(e) => handleFilterChange({ search: e.target.value })}
              />
              </div>
              
              {/* Add Word Button */}
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-dark"
              >
                <Shield className="h-4 w-4 mr-2" />
                {showAddForm ? 'Cancel' : 'Add Word'}
              </button>
            </div>
          </div>

          {/* Add Word Form */}
          {showAddForm && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Add New Sensitive Word</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Word</label>
                  <input
                    type="text"
                    value={newWord.word}
                    onChange={(e) => setNewWord({ ...newWord, word: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm"
                    placeholder="Enter word"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                  <select
                    value={newWord.level}
                    onChange={(e) => setNewWord({ ...newWord, level: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm"
                  >
                    <option value="1">Low (1)</option>
                    <option value="2">Medium (2)</option>
                    <option value="3">High (3)</option>
                    <option value="4">Critical (4)</option>
                    <option value="5">Severe (5)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={newWord.category}
                    onChange={(e) => setNewWord({ ...newWord, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm"
                  >
                    <option value="profanity">Profanity</option>
                    <option value="hate_speech">Hate Speech</option>
                    <option value="harassment">Harassment</option>
                    <option value="spam">Spam</option>
                    <option value="general">General</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleAddWord}
                    className="w-full px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-dark"
                  >
                    Add Word
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <select
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              value={filters.category}
              onChange={(e) => handleFilterChange({ category: e.target.value })}
            >
              <option value="">All Categories</option>
              <option value="profanity">Profanity</option>
              <option value="hate_speech">Hate Speech</option>
              <option value="harassment">Harassment</option>
              <option value="spam">Spam</option>
              <option value="general">General</option>
            </select>

            <select
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              value={filters.level}
              onChange={(e) => handleFilterChange({ level: e.target.value })}
            >
              <option value="">All Levels</option>
              <option value="1">Low (1)</option>
              <option value="2">Medium (2)</option>
              <option value="3">High (3)</option>
              <option value="4">Critical (4)</option>
              <option value="5">Severe (5)</option>
            </select>

            <select
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              value={filters.isActive}
              onChange={(e) => handleFilterChange({ isActive: e.target.value })}
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>

        {/* Words Table */}
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Word
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Detection Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data?.words.map((word) => (
                <tr key={word.id} className={`hover:bg-gray-50 ${editingWord?.id === word.id ? 'bg-blue-50' : ''}`}>
                  <td className="px-6 py-4">
                    {editingWord?.id === word.id ? (
                      <input
                        type="text"
                        value={editForm.word}
                        onChange={(e) => setEditForm({ ...editForm, word: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm"
                      />
                    ) : (
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Shield className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {word.word}
                        </div>
                        <div className="text-sm text-gray-500">
                          Added {new Date(word.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingWord?.id === word.id ? (
                      <select
                        value={editForm.level}
                        onChange={(e) => setEditForm({ ...editForm, level: parseInt(e.target.value) })}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm"
                      >
                        <option value="1">Low (1)</option>
                        <option value="2">Medium (2)</option>
                        <option value="3">High (3)</option>
                        <option value="4">Critical (4)</option>
                        <option value="5">Severe (5)</option>
                      </select>
                    ) : (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLevelBadge(word.level)}`}>
                      {getLevelLabel(word.level)} ({word.level})
                    </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingWord?.id === word.id ? (
                      <select
                        value={editForm.category}
                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm"
                      >
                        <option value="profanity">Profanity</option>
                        <option value="hate_speech">Hate Speech</option>
                        <option value="harassment">Harassment</option>
                        <option value="spam">Spam</option>
                        <option value="general">General</option>
                      </select>
                    ) : (
                    <span className="text-sm text-gray-900 capitalize">
                      {word.category.replace('_', ' ')}
                    </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingWord?.id === word.id ? (
                      <select
                        value={editForm.isActive.toString()}
                        onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === 'true' })}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm"
                      >
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    ) : (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      word.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {word.isActive ? 'Active' : 'Inactive'}
                    </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <TrendingUp className="h-4 w-4 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm text-gray-900">
                          {word.detectionCount || 0} detections
                        </div>
                        <div className="text-xs text-gray-500">
                          {(word.detectionRate || 0).toFixed(2)}/day
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {editingWord?.id === word.id ? (
                    <div className="flex items-center space-x-2">
                      <button
                          onClick={handleSaveEdit}
                          className="text-green-600 hover:text-green-900"
                          title="Save"
                      >
                          <Save className="h-4 w-4" />
                      </button>
                      <button
                          onClick={handleCancelEdit}
                          className="text-gray-600 hover:text-gray-900"
                          title="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(word)}
                        className="text-green-600 hover:text-green-900"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                          onClick={() => handleDelete(word.id, word.word)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && Math.ceil(data.total / filters.limit) > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
            <div className="flex justify-between flex-1 sm:hidden">
              <button
                onClick={() => handlePageChange(Math.max(1, filters.page - 1))}
                disabled={filters.page === 1}
                className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(Math.min(Math.ceil(data.total / filters.limit), filters.page + 1))}
                disabled={filters.page === Math.ceil(data.total / filters.limit)}
                className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(filters.page - 1) * filters.limit + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(filters.page * filters.limit, data.total)}
                  </span>{' '}
                  of <span className="font-medium">{data.total}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => handlePageChange(Math.max(1, filters.page - 1))}
                    disabled={filters.page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handlePageChange(Math.min(Math.ceil(data.total / filters.limit), filters.page + 1))}
                    disabled={filters.page === Math.ceil(data.total / filters.limit)}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
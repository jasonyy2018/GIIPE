'use client';



import { useState, useEffect } from 'react';

import { toast } from 'react-hot-toast';



interface SensitiveWord {

  id: string;

  word: string;

  level: number;

  category: string;

  isActive: boolean;

  createdAt: string;

}



interface WordCategory {

  name: string;

  count: number;

  description: string;

}



interface WordListVersion {

  id: string;

  version: string;

  timestamp: string;

  description: string;

  wordCount: number;

  changes: {

    added: number;

    removed: number;

    modified: number;

  };

}



export default function SensitiveWordManager() {

  const [words, setWords] = useState<SensitiveWord[]>([]);

  const [categories, setCategories] = useState<WordCategory[]>([]);

  const [versions, setVersions] = useState<WordListVersion[]>([]);

  const [loading, setLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState('all');

  const [selectedLevel, setSelectedLevel] = useState('all');

  const [searchTerm, setSearchTerm] = useState('');

  const [showAddForm, setShowAddForm] = useState(false);

  const [showBulkImport, setShowBulkImport] = useState(false);

  const [showVersions, setShowVersions] = useState(false);

  const [showTestInterface, setShowTestInterface] = useState(false);

  const [newWord, setNewWord] = useState({ word: '', level: 1, category: 'general' });

  const [bulkImportData, setBulkImportData] = useState('');

  const [importFormat, setImportFormat] = useState<'csv' | 'json'>('csv');

  const [testContent, setTestContent] = useState('');

  const [testResults, setTestResults] = useState<any>(null);

  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());



  const severityLevels = [

    { value: 1, label: 'Low', color: 'bg-green-100 text-green-800' },

    { value: 2, label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },

    { value: 3, label: 'High', color: 'bg-orange-100 text-orange-800' },

    { value: 4, label: 'Critical', color: 'bg-red-100 text-red-800' },

    { value: 5, label: 'Severe', color: 'bg-purple-100 text-purple-800' }

  ];



  useEffect(() => {

    fetchWords();

    fetchCategories();

    fetchVersions();

  }, []);



  const fetchWords = async () => {

    try {

      const response = await fetch('/api/admin/sensitive-words');

      if (response.ok) {

        const data = await response.json();

        setWords(data);

      } else {

        toast.error('Failed to fetch sensitive words');

      }

    } catch (error) {

      toast.error('Error fetching sensitive words');

    } finally {

      setLoading(false);

    }

  };



  const fetchCategories = async () => {

    try {

      const response = await fetch('/api/admin/sensitive-words/categories');

      if (response.ok) {

        const data = await response.json();

        setCategories(data);

      }

    } catch (error) {

      console.error('Error fetching categories:', error);

    }

  };



  const fetchVersions = async () => {

    try {

      const response = await fetch('/api/admin/sensitive-words/versions');

      if (response.ok) {

        const data = await response.json();

        setVersions(data);

      }

    } catch (error) {

      console.error('Error fetching versions:', error);

    }

  };



  const addWord = async () => {

    if (!newWord.word.trim()) {

      toast.error('Word is required');

      return;

    }



    try {

      const response = await fetch('/api/admin/sensitive-words', {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify(newWord)

      });



      if (response.ok) {

        toast.success('Word added successfully');

        setNewWord({ word: '', level: 1, category: 'general' });

        setShowAddForm(false);

        fetchWords();

        fetchCategories();

      } else {

        const error = await response.json();

        toast.error(error.message || 'Failed to add word');

      }

    } catch (error) {

      toast.error('Error adding word');

    }

  };



  const updateWord = async (id: string, updates: Partial<SensitiveWord>) => {

    try {

      const response = await fetch(`/api/admin/sensitive-words/${id}`, {

        method: 'PUT',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify(updates)

      });



      if (response.ok) {

        toast.success('Word updated successfully');

        fetchWords();

        fetchCategories();

      } else {

        toast.error('Failed to update word');

      }

    } catch (error) {

      toast.error('Error updating word');

    }

  };



  const deleteWord = async (id: string) => {

    if (!confirm('Are you sure you want to delete this word  ')) return;



    try {

      const response = await fetch(`/api/admin/sensitive-words/${id}`, {

        method: 'DELETE'

      });



      if (response.ok) {

        toast.success('Word deleted successfully');

        fetchWords();

        fetchCategories();

      } else {

        toast.error('Failed to delete word');

      }

    } catch (error) {

      toast.error('Error deleting word');

    }

  };



  const bulkImport = async () => {

    if (!bulkImportData.trim()) {

      toast.error('Import data is required');

      return;

    }



    try {

      const response = await fetch('/api/admin/sensitive-words/import', {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({

          data: bulkImportData,

          format: importFormat

        })

      });



      if (response.ok) {

        const result = await response.json();

        toast.success(`Imported ${result.imported} words successfully`);

        setBulkImportData('');

        setShowBulkImport(false);

        fetchWords();

        fetchCategories();

      } else {

        const error = await response.json();

        toast.error(error.message || 'Failed to import words');

      }

    } catch (error) {

      toast.error('Error importing words');

    }

  };



  const exportWords = async (format: 'csv' | 'json') => {

    try {

      const response = await fetch(`/api/admin/sensitive-words/export?format=${format}`);

      if (response.ok) {

        const blob = await response.blob();

        const url = window.URL.createObjectURL(blob);

        const a = document.createElement('a');

        a.href = url;

        a.download = `sensitive-words.${format}`;

        document.body.appendChild(a);

        a.click();

        window.URL.revokeObjectURL(url);

        document.body.removeChild(a);

        toast.success('Words exported successfully');

      } else {

        toast.error('Failed to export words');

      }

    } catch (error) {

      toast.error('Error exporting words');

    }

  };



  const testWords = async () => {

    if (!testContent.trim()) {

      toast.error('Test content is required');

      return;

    }



    try {

      const response = await fetch('/api/admin/sensitive-words/test', {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ content: testContent })

      });



      if (response.ok) {

        const result = await response.json();

        setTestResults(result);

      } else {

        toast.error('Failed to test content');

      }

    } catch (error) {

      toast.error('Error testing content');

    }

  };



  const createVersion = async () => {

    const description = prompt('Enter version description:');

    if (!description) return;



    try {

      const response = await fetch('/api/admin/sensitive-words/versions', {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ description })

      });



      if (response.ok) {

        toast.success('Version created successfully');

        fetchVersions();

      } else {

        toast.error('Failed to create version');

      }

    } catch (error) {

      toast.error('Error creating version');

    }

  };



  const restoreVersion = async (versionId: string) => {

    if (!confirm('Are you sure you want to restore this version   This will overwrite current words.')) return;



    try {

      const response = await fetch(`/api/admin/sensitive-words/versions/${versionId}/restore`, {

        method: 'POST'

      });



      if (response.ok) {

        toast.success('Version restored successfully');

        fetchWords();

        fetchCategories();

      } else {

        toast.error('Failed to restore version');

      }

    } catch (error) {

      toast.error('Error restoring version');

    }

  };



  const bulkUpdateSelected = async (updates: Partial<SensitiveWord>) => {

    if (selectedWords.size === 0) {

      toast.error('No words selected');

      return;

    }



    try {

      const response = await fetch('/api/admin/sensitive-words/bulk-update', {

        method: 'PUT',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({

          wordIds: Array.from(selectedWords),

          updates

        })

      });



      if (response.ok) {

        toast.success(`Updated ${selectedWords.size} words successfully`);

        setSelectedWords(new Set());

        fetchWords();

        fetchCategories();

      } else {

        toast.error('Failed to update words');

      }

    } catch (error) {

      toast.error('Error updating words');

    }

  };



  const filteredWords = words.filter(word => {

    const matchesSearch = word.word.toLowerCase().includes(searchTerm.toLowerCase()) ||

                         word.category.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || word.category === selectedCategory;

    const matchesLevel = selectedLevel === 'all' || word.level.toString() === selectedLevel;

    return matchesSearch && matchesCategory && matchesLevel;

  });



  const getSeverityLabel = (level: number) => {

    return severityLevels.find(s => s.value === level) || severityLevels[0];

  };



  if (loading) {

    return (

      <div className="p-6">

        <div className="flex items-center justify-center h-64">

          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>

        </div>

      </div>

    );

  }



  return (

    <div className="p-6">

      <div className="flex justify-between items-center mb-6">

        <div>

          <h2 className="text-2xl font-bold text-gray-900">Sensitive Word Management</h2>

          <p className="text-gray-600">Manage content filtering and moderation rules</p>

        </div>

        <div className="flex space-x-3">

          <button

            onClick={() => setShowTestInterface(!showTestInterface)}

            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"

          >

            <i className="fas fa-vial mr-2"></i>

            Test Filter

          </button>

          <button

            onClick={() => setShowVersions(!showVersions)}

            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"

          >

            <i className="fas fa-history mr-2"></i>

            Versions

          </button>

          <button

            onClick={() => setShowBulkImport(!showBulkImport)}

            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"

          >

            <i className="fas fa-upload mr-2"></i>

            Import

          </button>

          <button

            onClick={() => exportWords('csv')}

            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"

          >

            <i className="fas fa-download mr-2"></i>

            Export

          </button>

          <button

            onClick={() => setShowAddForm(!showAddForm)}

            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"

          >

            <i className="fas fa-plus mr-2"></i>

            Add Word

          </button>

        </div>

      </div>



      {/* Statistics Cards */}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">

        <div className="bg-white p-4 rounded-lg border border-gray-200">

          <div className="flex items-center">

            <div className="p-2 bg-light rounded-lg">

              <i className="fas fa-filter text-primary"></i>

            </div>

            <div className="ml-3">

              <p className="text-sm font-medium text-gray-500">Total Words</p>

              <p className="text-2xl font-semibold text-gray-900">{words.length}</p>

            </div>

          </div>

        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">

          <div className="flex items-center">

            <div className="p-2 bg-green-100 rounded-lg">

              <i className="fas fa-check-circle text-green-600"></i>

            </div>

            <div className="ml-3">

              <p className="text-sm font-medium text-gray-500">Active Words</p>

              <p className="text-2xl font-semibold text-gray-900">

                {words.filter(w => w.isActive).length}

              </p>

            </div>

          </div>

        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">

          <div className="flex items-center">

            <div className="p-2 bg-purple-100 rounded-lg">

              <i className="fas fa-tags text-purple-600"></i>

            </div>

            <div className="ml-3">

              <p className="text-sm font-medium text-gray-500">Categories</p>

              <p className="text-2xl font-semibold text-gray-900">{categories.length}</p>

            </div>

          </div>

        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">

          <div className="flex items-center">

            <div className="p-2 bg-red-100 rounded-lg">

              <i className="fas fa-exclamation-triangle text-red-600"></i>

            </div>

            <div className="ml-3">

              <p className="text-sm font-medium text-gray-500">High Severity</p>

              <p className="text-2xl font-semibold text-gray-900">

                {words.filter(w => w.level >= 4).length}

              </p>

            </div>

          </div>

        </div>

      </div>



      {/* Test Interface */}

      {showTestInterface && (

        <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">

          <h3 className="text-lg font-semibold mb-4">Test Content Filter</h3>

          <div className="space-y-4">

            <textarea

              placeholder="Enter content to test against sensitive word filters..."

              value={testContent}

              onChange={(e) => setTestContent(e.target.value)}

              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"

              rows={4}

            />

            <div className="flex space-x-3">

              <button

                onClick={testWords}

                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"

              >

                Test Content

              </button>

              <button

                onClick={() => setShowTestInterface(false)}

                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"

              >

                Close

              </button>

            </div>

            {testResults && (

              <div className="mt-4 p-4 border rounded-md bg-white">

                <h4 className="font-semibold mb-2">Test Results:</h4>

                <div className="space-y-2">

                  <p>Detected Words: {testResults.detectedWords?.length || 0}</p>

                  <p>Highest Severity: {testResults.maxSeverity || 'None'}</p>

                  <p>Action Recommended: {testResults.action || 'Allow'}</p>

                  {testResults.detectedWords?.length > 0 && (

                    <div>

                      <p className="font-medium">Flagged Words:</p>

                      <div className="flex flex-wrap gap-2 mt-1">

                        {testResults.detectedWords.map((word: any, index: number) => (

                          <span

                            key={index}

                            className={`px-2 py-1 rounded text-sm ${getSeverityLabel(word.level).color}`}

                          >

                            {word.word} (Level {word.level})

                          </span>

                        ))}

                      </div>

                    </div>

                  )}

                </div>

              </div>

            )}

          </div>

        </div>

      )}



      {/* Version Management Modal */}

      {showVersions && (

        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">

          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-96 overflow-y-auto">

            <div className="flex justify-between items-center mb-4">

              <h3 className="text-lg font-semibold">Word List Versions</h3>

              <div className="flex space-x-2">

                <button

                  onClick={createVersion}

                  className="px-3 py-1 bg-primary text-white rounded hover:bg-primary-dark transition-colors"

                >

                  Create Version

                </button>

                <button

                  onClick={() => setShowVersions(false)}

                  className="text-gray-400 hover:text-gray-600"

                >

                  <i className="fas fa-times"></i>

                </button>

              </div>

            </div>

            <div className="space-y-3">

              {versions.map(version => (

                <div key={version.id} className="flex items-center justify-between p-3 border rounded-md">

                  <div>

                    <div className="font-medium">Version {version.version}</div>

                    <div className="text-sm text-gray-600">{version.description}</div>

                    <div className="text-xs text-gray-400">

                      {new Date(version.timestamp).toLocaleString()}  {version.wordCount} words

                    </div>

                    <div className="text-xs text-gray-500">

                      Changes: +{version.changes.added} -{version.changes.removed} ~{version.changes.modified}

                    </div>

                  </div>

                  <button

                    onClick={() => restoreVersion(version.id)}

                    className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"

                  >

                    Restore

                  </button>

                </div>

              ))}

              {versions.length === 0 && (

                <div className="text-center text-gray-500 py-8">No versions available</div>

              )}

            </div>

          </div>

        </div>

      )}



      {/* Bulk Import Modal */}

      {showBulkImport && (

        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">

          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">

            <div className="flex justify-between items-center mb-4">

              <h3 className="text-lg font-semibold">Bulk Import Words</h3>

              <button

                onClick={() => setShowBulkImport(false)}

                className="text-gray-400 hover:text-gray-600"

              >

                <i className="fas fa-times"></i>

              </button>

            </div>

            <div className="space-y-4">

              <div>

                <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>

                <select

                  value={importFormat}

                  onChange={(e) => setImportFormat(e.target.value as 'csv' | 'json')}

                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"

                >

                  <option value="csv">CSV</option>

                  <option value="json">JSON</option>

                </select>

              </div>

              <div>

                <label className="block text-sm font-medium text-gray-700 mb-2">Data</label>

                <textarea

                  placeholder={importFormat === 'csv' 

                    ? 'word,level,category\nexample,2,profanity\ntest,1,general'

                    : '[{"word":"example","level":2,"category":"profanity"}]'

                  }

                  value={bulkImportData}

                  onChange={(e) => setBulkImportData(e.target.value)}

                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"

                  rows={8}

                />

              </div>

              <div className="flex space-x-3">

                <button

                  onClick={bulkImport}

                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"

                >

                  Import Words

                </button>

                <button

                  onClick={() => setShowBulkImport(false)}

                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"

                >

                  Cancel

                </button>

              </div>

            </div>

          </div>

        </div>

      )}



      {/* Add Word Form */}

      {showAddForm && (

        <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">

          <h3 className="text-lg font-semibold mb-4">Add New Word</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            <input

              type="text"

              placeholder="Word"

              value={newWord.word}

              onChange={(e) => setNewWord({ ...newWord, word: e.target.value })}

              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"

            />

            <select

              value={newWord.level}

              onChange={(e) => setNewWord({ ...newWord, level: parseInt(e.target.value) })}

              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"

            >

              {severityLevels.map(level => (

                <option key={level.value} value={level.value}>

                  Level {level.value} - {level.label}

                </option>

              ))}

            </select>

            <input

              type="text"

              placeholder="Category"

              value={newWord.category}

              onChange={(e) => setNewWord({ ...newWord, category: e.target.value })}

              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"

            />

          </div>

          <div className="mt-4 flex space-x-3">

            <button

              onClick={addWord}

              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"

            >

              Add Word

            </button>

            <button

              onClick={() => setShowAddForm(false)}

              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"

            >

              Cancel

            </button>

          </div>

        </div>

      )}



      {/* Filters */}

      <div className="mb-6 flex flex-wrap gap-4">

        <input

          type="text"

          placeholder="Search words..."

          value={searchTerm}

          onChange={(e) => setSearchTerm(e.target.value)}

          className="flex-1 min-w-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"

        />

        <select

          value={selectedCategory}

          onChange={(e) => setSelectedCategory(e.target.value)}

          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"

        >

          <option value="all">All Categories</option>

          {categories.map(category => (

            <option key={category.name} value={category.name}>

              {category.name} ({category.count})

            </option>

          ))}

        </select>

        <select

          value={selectedLevel}

          onChange={(e) => setSelectedLevel(e.target.value)}

          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"

        >

          <option value="all">All Levels</option>

          {severityLevels.map(level => (

            <option key={level.value} value={level.value.toString()}>

              Level {level.value} - {level.label}

            </option>

          ))}

        </select>

      </div>



      {/* Bulk Actions */}

      {selectedWords.size > 0 && (

        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">

          <div className="flex items-center justify-between">

            <span className="text-sm text-blue-700">

              {selectedWords.size} word(s) selected

            </span>

            <div className="flex space-x-2">

              <button

                onClick={() => bulkUpdateSelected({ isActive: true })}

                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"

              >

                Activate

              </button>

              <button

                onClick={() => bulkUpdateSelected({ isActive: false })}

                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"

              >

                Deactivate

              </button>

              <button

                onClick={() => setSelectedWords(new Set())}

                className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors text-sm"

              >

                Clear Selection

              </button>

            </div>

          </div>

        </div>

      )}



      {/* Words Table */}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">

        <div className="overflow-x-auto">

          <table className="min-w-full divide-y divide-gray-200">

            <thead className="bg-gray-50">

              <tr>

                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">

                  <input

                    type="checkbox"

                    checked={selectedWords.size === filteredWords.length && filteredWords.length > 0}

                    onChange={(e) => {

                      if (e.target.checked) {

                        setSelectedWords(new Set(filteredWords.map(w => w.id)));

                      } else {

                        setSelectedWords(new Set());

                      }

                    }}

                    className="rounded border-gray-300 text-primary focus:ring-primary"

                  />

                </th>

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

                  Created

                </th>

                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">

                  Actions

                </th>

              </tr>

            </thead>

            <tbody className="bg-white divide-y divide-gray-200">

              {filteredWords.map(word => {

                const severity = getSeverityLabel(word.level);

                return (

                  <tr key={word.id} className="hover:bg-gray-50">

                    <td className="px-6 py-4 whitespace-nowrap">

                      <input

                        type="checkbox"

                        checked={selectedWords.has(word.id)}

                        onChange={(e) => {

                          const newSelected = new Set(selectedWords);

                          if (e.target.checked) {

                            newSelected.add(word.id);

                          } else {

                            newSelected.delete(word.id);

                          }

                          setSelectedWords(newSelected);

                        }}

                        className="rounded border-gray-300 text-primary focus:ring-primary"

                      />

                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">

                      <div className="text-sm font-medium text-gray-900">{word.word}</div>

                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">

                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${severity.color}`}>

                        {word.level} - {severity.label}

                      </span>

                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">

                      <div className="text-sm text-gray-900">{word.category}</div>

                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">

                      <button

                        onClick={() => updateWord(word.id, { isActive: !word.isActive })}

                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${

                          word.isActive 

                            ? 'bg-green-100 text-green-800 hover:bg-green-200' 

                            : 'bg-red-100 text-red-800 hover:bg-red-200'

                        } transition-colors`}

                      >

                        {word.isActive ? 'Active' : 'Inactive'}

                      </button>

                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">

                      {new Date(word.createdAt).toLocaleDateString()}

                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">

                      <div className="flex justify-end space-x-2">

                        <button

                          onClick={() => {

                            const newLevel = prompt('Enter new level (1-5):', word.level.toString());

                            if (newLevel && !isNaN(parseInt(newLevel))) {

                              const level = Math.max(1, Math.min(5, parseInt(newLevel)));

                              updateWord(word.id, { level });

                            }

                          }}

                          className="text-primary hover:text-blue-900"

                        >

                          <i className="fas fa-edit"></i>

                        </button>

                        <button

                          onClick={() => deleteWord(word.id)}

                          className="text-red-600 hover:text-red-900"

                        >

                          <i className="fas fa-trash"></i>

                        </button>

                      </div>

                    </td>

                  </tr>

                );

              })}

            </tbody>

          </table>

        </div>

        {filteredWords.length === 0 && (

          <div className="text-center py-12">

            <i className="fas fa-filter text-4xl text-gray-300 mb-4"></i>

            <h3 className="text-lg font-medium text-gray-900 mb-2">No words found</h3>

            <p className="text-gray-500">

              {searchTerm ? 'Try adjusting your search terms' : 'Add your first sensitive word to get started'}

            </p>

          </div>

        )}

      </div>

    </div>

  );

}
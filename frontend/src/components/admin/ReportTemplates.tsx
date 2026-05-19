'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  config: {
    metrics: string[];
    dimensions: string[];
    filters: any[];
    format: 'table' | 'chart' | 'summary';
    chartType?: 'line' | 'bar' | 'pie' | 'area';
  };
  isDefault: boolean;
  createdBy: string;
  createdAt: string;
  usageCount: number;
}

interface ReportTemplatesProps {
  templates: ReportTemplate[];
  categories: string[];
  onTemplateSelect: (template: ReportTemplate) => void;
  onTemplateCreate: (template: Omit<ReportTemplate, 'id' | 'createdAt' | 'usageCount'>) => Promise<void>;
  onTemplateDelete: (id: string) => Promise<void>;
  isLoading?: boolean;
}

export function ReportTemplates({
  templates,
  categories,
  onTemplateSelect,
  onTemplateCreate,
  onTemplateDelete,
  isLoading = false
}: ReportTemplatesProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filteredTemplates, setFilteredTemplates] = useState<ReportTemplate[]>(templates);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    config: {
      metrics: [] as string[],
      dimensions: [] as string[],
      filters: [] as any[],
      format: 'table' as 'table' | 'chart' | 'summary',
      chartType: undefined as 'line' | 'bar' | 'pie' | 'area' | undefined
    },
    isDefault: false,
    createdBy: ''
  });

  // Filter templates based on category and search term
  useEffect(() => {
    let filtered = templates;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(template => 
        template.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    if (searchTerm) {
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredTemplates(filtered);
  }, [templates, selectedCategory, searchTerm]);

  // Handle template selection
  const handleTemplateSelect = useCallback((template: ReportTemplate) => {
    onTemplateSelect(template);
  }, [onTemplateSelect]);

  // Handle template creation
  const handleCreateTemplate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.description || !formData.category) {
      return;
    }

    try {
      await onTemplateCreate(formData);
      setShowCreateForm(false);
      setFormData({
        name: '',
        description: '',
        category: '',
        config: {
          metrics: [],
          dimensions: [],
          filters: [],
          format: 'table',
          chartType: undefined
        },
        isDefault: false,
        createdBy: ''
      });
    } catch (error) {
      console.error('Error creating template:', error);
    }
  }, [formData, onTemplateCreate]);

  // Handle template deletion
  const handleDeleteTemplate = useCallback(async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete the template "${name}"?`)) {
      try {
        await onTemplateDelete(id);
      } catch (error) {
        console.error('Error deleting template:', error);
      }
    }
  }, [onTemplateDelete]);

  // Get category color
  const getCategoryColor = (category: string) => {
    const colors = {
      'User Analytics': 'bg-light text-primary-dark',
      'Event Analytics': 'bg-green-100 text-green-800',
      'Moderation': 'bg-yellow-100 text-yellow-800',
      'System': 'bg-purple-100 text-purple-800',
      'Financial': 'bg-red-100 text-red-800'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="report-templates">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Report Templates</h2>
          <p className="text-gray-600 mt-1">Pre-configured report templates for common use cases</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Create Template
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <svg
              className="absolute left-3 top-2.5 h-4 w-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Category Filter */}
        <div className="sm:w-48">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
          >
            <div className="p-6">
              {/* Template Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900 mb-1">{template.name}</h3>
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(template.category)}`}>
                    {template.category}
                  </span>
                </div>
                {!template.isDefault && (
                  <button
                    onClick={() => handleDeleteTemplate(template.id, template.name)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete template"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Template Description */}
              <p className="text-gray-600 text-sm mb-4 line-clamp-3">{template.description}</p>

              {/* Template Stats */}
              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <div className="flex items-center space-x-4">
                  <span>{template.config.metrics.length} metrics</span>
                  <span>{template.config.dimensions.length} dimensions</span>
                </div>
                <div className="flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>{template.usageCount} uses</span>
                </div>
              </div>

              {/* Template Config Preview */}
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <div className="text-xs text-gray-600 space-y-1">
                  <div>
                    <span className="font-medium">Format:</span> {template.config.format}
                    {template.config.chartType && ` (${template.config.chartType})`}
                  </div>
                  <div>
                    <span className="font-medium">Metrics:</span> {template.config.metrics.slice(0, 2).join(', ')}
                    {template.config.metrics.length > 2 && ` +${template.config.metrics.length - 2} more`}
                  </div>
                </div>
              </div>

              {/* Use Template Button */}
              <button
                onClick={() => handleTemplateSelect(template)}
                className="w-full px-4 py-2 text-sm font-medium text-primary bg-blue-50 border border-blue-200 rounded-lg hover:bg-light transition-colors"
              >
                Use Template
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Templates Found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || selectedCategory !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'Create your first report template to get started'
            }
          </p>
          {!searchTerm && selectedCategory === 'all' && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 text-sm font-medium text-primary bg-blue-50 border border-blue-200 rounded-lg hover:bg-light transition-colors"
            >
              Create Template
            </button>
          )}
        </div>
      )}

      {/* Create Template Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Create Template</h3>
            </div>

            <form onSubmit={handleCreateTemplate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter template name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={3}
                  placeholder="Describe what this template is for"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                  <option value="Custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Format
                </label>
                <select
                  value={formData.config.format}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    config: {
                      ...prev.config,
                      format: e.target.value as any
                    }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="table">Table</option>
                  <option value="chart">Chart</option>
                  <option value="summary">Summary</option>
                </select>
              </div>

              {formData.config.format === 'chart' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chart Type
                  </label>
                  <select
                    value={formData.config.chartType || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      config: {
                        ...prev.config,
                        chartType: e.target.value as any
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select chart type</option>
                    <option value="line">Line Chart</option>
                    <option value="bar">Bar Chart</option>
                    <option value="pie">Pie Chart</option>
                    <option value="area">Area Chart</option>
                  </select>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Creating...' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
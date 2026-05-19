'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { QuickAction } from '../dashboard/QuickActionsPanel';

interface QuickActionsSettingsProps {
  userId: string;
  className?: string;
}

interface CustomAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  url: string;
  category: 'navigation' | 'content' | 'social' | 'settings' | 'search';
  shortcut?: string;
  voiceCommand?: string;
  enabled: boolean;
}

export default function QuickActionsSettings({ userId, className = "" }: QuickActionsSettingsProps) {
  const router = useRouter();
  const [customActions, setCustomActions] = useState<CustomAction[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAction, setEditingAction] = useState<CustomAction | null>(null);
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    icon: string;
    url: string;
    category: 'navigation' | 'content' | 'social' | 'settings' | 'search';
    shortcut: string;
    voiceCommand: string;
  }>({
    title: '',
    description: '',
    icon: 'fas fa-link',
    url: '',
    category: 'navigation',
    shortcut: '',
    voiceCommand: ''
  });

  useEffect(() => {
    loadCustomActions();
  }, [userId]);

  const loadCustomActions = () => {
    try {
      const saved = localStorage.getItem(`customQuickActions_${userId}`);
      if (saved) {
        setCustomActions(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading custom actions:', error);
    }
  };

  const saveCustomActions = (actions: CustomAction[]) => {
    try {
      localStorage.setItem(`customQuickActions_${userId}`, JSON.stringify(actions));
      setCustomActions(actions);
    } catch (error) {
      console.error('Error saving custom actions:', error);
    }
  };

  const handleAddAction = () => {
    if (!formData.title || !formData.url) return;

    const newAction: CustomAction = {
      id: `custom-${Date.now()}`,
      title: formData.title,
      description: formData.description,
      icon: formData.icon,
      url: formData.url,
      category: formData.category,
      shortcut: formData.shortcut || undefined,
      voiceCommand: formData.voiceCommand || undefined,
      enabled: true
    };

    const updatedActions = [...customActions, newAction];
    saveCustomActions(updatedActions);
    resetForm();
  };

  const handleEditAction = (action: CustomAction) => {
    setEditingAction(action);
    setFormData({
      title: action.title,
      description: action.description,
      icon: action.icon,
      url: action.url,
      category: action.category,
      shortcut: action.shortcut || '',
      voiceCommand: action.voiceCommand || ''
    });
    setShowAddForm(true);
  };

  const handleUpdateAction = () => {
    if (!editingAction || !formData.title || !formData.url) return;

    const updatedAction: CustomAction = {
      ...editingAction,
      title: formData.title,
      description: formData.description,
      icon: formData.icon,
      url: formData.url,
      category: formData.category,
      shortcut: formData.shortcut || undefined,
      voiceCommand: formData.voiceCommand || undefined
    };

    const updatedActions = customActions.map(action => 
      action.id === editingAction.id ? updatedAction : action
    );
    saveCustomActions(updatedActions);
    resetForm();
  };

  const handleDeleteAction = (actionId: string) => {
    const updatedActions = customActions.filter(action => action.id !== actionId);
    saveCustomActions(updatedActions);
  };

  const toggleActionEnabled = (actionId: string) => {
    const updatedActions = customActions.map(action => 
      action.id === actionId ? { ...action, enabled: !action.enabled } : action
    );
    saveCustomActions(updatedActions);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      icon: 'fas fa-link',
      url: '',
      category: 'navigation',
      shortcut: '',
      voiceCommand: ''
    });
    setShowAddForm(false);
    setEditingAction(null);
  };

  const categoryOptions = [
    { value: 'navigation', label: 'Navigation', icon: 'fas fa-compass' },
    { value: 'content', label: 'Content', icon: 'fas fa-file-alt' },
    { value: 'social', label: 'Social', icon: 'fas fa-users' },
    { value: 'search', label: 'Search', icon: 'fas fa-search' },
    { value: 'settings', label: 'Settings', icon: 'fas fa-cog' }
  ];

  const iconOptions = [
    'fas fa-link', 'fas fa-external-link-alt', 'fas fa-bookmark', 'fas fa-star',
    'fas fa-heart', 'fas fa-thumbs-up', 'fas fa-share', 'fas fa-download',
    'fas fa-upload', 'fas fa-file', 'fas fa-folder', 'fas fa-image',
    'fas fa-video', 'fas fa-music', 'fas fa-calendar', 'fas fa-clock',
    'fas fa-bell', 'fas fa-envelope', 'fas fa-phone', 'fas fa-map-marker-alt',
    'fas fa-home', 'fas fa-building', 'fas fa-car', 'fas fa-plane',
    'fas fa-shopping-cart', 'fas fa-credit-card', 'fas fa-chart-bar', 'fas fa-chart-line'
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Quick Actions</h2>
          <p className="text-sm text-gray-600 mt-1">
            Customize your quick actions panel with personalized shortcuts
          </p>
        </div>
        
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          <i className="fas fa-plus"></i>
          <span>Add Action</span>
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">
            {editingAction ? 'Edit Action' : 'Add New Action'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., My Dashboard"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL *
              </label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="e.g., /my-dashboard or https://example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of what this action does"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {categoryOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Icon
              </label>
              <select
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {iconOptions.map(icon => (
                  <option key={icon} value={icon}>
                    {icon.replace('fas fa-', '').replace('-', ' ')}
                  </option>
                ))}
              </select>
              <div className="mt-2 flex items-center space-x-2 text-sm text-gray-600">
                <i className={formData.icon}></i>
                <span>Preview</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Keyboard Shortcut (Optional)
              </label>
              <input
                type="text"
                value={formData.shortcut}
                onChange={(e) => setFormData({ ...formData, shortcut: e.target.value })}
                placeholder="e.g., Ctrl+Shift+D"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Voice Command (Optional)
              </label>
              <input
                type="text"
                value={formData.voiceCommand}
                onChange={(e) => setFormData({ ...formData, voiceCommand: e.target.value })}
                placeholder="e.g., open my dashboard"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex items-center justify-end space-x-3 mt-6">
            <button
              onClick={resetForm}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={editingAction ? handleUpdateAction : handleAddAction}
              disabled={!formData.title || !formData.url}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {editingAction ? 'Update Action' : 'Add Action'}
            </button>
          </div>
        </div>
      )}

      {/* Custom Actions List */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-800">
          Your Custom Actions ({customActions.length})
        </h3>
        
        {customActions.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <i className="fas fa-plus-circle text-4xl text-gray-300 mb-4"></i>
            <p className="text-gray-500 mb-2">No custom actions yet</p>
            <p className="text-sm text-gray-400">
              Add your first custom action to get started
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customActions.map(action => (
              <div
                key={action.id}
                className={`border rounded-lg p-4 transition-all ${
                  action.enabled 
                    ? 'border-gray-200 bg-white' 
                    : 'border-gray-100 bg-gray-50 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <i className={`${action.icon} text-lg text-primary`}></i>
                    <div>
                      <h4 className="font-medium text-gray-800">{action.title}</h4>
                      <p className="text-sm text-gray-600">{action.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => toggleActionEnabled(action.id)}
                      className={`p-1 rounded transition-colors ${
                        action.enabled 
                          ? 'text-green-600 hover:text-green-800' 
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                      title={action.enabled ? 'Disable' : 'Enable'}
                    >
                      <i className={`fas ${action.enabled ? 'fa-toggle-on' : 'fa-toggle-off'}`}></i>
                    </button>
                    <button
                      onClick={() => handleEditAction(action)}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Edit"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    <button
                      onClick={() => handleDeleteAction(action.id)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2 text-xs text-gray-500">
                  <div className="flex items-center space-x-2">
                    <i className="fas fa-link"></i>
                    <span className="truncate">{action.url}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <i className="fas fa-tag"></i>
                    <span>{categoryOptions.find(c => c.value === action.category)?.label}</span>
                  </div>
                  
                  {action.shortcut && (
                    <div className="flex items-center space-x-2">
                      <i className="fas fa-keyboard"></i>
                      <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">
                        {action.shortcut}
                      </kbd>
                    </div>
                  )}
                  
                  {action.voiceCommand && (
                    <div className="flex items-center space-x-2">
                      <i className="fas fa-microphone"></i>
                      <span>"{action.voiceCommand}"</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="flex items-center text-lg font-medium text-primary-dark mb-3">
          <i className="fas fa-info-circle mr-2"></i>
          Tips for Custom Actions
        </h3>
        <div className="space-y-2 text-sm text-blue-700">
          <p>�?Use relative URLs (e.g., /dashboard) for internal pages</p>
          <p>�?Use full URLs (e.g., https://example.com) for external sites</p>
          <p>�?Choose descriptive titles and icons for easy recognition</p>
          <p>�?Keyboard shortcuts should follow the format: Ctrl+Key or Ctrl+Shift+Key</p>
          <p>�?Voice commands work best with simple, clear phrases</p>
          <p>�?Organize actions by category for better dashboard layout</p>
        </div>
      </div>
    </div>
  );
}
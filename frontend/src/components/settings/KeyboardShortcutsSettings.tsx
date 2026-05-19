'use client';

import { useState, useEffect } from 'react';
import { useKeyboardShortcuts } from '../../services/keyboardShortcutsService';
import type { ShortcutCategory, KeyboardShortcut } from '../../services/keyboardShortcutsService';

interface KeyboardShortcutsSettingsProps {
  className?: string;
}

export default function KeyboardShortcutsSettings({ className = "" }: KeyboardShortcutsSettingsProps) {
  const { getShortcuts, setEnabled, service } = useKeyboardShortcuts();
  const [categories, setCategories] = useState<ShortcutCategory[]>([]);
  const [shortcutsEnabled, setShortcutsEnabled] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadShortcuts();
    setShortcutsEnabled(service.isEnabled());
  }, []);

  const loadShortcuts = () => {
    const shortcutCategories = getShortcuts();
    setCategories(shortcutCategories);
  };

  const toggleShortcuts = (enabled: boolean) => {
    setEnabled(enabled);
    setShortcutsEnabled(enabled);
  };

  const filteredCategories = categories.map(category => ({
    ...category,
    shortcuts: category.shortcuts.filter(shortcut => {
      const matchesSearch = searchTerm === '' || 
        shortcut.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shortcut.key.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || category.id === selectedCategory;
      
      return matchesSearch && matchesCategory;
    })
  })).filter(category => category.shortcuts.length > 0);

  const allCategories = [
    { id: 'all', name: 'All Categories', icon: 'fas fa-th' },
    ...categories.map(cat => ({ id: cat.id, name: cat.name, icon: cat.icon }))
  ];

  const getShortcutDisplay = (shortcut: KeyboardShortcut): string => {
    return service.getShortcutDisplay(shortcut);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Keyboard Shortcuts</h2>
          <p className="text-sm text-gray-600 mt-1">
            Customize keyboard shortcuts to navigate the platform more efficiently
          </p>
        </div>
        
        {/* Global Toggle */}
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-600">Enable shortcuts</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={shortcutsEnabled}
              onChange={(e) => toggleShortcuts(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
            <input
              type="text"
              placeholder="Search shortcuts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="sm:w-48">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            {allCategories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Shortcuts List */}
      {!shortcutsEnabled && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <i className="fas fa-exclamation-triangle text-yellow-600 mr-2"></i>
            <span className="text-yellow-800 text-sm">
              Keyboard shortcuts are currently disabled. Enable them to use these shortcuts.
            </span>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {filteredCategories.length === 0 ? (
          <div className="text-center py-8">
            <i className="fas fa-search text-4xl text-gray-300 mb-4"></i>
            <p className="text-gray-500">No shortcuts found matching your search.</p>
          </div>
        ) : (
          filteredCategories.map(category => (
            <div key={category.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h3 className="flex items-center text-lg font-medium text-gray-800">
                  <i className={`${category.icon} mr-3 text-primary`}></i>
                  {category.name}
                  <span className="ml-2 text-sm text-gray-500">
                    ({category.shortcuts.length} shortcut{category.shortcuts.length !== 1 ? 's' : ''})
                  </span>
                </h3>
              </div>
              
              <div className="divide-y divide-gray-200">
                {category.shortcuts.map(shortcut => (
                  <div key={shortcut.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-800 mb-1">
                          {shortcut.description}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {shortcut.id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        {shortcut.global && (
                          <span className="px-2 py-1 bg-light text-primary-dark text-xs rounded-full">
                            Global
                          </span>
                        )}
                        <kbd className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm font-mono">
                          {getShortcutDisplay(shortcut)}
                        </kbd>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="flex items-center text-lg font-medium text-primary-dark mb-3">
          <i className="fas fa-info-circle mr-2"></i>
          Tips for Using Keyboard Shortcuts
        </h3>
        <div className="space-y-2 text-sm text-blue-700">
          <p>�?Shortcuts work when you're not typing in input fields (unless marked as "Global")</p>
          <p>�?Press <kbd className="px-2 py-1 bg-light rounded text-xs">Ctrl + ?</kbd> to see all available shortcuts</p>
          <p>�?Global shortcuts work everywhere, including when typing in forms</p>
          <p>�?On Mac, Ctrl is replaced with �?(Command key)</p>
          <p>�?You can disable shortcuts temporarily if they conflict with other applications</p>
        </div>
      </div>

      {/* Quick Test Section */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="flex items-center text-lg font-medium text-gray-800 mb-3">
          <i className="fas fa-keyboard mr-2"></i>
          Test Shortcuts
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Try pressing some shortcuts to see them in action:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {categories.slice(0, 1).map(category => 
            category.shortcuts.slice(0, 6).map(shortcut => (
              <div key={shortcut.id} className="flex items-center justify-between p-3 bg-white rounded border">
                <span className="text-sm text-gray-700">{shortcut.description}</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">
                  {getShortcutDisplay(shortcut)}
                </kbd>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
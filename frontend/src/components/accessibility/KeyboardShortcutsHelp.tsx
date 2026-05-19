/**
 * Keyboard Shortcuts Help Component
 * Displays available keyboard shortcuts and accessibility features
 */

'use client';

import React, { useState, useEffect } from 'react';
import { AccessibleModal } from '@/components/AccessibilityProvider';
import { useAccessibility } from '@/hooks/useAccessibility';

interface KeyboardShortcut {
  key: string;
  modifiers: string[];
  description: string;
  category: string;
}

const shortcuts: KeyboardShortcut[] = [
  // Navigation shortcuts
  {
    key: 'h',
    modifiers: ['Alt'],
    description: 'Go to home page',
    category: 'Navigation'
  },
  {
    key: 'd',
    modifiers: ['Alt'],
    description: 'Go to dashboard',
    category: 'Navigation'
  },
  {
    key: 's',
    modifiers: ['Alt'],
    description: 'Focus search input',
    category: 'Navigation'
  },
  {
    key: 'n',
    modifiers: ['Alt'],
    description: 'Open notifications',
    category: 'Navigation'
  },
  {
    key: 'm',
    modifiers: ['Alt'],
    description: 'Open main menu',
    category: 'Navigation'
  },
  
  // General shortcuts
  {
    key: '/',
    modifiers: [],
    description: 'Show this help dialog',
    category: 'General'
  },
  {
    key: 'Escape',
    modifiers: [],
    description: 'Close modal or dialog',
    category: 'General'
  },
  {
    key: 'Tab',
    modifiers: [],
    description: 'Navigate to next element',
    category: 'General'
  },
  {
    key: 'Tab',
    modifiers: ['Shift'],
    description: 'Navigate to previous element',
    category: 'General'
  },
  {
    key: 'Enter',
    modifiers: [],
    description: 'Activate button or link',
    category: 'General'
  },
  {
    key: 'Space',
    modifiers: [],
    description: 'Activate button or checkbox',
    category: 'General'
  },
  
  // Accessibility shortcuts
  {
    key: 'c',
    modifiers: ['Alt', 'Shift'],
    description: 'Toggle high contrast mode',
    category: 'Accessibility'
  },
  {
    key: 'r',
    modifiers: ['Alt', 'Shift'],
    description: 'Toggle reduced motion',
    category: 'Accessibility'
  },
  {
    key: 't',
    modifiers: ['Alt', 'Shift'],
    description: 'Toggle large text mode',
    category: 'Accessibility'
  },
];

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
  const { settings, announceToScreenReader } = useAccessibility();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', ...Array.from(new Set(shortcuts.map(s => s.category)))];

  const filteredShortcuts = shortcuts.filter(shortcut => {
    const matchesSearch = shortcut.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         shortcut.key.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || shortcut.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const formatShortcut = (shortcut: KeyboardShortcut): string => {
    const modifierSymbols = {
      'Alt': '⌥',
      'Ctrl': '⌃',
      'Shift': '⇧',
      'Meta': '⌘'
    };

    const parts = [
      ...shortcut.modifiers.map(mod => modifierSymbols[mod as keyof typeof modifierSymbols] || mod),
      shortcut.key === ' ' ? 'Space' : shortcut.key
    ];

    return parts.join(' + ');
  };

  useEffect(() => {
    if (isOpen) {
      announceToScreenReader({
        message: 'Keyboard shortcuts help dialog opened. Use arrow keys to navigate shortcuts.',
        priority: 'medium',
        type: 'status'
      });
    }
  }, [isOpen, announceToScreenReader]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    announceToScreenReader({
      message: `Filtered to ${category} shortcuts. ${filteredShortcuts.length} shortcuts available.`,
      priority: 'low',
      type: 'status'
    });
  };

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={onClose}
      title="Keyboard Shortcuts"
      className="max-w-4xl w-full max-h-[80vh] overflow-y-auto"
    >
      <div className="space-y-6">
        {/* Introduction */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <i className="fas fa-info-circle text-primary mt-1 mr-3" aria-hidden="true"></i>
            <div>
              <h3 className="text-sm font-medium text-blue-900 mb-1">
                Keyboard Navigation Tips
              </h3>
              <p className="text-sm text-primary-dark">
                Use Tab to navigate between elements, Enter or Space to activate buttons, 
                and Escape to close dialogs. All interactive elements are keyboard accessible.
              </p>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="shortcut-search" className="block text-sm font-medium text-gray-700 mb-2">
              Search shortcuts
            </label>
            <input
              id="shortcut-search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by key or description..."
              className="form-input"
            />
          </div>
          
          <div className="sm:w-48">
            <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              id="category-filter"
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="form-input"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Shortcuts List */}
        <div className="space-y-6">
          {categories.filter(cat => cat !== 'All').map(category => {
            const categoryShortcuts = filteredShortcuts.filter(s => s.category === category);
            
            if (categoryShortcuts.length === 0) return null;

            return (
              <div key={category} className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  {category}
                </h3>
                
                <div className="grid gap-3">
                  {categoryShortcuts.map((shortcut, index) => (
                    <div
                      key={`${category}-${index}`}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      tabIndex={0}
                      role="listitem"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {shortcut.description}
                        </p>
                      </div>
                      
                      <div className="ml-4">
                        <kbd className="inline-flex items-center px-3 py-1 bg-white border border-gray-300 rounded text-sm font-mono text-gray-700 shadow-sm">
                          {formatShortcut(shortcut)}
                        </kbd>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* No results */}
        {filteredShortcuts.length === 0 && (
          <div className="text-center py-8">
            <i className="fas fa-search text-gray-400 text-3xl mb-4" aria-hidden="true"></i>
            <p className="text-gray-600">
              No shortcuts found matching your search criteria.
            </p>
          </div>
        )}

        {/* Accessibility Features */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Current Accessibility Settings
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <div className={`w-3 h-3 rounded-full mr-3 ${settings.highContrast ? 'bg-green-500' : 'bg-gray-300'}`} aria-hidden="true"></div>
              <span className="text-sm text-gray-700">
                High Contrast: {settings.highContrast ? 'On' : 'Off'}
              </span>
            </div>
            
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <div className={`w-3 h-3 rounded-full mr-3 ${settings.reducedMotion ? 'bg-green-500' : 'bg-gray-300'}`} aria-hidden="true"></div>
              <span className="text-sm text-gray-700">
                Reduced Motion: {settings.reducedMotion ? 'On' : 'Off'}
              </span>
            </div>
            
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <div className={`w-3 h-3 rounded-full mr-3 ${settings.largeText ? 'bg-green-500' : 'bg-gray-300'}`} aria-hidden="true"></div>
              <span className="text-sm text-gray-700">
                Large Text: {settings.largeText ? 'On' : 'Off'}
              </span>
            </div>
            
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <div className={`w-3 h-3 rounded-full mr-3 ${settings.keyboardNavigation ? 'bg-green-500' : 'bg-gray-300'}`} aria-hidden="true"></div>
              <span className="text-sm text-gray-700">
                Keyboard Navigation: {settings.keyboardNavigation ? 'On' : 'Off'}
              </span>
            </div>
            
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <div className={`w-3 h-3 rounded-full mr-3 ${settings.screenReader ? 'bg-green-500' : 'bg-gray-300'}`} aria-hidden="true"></div>
              <span className="text-sm text-gray-700">
                Screen Reader Mode: {settings.screenReader ? 'On' : 'Off'}
              </span>
            </div>
            
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <div className={`w-3 h-3 rounded-full mr-3 ${settings.announcements ? 'bg-green-500' : 'bg-gray-300'}`} aria-hidden="true"></div>
              <span className="text-sm text-gray-700">
                Live Announcements: {settings.announcements ? 'On' : 'Off'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-600">
              Press <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">Escape</kbd> to close this dialog
            </p>
            
            <button
              onClick={onClose}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Close Help
            </button>
          </div>
        </div>
      </div>
    </AccessibleModal>
  );
}

/**
 * Hook to manage keyboard shortcuts help
 */
export function useKeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Show help on '/' key
      if (event.key === '/' && !event.ctrlKey && !event.altKey && !event.metaKey) {
        // Only if not in an input field
        const activeElement = document.activeElement;
        const isInInput = activeElement?.tagName === 'INPUT' || 
                         activeElement?.tagName === 'TEXTAREA' || 
                         activeElement?.getAttribute('contenteditable') === 'true';
        
        if (!isInInput) {
          event.preventDefault();
          setIsOpen(true);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  };
}

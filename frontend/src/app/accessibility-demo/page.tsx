/**
 * Accessibility Demo Page
 * Demonstrates enhanced accessibility features and provides comprehensive testing interface
 */

'use client';

import React, { useState, useRef } from 'react';
import AccessibilitySettings from '@/components/settings/AccessibilitySettings';
import KeyboardShortcutsHelp, { useKeyboardShortcutsHelp } from '@/components/accessibility/KeyboardShortcutsHelp';
import DynamicContentAccessibility, { LiveRegion, FocusManager, AccessibleStatus } from '@/components/accessibility/DynamicContentAccessibility';
import EnhancedKeyboardNavigation, { KeyboardShortcutDisplay, NavigationBreadcrumbs } from '@/components/accessibility/EnhancedKeyboardNavigation';
import { useAccessibility } from '@/hooks/useAccessibility';
export default function AccessibilityDemoPage() {
  const { settings, announceToScreenReader } = useAccessibility();
  const keyboardHelp = useKeyboardShortcutsHelp();
  const [demoContent, setDemoContent] = useState('Initial content');
  const [showModal, setShowModal] = useState(false);
  const [listItems, setListItems] = useState(['Item 1', 'Item 2', 'Item 3']);
  const [currentStatus, setCurrentStatus] = useState<'loading' | 'success' | 'error' | 'warning' | 'info'>('info');
  const [statusMessage, setStatusMessage] = useState('Ready for testing');
  const widgetRef = useRef<HTMLDivElement>(null);

  const testAnnouncement = () => {
    announceToScreenReader({
      message: 'This is a test announcement to verify screen reader functionality is working correctly.',
      priority: 'medium',
      type: 'status'
    });
  };

  const updateDemoContent = () => {
    const newContent = `Updated content at ${new Date().toLocaleTimeString()}`;
    setDemoContent(newContent);
    announceToScreenReader({
      message: 'Demo content has been updated',
      priority: 'medium',
      type: 'content'
    });
  };

  const addListItem = () => {
    const newItem = `Item ${listItems.length + 1}`;
    setListItems([...listItems, newItem]);
    setCurrentStatus('success');
    setStatusMessage(`Added ${newItem}`);
  };

  const removeListItem = () => {
    if (listItems.length > 0) {
      const removedItem = listItems[listItems.length - 1];
      setListItems(listItems.slice(0, -1));
      setCurrentStatus('warning');
      setStatusMessage(`Removed ${removedItem}`);
    }
  };

  const testWidgetAccessibility = () => {
    if (widgetRef.current && typeof window !== 'undefined') {
      // Dynamic import to avoid SSR issues
      import('@/services/accessibilityService').then(({ accessibilityService }) => {
        accessibilityService.setupWidgetAccessibility(widgetRef.current!, 'Demo Widget');
        setCurrentStatus('success');
        setStatusMessage('Widget accessibility features enabled');
      });
    }
  };

  const simulateError = () => {
    setCurrentStatus('error');
    setStatusMessage('This is a simulated error message');
    announceToScreenReader({
      message: 'Error: This is a simulated error for testing purposes',
      priority: 'high',
      type: 'alert'
    });
  };

  const simulateLoading = () => {
    setCurrentStatus('loading');
    setStatusMessage('Loading data...');
    
    setTimeout(() => {
      setCurrentStatus('success');
      setStatusMessage('Data loaded successfully');
    }, 3000);
  };

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Accessibility Demo', current: true }
  ];

  const keyboardShortcuts = [
    { shortcut: 'Alt + H', description: 'Go to home page' },
    { shortcut: 'Alt + D', description: 'Go to dashboard' },
    { shortcut: 'Alt + S', description: 'Focus search' },
    { shortcut: 'Alt + Shift + C', description: 'Toggle high contrast' },
    { shortcut: '/', description: 'Show keyboard help' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Skip Links */}
        <div className="sr-only-focusable">
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <a href="#accessibility-settings" className="skip-link">
            Skip to accessibility settings
          </a>
        </div>

        {/* Breadcrumb Navigation */}
        <NavigationBreadcrumbs items={breadcrumbItems} className="mb-6" />

        {/* Page Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Enhanced Accessibility Features Demo
          </h1>
          <p className="text-lg text-gray-600">
            Comprehensive testing interface for dashboard accessibility features including dynamic content, keyboard navigation, and screen reader support.
          </p>
        </header>

        <main id="main-content">
          {/* Status Display */}
          <div className="mb-8">
            <AccessibleStatus 
              status={currentStatus}
              message={statusMessage}
              className="mb-4"
            />
          </div>

          {/* Quick Actions */}
          <section className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Accessibility Tests
            </h2>
            
            <EnhancedKeyboardNavigation 
              navigationMode="grid" 
              orientation="both"
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
              <button
                onClick={testAnnouncement}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                <i className="fas fa-volume-up mr-2" aria-hidden="true"></i>
                Test Screen Reader
              </button>
              
              <button
                onClick={keyboardHelp.open}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                <i className="fas fa-keyboard mr-2" aria-hidden="true"></i>
                Keyboard Shortcuts
              </button>
              
              <button
                onClick={updateDemoContent}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                <i className="fas fa-sync mr-2" aria-hidden="true"></i>
                Update Content
              </button>
              
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                <i className="fas fa-window-maximize mr-2" aria-hidden="true"></i>
                Test Modal
              </button>

              <button
                onClick={testWidgetAccessibility}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                <i className="fas fa-cog mr-2" aria-hidden="true"></i>
                Setup Widget A11y
              </button>

              <button
                onClick={simulateError}
                className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <i className="fas fa-exclamation-triangle mr-2" aria-hidden="true"></i>
                Simulate Error
              </button>

              <button
                onClick={simulateLoading}
                className="inline-flex items-center px-4 py-2 border border-yellow-300 text-sm font-medium rounded-md text-yellow-700 bg-white hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                <i className="fas fa-spinner mr-2" aria-hidden="true"></i>
                Simulate Loading
              </button>

              <button
                onClick={addListItem}
                className="inline-flex items-center px-4 py-2 border border-green-300 text-sm font-medium rounded-md text-green-700 bg-white hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <i className="fas fa-plus mr-2" aria-hidden="true"></i>
                Add List Item
              </button>
            </EnhancedKeyboardNavigation>
          </section>

          {/* Current Settings Display */}
          <section className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Current Accessibility Status
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <div className={`w-3 h-3 rounded-full mr-3 ${settings.highContrast ? 'bg-green-500' : 'bg-gray-300'}`} aria-hidden="true"></div>
                <span className="text-sm">High Contrast: {settings.highContrast ? 'Enabled' : 'Disabled'}</span>
              </div>
              
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <div className={`w-3 h-3 rounded-full mr-3 ${settings.reducedMotion ? 'bg-green-500' : 'bg-gray-300'}`} aria-hidden="true"></div>
                <span className="text-sm">Reduced Motion: {settings.reducedMotion ? 'Enabled' : 'Disabled'}</span>
              </div>
              
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <div className={`w-3 h-3 rounded-full mr-3 ${settings.largeText ? 'bg-green-500' : 'bg-gray-300'}`} aria-hidden="true"></div>
                <span className="text-sm">Large Text: {settings.largeText ? 'Enabled' : 'Disabled'}</span>
              </div>
              
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <div className={`w-3 h-3 rounded-full mr-3 ${settings.keyboardNavigation ? 'bg-green-500' : 'bg-gray-300'}`} aria-hidden="true"></div>
                <span className="text-sm">Keyboard Navigation: {settings.keyboardNavigation ? 'Enabled' : 'Disabled'}</span>
              </div>
              
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <div className={`w-3 h-3 rounded-full mr-3 ${settings.screenReader ? 'bg-green-500' : 'bg-gray-300'}`} aria-hidden="true"></div>
                <span className="text-sm">Screen Reader Mode: {settings.screenReader ? 'Enabled' : 'Disabled'}</span>
              </div>
              
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <div className={`w-3 h-3 rounded-full mr-3 ${settings.announcements ? 'bg-green-500' : 'bg-gray-300'}`} aria-hidden="true"></div>
                <span className="text-sm">Live Announcements: {settings.announcements ? 'Enabled' : 'Disabled'}</span>
              </div>
            </div>
          </section>

          {/* Dynamic Content Demo */}
          <section className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Dynamic Content Test
            </h2>
            
            <DynamicContentAccessibility
              contentType="widget"
              label="Dynamic Content Demo Widget"
              announceChanges={true}
              liveRegion="polite"
              className="mb-4"
            >
              <div 
                ref={widgetRef}
                className="p-4 bg-blue-50 border border-blue-200 rounded-lg"
              >
                <p className="text-primary-dark">{demoContent}</p>
              </div>
            </DynamicContentAccessibility>
            
            <p className="text-sm text-gray-600">
              This content updates dynamically and changes are announced to screen readers.
            </p>
          </section>

          {/* Dynamic List Demo */}
          <section className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Dynamic List Test
            </h2>
            
            <div className="flex gap-4 mb-4">
              <button
                onClick={addListItem}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Add Item
              </button>
              <button
                onClick={removeListItem}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                disabled={listItems.length === 0}
              >
                Remove Item
              </button>
            </div>

            <DynamicContentAccessibility
              contentType="list"
              label="Dynamic List Demo"
              announceChanges={true}
              liveRegion="polite"
            >
              <EnhancedKeyboardNavigation navigationMode="list" orientation="vertical">
                <ul className="space-y-2">
                  {listItems.map((item, index) => (
                    <li 
                      key={index}
                      className="p-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      tabIndex={0}
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </EnhancedKeyboardNavigation>
            </DynamicContentAccessibility>
          </section>

          {/* Keyboard Shortcuts Reference */}
          <section className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Available Keyboard Shortcuts
            </h2>
            <div className="space-y-2">
              {keyboardShortcuts.map((shortcut, index) => (
                <KeyboardShortcutDisplay
                  key={index}
                  shortcut={shortcut.shortcut}
                  description={shortcut.description}
                  className="p-2 hover:bg-gray-50 rounded"
                />
              ))}
            </div>
          </section>

          {/* Accessibility Settings */}
          <section id="accessibility-settings">
            <AccessibilitySettings />
          </section>
        </main>

        {/* Live Region for Announcements */}
        <LiveRegion message="" className="sr-only" />

        {/* Keyboard Shortcuts Help */}
        <KeyboardShortcutsHelp 
          isOpen={keyboardHelp.isOpen} 
          onClose={keyboardHelp.close} 
        />

        {/* Test Modal with Focus Management */}
        {showModal && (
          <FocusManager trapFocus={true} restoreFocus={true} initialFocus="button">
            <div className="modal-overlay" onClick={() => setShowModal(false)}>
              <div 
                className="modal-content max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
              >
                <h3 id="modal-title" className="text-lg font-semibold mb-4">
                  Accessibility Test Modal
                </h3>
                <p className="text-gray-600 mb-4">
                  This modal demonstrates focus management, keyboard navigation, and screen reader announcements.
                  Use Tab to navigate between buttons and Escape to close.
                </p>
                <div className="flex gap-4">
                  <button
                    className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    First Button
                  </button>
                  <button
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Second Button
                  </button>
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    Close Modal
                  </button>
                </div>
              </div>
            </div>
          </FocusManager>
        )}
      </div>
    </div>
  );
}
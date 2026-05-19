'use client';

import { useState } from 'react';
import PersonalizationSettingsManager from '@/components/settings/PersonalizationSettingsManager';
import PersonalizationSettingsTest from '@/components/settings/PersonalizationSettingsTest';

export default function PersonalizationSettingsPage() {
  const [userId] = useState('demo-user-123');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        {/* Page Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Personalization Settings Management
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Comprehensive preference management system with import/export functionality, 
            backup management, template application, and granular reset options.
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center mb-3">
              <i className="fas fa-exchange-alt text-primary text-xl mr-3"></i>
              <h3 className="font-semibold text-gray-900">Import/Export</h3>
            </div>
            <p className="text-sm text-gray-600">
              Save and restore your complete personalization settings with JSON file support
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center mb-3">
              <i className="fas fa-magic text-purple-600 text-xl mr-3"></i>
              <h3 className="font-semibold text-gray-900">Templates</h3>
            </div>
            <p className="text-sm text-gray-600">
              Apply predefined configurations optimized for different user types and needs
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center mb-3">
              <i className="fas fa-archive text-green-600 text-xl mr-3"></i>
              <h3 className="font-semibold text-gray-900">Backups</h3>
            </div>
            <p className="text-sm text-gray-600">
              Automatic and manual backups with easy restore functionality
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center mb-3">
              <i className="fas fa-undo text-orange-600 text-xl mr-3"></i>
              <h3 className="font-semibold text-gray-900">Reset Options</h3>
            </div>
            <p className="text-sm text-gray-600">
              Granular reset options for specific sections or complete restoration
            </p>
          </div>
        </div>

        {/* Test Component */}
        <PersonalizationSettingsTest userId={userId} />

        {/* Main Component */}
        <PersonalizationSettingsManager 
          userId={userId}
          className="bg-white rounded-lg shadow-sm"
        />

        {/* Implementation Notes */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-blue-900 mb-4">
            Implementation Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-primary-dark">
            <div>
              <h3 className="font-semibold mb-2">Core Functionality:</h3>
              <ul className="space-y-1">
                <li>�?Comprehensive settings overview with visual summary</li>
                <li>�?JSON-based import/export with data validation</li>
                <li>�?Predefined templates for different user types</li>
                <li>�?Automatic and manual backup management</li>
                <li>�?Granular reset options by section</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Advanced Features:</h3>
              <ul className="space-y-1">
                <li>�?Data integrity verification with checksums</li>
                <li>�?Version compatibility checking</li>
                <li>�?Automatic backup before major changes</li>
                <li>�?Template preview and category organization</li>
                <li>�?Confirmation dialogs for destructive actions</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Technical Implementation
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-700">
            <div>
              <h3 className="font-semibold mb-2">Service Layer:</h3>
              <ul className="space-y-1">
                <li>�?PersonalizationSettingsService</li>
                <li>�?Centralized settings management</li>
                <li>�?Integration with existing services</li>
                <li>�?Event-driven updates</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Data Management:</h3>
              <ul className="space-y-1">
                <li>�?TypeScript interfaces for type safety</li>
                <li>�?JSON schema validation</li>
                <li>�?Backup rotation and cleanup</li>
                <li>�?Cross-service synchronization</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">User Experience:</h3>
              <ul className="space-y-1">
                <li>�?Tabbed interface for organization</li>
                <li>�?Real-time feedback and validation</li>
                <li>�?Confirmation dialogs for safety</li>
                <li>�?Loading states and error handling</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
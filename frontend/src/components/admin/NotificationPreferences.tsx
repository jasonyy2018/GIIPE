'use client';

import { useState, useEffect } from 'react';

interface NotificationPreferences {
  userId: string;
  categories: {
    system: boolean;
    user: boolean;
    content: boolean;
    security: boolean;
    analytics: boolean;
    maintenance: boolean;
  };
  priorities: {
    low: boolean;
    medium: boolean;
    high: boolean;
    urgent: boolean;
  };
  deliveryMethods: {
    inApp: boolean;
    email: boolean;
    push: boolean;
  };
  quietHours?: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

interface NotificationPreferencesProps {
  preferences: NotificationPreferences;
  onSave: (preferences: Partial<NotificationPreferences>) => Promise<void>;
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationPreferences({
  preferences,
  onSave,
  isOpen,
  onClose
}: NotificationPreferencesProps) {
  const [localPreferences, setLocalPreferences] = useState<NotificationPreferences>(preferences);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalPreferences(preferences);
    setHasChanges(false);
  }, [preferences]);

  const handleCategoryChange = (category: keyof NotificationPreferences['categories'], value: boolean) => {
    setLocalPreferences(prev => ({
      ...prev,
      categories: {
        ...prev.categories,
        [category]: value
      }
    }));
    setHasChanges(true);
  };

  const handlePriorityChange = (priority: keyof NotificationPreferences['priorities'], value: boolean) => {
    setLocalPreferences(prev => ({
      ...prev,
      priorities: {
        ...prev.priorities,
        [priority]: value
      }
    }));
    setHasChanges(true);
  };

  const handleDeliveryMethodChange = (method: keyof NotificationPreferences['deliveryMethods'], value: boolean) => {
    setLocalPreferences(prev => ({
      ...prev,
      deliveryMethods: {
        ...prev.deliveryMethods,
        [method]: value
      }
    }));
    setHasChanges(true);
  };

  const handleQuietHoursChange = (field: keyof NonNullable<NotificationPreferences['quietHours']>, value: boolean | string) => {
    setLocalPreferences(prev => ({
      ...prev,
      quietHours: {
        ...prev.quietHours,
        [field]: value
      } as NotificationPreferences['quietHours']
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!hasChanges) return;

    setIsSaving(true);
    try {
      await onSave(localPreferences);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setLocalPreferences(preferences);
    setHasChanges(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Notification Preferences</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <i className="fas fa-times text-lg"></i>
            </button>
          </div>

          <div className="space-y-6">
            {/* Categories */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Notification Categories</h4>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(localPreferences.categories).map(([category, enabled]) => (
                  <label key={category} className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => handleCategoryChange(category as keyof NotificationPreferences['categories'], e.target.checked)}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700 capitalize">
                      {category.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Priorities */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Priority Levels</h4>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(localPreferences.priorities).map(([priority, enabled]) => (
                  <label key={priority} className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => handlePriorityChange(priority as keyof NotificationPreferences['priorities'], e.target.checked)}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <span className={`text-sm capitalize ${
                      priority === 'urgent' ? 'text-red-600 font-medium' :
                      priority === 'high' ? 'text-yellow-600 font-medium' :
                      priority === 'medium' ? 'text-primary' :
                      'text-gray-600'
                    }`}>
                      {priority}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Delivery Methods */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Delivery Methods</h4>
              <div className="space-y-3">
                {Object.entries(localPreferences.deliveryMethods).map(([method, enabled]) => (
                  <label key={method} className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => handleDeliveryMethodChange(method as keyof NotificationPreferences['deliveryMethods'], e.target.checked)}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">
                      {method === 'inApp' ? 'In-App Notifications' :
                       method === 'email' ? 'Email Notifications' :
                       'Push Notifications'}
                    </span>
                    {method !== 'inApp' && (
                      <span className="text-xs text-gray-500">(Coming soon)</span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Quiet Hours */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Quiet Hours</h4>
              <div className="space-y-3">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={localPreferences.quietHours?.enabled || false}
                    onChange={(e) => handleQuietHoursChange('enabled', e.target.checked)}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Enable quiet hours</span>
                </label>

                {localPreferences.quietHours?.enabled && (
                  <div className="ml-7 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Start time</label>
                      <input
                        type="time"
                        value={localPreferences.quietHours?.start || '22:00'}
                        onChange={(e) => handleQuietHoursChange('start', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">End time</label>
                      <input
                        type="time"
                        value={localPreferences.quietHours?.end || '08:00'}
                        onChange={(e) => handleQuietHoursChange('end', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                )}
                
                {localPreferences.quietHours?.enabled && (
                  <p className="ml-7 text-xs text-gray-500">
                    Only urgent notifications will be delivered during quiet hours
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={handleReset}
              disabled={!hasChanges}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Reset
            </button>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
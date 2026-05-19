'use client';

import { useState, useEffect } from 'react';
import { NotificationSettings as NotificationSettingsType } from '@/types/notification';
import { notificationService } from '@/services/notificationService';
import { pushNotificationService } from '@/services/pushNotificationService';

interface NotificationSettingsProps {
  userId: string;
  onSettingsChange?: (settings: NotificationSettingsType) => void;
  showAdvanced?: boolean;
}

export default function NotificationSettings({
  userId,
  onSettingsChange,
  showAdvanced = true
}: NotificationSettingsProps) {
  const [settings, setSettings] = useState<NotificationSettingsType>({
    email: true,
    push: false,
    sms: false,
    categories: {
      system: true,
      event: true,
      social: true,
      security: true
    },
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    frequency: 'immediate',
    scheduling: {
      enabled: false,
      workDays: [true, true, true, true, true, false, false],
      workHours: {
        start: '09:00',
        end: '17:00'
      }
    },
    digest: {
      enabled: false,
      time: '08:00',
      includeRead: false
    },
    autoArchive: {
      enabled: true,
      afterDays: 30
    }
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [testingPush, setTestingPush] = useState(false);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    checkPushSupport();
  }, [userId]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const userSettings = await notificationService.getNotificationSettings(userId);
      setSettings(userSettings);
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkPushSupport = async () => {
    try {
      const initialized = await pushNotificationService.initialize();
      setPushSupported(initialized);
      
      if (initialized) {
        const subscribed = await pushNotificationService.isSubscribed();
        setPushSubscribed(subscribed);
      }
    } catch (error) {
      console.error('Error checking push support:', error);
    }
  };

  const saveSettings = async (newSettings: NotificationSettingsType) => {
    setSaving(true);
    try {
      await notificationService.updateNotificationSettings(userId, newSettings);
      setSettings(newSettings);
      
      if (onSettingsChange) {
        onSettingsChange(newSettings);
      }
    } catch (error) {
      console.error('Error saving notification settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (key: keyof NotificationSettingsType, value: any) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
  };

  const handleCategoryToggle = (category: keyof NotificationSettingsType['categories'], value: boolean) => {
    const newSettings = {
      ...settings,
      categories: {
        ...settings.categories,
        [category]: value
      }
    };
    saveSettings(newSettings);
  };

  const handleQuietHoursToggle = (enabled: boolean) => {
    const newSettings = {
      ...settings,
      quietHours: {
        ...settings.quietHours,
        enabled
      }
    };
    saveSettings(newSettings);
  };

  const handleQuietHoursTime = (field: 'start' | 'end', value: string) => {
    const newSettings = {
      ...settings,
      quietHours: {
        ...settings.quietHours,
        [field]: value
      }
    };
    saveSettings(newSettings);
  };

  const handleSchedulingToggle = (enabled: boolean) => {
    const newSettings = {
      ...settings,
      scheduling: {
        ...settings.scheduling,
        enabled
      }
    };
    saveSettings(newSettings);
  };

  const handleWorkDayToggle = (dayIndex: number, enabled: boolean) => {
    const newWorkDays = [...settings.scheduling.workDays];
    newWorkDays[dayIndex] = enabled;
    const newSettings = {
      ...settings,
      scheduling: {
        ...settings.scheduling,
        workDays: newWorkDays
      }
    };
    saveSettings(newSettings);
  };

  const handleWorkHoursTime = (field: 'start' | 'end', value: string) => {
    const newSettings = {
      ...settings,
      scheduling: {
        ...settings.scheduling,
        workHours: {
          ...settings.scheduling.workHours,
          [field]: value
        }
      }
    };
    saveSettings(newSettings);
  };

  const handleDigestToggle = (enabled: boolean) => {
    const newSettings = {
      ...settings,
      digest: {
        ...settings.digest,
        enabled
      }
    };
    saveSettings(newSettings);
  };

  const handleDigestTime = (time: string) => {
    const newSettings = {
      ...settings,
      digest: {
        ...settings.digest,
        time
      }
    };
    saveSettings(newSettings);
  };

  const handleDigestIncludeRead = (includeRead: boolean) => {
    const newSettings = {
      ...settings,
      digest: {
        ...settings.digest,
        includeRead
      }
    };
    saveSettings(newSettings);
  };

  const handleAutoArchiveToggle = (enabled: boolean) => {
    const newSettings = {
      ...settings,
      autoArchive: {
        ...settings.autoArchive,
        enabled
      }
    };
    saveSettings(newSettings);
  };

  const handleAutoArchiveDays = (afterDays: number) => {
    const newSettings = {
      ...settings,
      autoArchive: {
        ...settings.autoArchive,
        afterDays
      }
    };
    saveSettings(newSettings);
  };

  const handlePushToggle = async (enabled: boolean) => {
    if (enabled) {
      try {
        const permission = await pushNotificationService.requestPermission();
        if (permission === 'granted') {
          const subscription = await pushNotificationService.subscribe(userId);
          if (subscription) {
            setPushSubscribed(true);
            handleToggle('push', true);
          }
        }
      } catch (error) {
        console.error('Error enabling push notifications:', error);
      }
    } else {
      try {
        await pushNotificationService.unsubscribe(userId);
        setPushSubscribed(false);
        handleToggle('push', false);
      } catch (error) {
        console.error('Error disabling push notifications:', error);
      }
    }
  };

  const testPushNotification = async () => {
    setTestingPush(true);
    try {
      const success = await pushNotificationService.sendTestNotification(userId);
      if (success) {
        // Show success message
        console.log('Test notification sent successfully');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
    } finally {
      setTestingPush(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                <div className="h-6 bg-gray-200 rounded w-12"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Notification Settings</h3>
        <p className="text-sm text-gray-600 mt-1">
          Manage how and when you receive notifications
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Delivery Methods */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4">Delivery Methods</h4>
          <div className="space-y-4">
            {/* Email Notifications */}
            <div className="flex items-center justify-between">
              <div>
                <h5 className="text-sm font-medium text-gray-900">Email Notifications</h5>
                <p className="text-sm text-gray-500">Receive notifications via email</p>
              </div>
              <button
                onClick={() => handleToggle('email', !settings.email)}
                disabled={saving}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  settings.email ? 'bg-primary' : 'bg-gray-200'
                } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  settings.email ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Push Notifications */}
            <div className="flex items-center justify-between">
              <div>
                <h5 className="text-sm font-medium text-gray-900">Push Notifications</h5>
                <p className="text-sm text-gray-500">
                  {pushSupported 
                    ? 'Receive browser push notifications' 
                    : 'Push notifications not supported in this browser'
                  }
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {pushSupported && pushSubscribed && (
                  <button
                    onClick={testPushNotification}
                    disabled={testingPush}
                    className="text-xs text-primary hover:text-primary-dark font-medium"
                  >
                    {testingPush ? 'Testing...' : 'Test'}
                  </button>
                )}
                <button
                  onClick={() => handlePushToggle(!settings.push)}
                  disabled={saving || !pushSupported}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                    settings.push ? 'bg-primary' : 'bg-gray-200'
                  } ${(saving || !pushSupported) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.push ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>

            {/* SMS Notifications */}
            <div className="flex items-center justify-between">
              <div>
                <h5 className="text-sm font-medium text-gray-900">SMS Notifications</h5>
                <p className="text-sm text-gray-500">Receive notifications via text message</p>
              </div>
              <button
                onClick={() => handleToggle('sms', !settings.sms)}
                disabled={saving}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  settings.sms ? 'bg-primary' : 'bg-gray-200'
                } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  settings.sms ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>
        </div>

        {/* Notification Categories */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4">Notification Types</h4>
          <div className="space-y-4">
            {[
              { key: 'system', label: 'System Notifications', description: 'Account updates, security alerts, and system messages', icon: 'fas fa-cog' },
              { key: 'event', label: 'Event Notifications', description: 'Event invitations, reminders, and updates', icon: 'fas fa-calendar-alt' },
              { key: 'social', label: 'Social Notifications', description: 'Connection requests, messages, and social activity', icon: 'fas fa-users' },
              { key: 'security', label: 'Security Notifications', description: 'Login alerts, password changes, and security warnings', icon: 'fas fa-shield-alt' }
            ].map((category) => (
              <div key={category.key} className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="mt-1">
                    <i className={`${category.icon} text-gray-400`}></i>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium text-gray-900">{category.label}</h5>
                    <p className="text-sm text-gray-500">{category.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleCategoryToggle(category.key as keyof NotificationSettingsType['categories'], !settings.categories[category.key as keyof NotificationSettingsType['categories']])}
                  disabled={saving}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                    settings.categories[category.key as keyof NotificationSettingsType['categories']] ? 'bg-primary' : 'bg-gray-200'
                  } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.categories[category.key as keyof NotificationSettingsType['categories']] ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Advanced Settings */}
        {showAdvanced && (
          <>
            {/* Notification Frequency */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">Notification Frequency</h4>
              <div className="space-y-2">
                {[
                  { value: 'immediate', label: 'Immediate', description: 'Receive notifications as they happen' },
                  { value: 'hourly', label: 'Hourly Digest', description: 'Receive a summary every hour' },
                  { value: 'daily', label: 'Daily Digest', description: 'Receive a daily summary' }
                ].map((option) => (
                  <label key={option.value} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="frequency"
                      value={option.value}
                      checked={settings.frequency === option.value}
                      onChange={() => handleToggle('frequency', option.value)}
                      disabled={saving}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{option.label}</div>
                      <div className="text-sm text-gray-500">{option.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Quiet Hours */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-md font-medium text-gray-900">Quiet Hours</h4>
                  <p className="text-sm text-gray-500">Pause notifications during specific hours</p>
                </div>
                <button
                  onClick={() => handleQuietHoursToggle(!settings.quietHours.enabled)}
                  disabled={saving}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                    settings.quietHours.enabled ? 'bg-primary' : 'bg-gray-200'
                  } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.quietHours.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {settings.quietHours.enabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={settings.quietHours.start}
                      onChange={(e) => handleQuietHoursTime('start', e.target.value)}
                      disabled={saving}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                    <input
                      type="time"
                      value={settings.quietHours.end}
                      onChange={(e) => handleQuietHoursTime('end', e.target.value)}
                      disabled={saving}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Work Hours Scheduling */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-md font-medium text-gray-900">Work Hours Scheduling</h4>
                  <p className="text-sm text-gray-500">Only receive notifications during work hours</p>
                </div>
                <button
                  onClick={() => handleSchedulingToggle(!settings.scheduling.enabled)}
                  disabled={saving}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                    settings.scheduling.enabled ? 'bg-primary' : 'bg-gray-200'
                  } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.scheduling.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {settings.scheduling.enabled && (
                <div className="space-y-4">
                  {/* Work Days */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Work Days</label>
                    <div className="flex flex-wrap gap-2">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                        <button
                          key={day}
                          onClick={() => handleWorkDayToggle(index, !settings.scheduling.workDays[index])}
                          disabled={saving}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                            settings.scheduling.workDays[index]
                              ? 'bg-primary text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Work Hours */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                      <input
                        type="time"
                        value={settings.scheduling.workHours.start}
                        onChange={(e) => handleWorkHoursTime('start', e.target.value)}
                        disabled={saving}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                      <input
                        type="time"
                        value={settings.scheduling.workHours.end}
                        onChange={(e) => handleWorkHoursTime('end', e.target.value)}
                        disabled={saving}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Daily Digest */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-md font-medium text-gray-900">Daily Digest</h4>
                  <p className="text-sm text-gray-500">Receive a daily summary of notifications</p>
                </div>
                <button
                  onClick={() => handleDigestToggle(!settings.digest.enabled)}
                  disabled={saving}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                    settings.digest.enabled ? 'bg-primary' : 'bg-gray-200'
                  } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.digest.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {settings.digest.enabled && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Time</label>
                    <input
                      type="time"
                      value={settings.digest.time}
                      onChange={(e) => handleDigestTime(e.target.value)}
                      disabled={saving}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="includeRead"
                      checked={settings.digest.includeRead}
                      onChange={(e) => handleDigestIncludeRead(e.target.checked)}
                      disabled={saving}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <label htmlFor="includeRead" className="text-sm text-gray-700">
                      Include read notifications in digest
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Auto Archive */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-md font-medium text-gray-900">Auto Archive</h4>
                  <p className="text-sm text-gray-500">Automatically archive old notifications</p>
                </div>
                <button
                  onClick={() => handleAutoArchiveToggle(!settings.autoArchive.enabled)}
                  disabled={saving}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                    settings.autoArchive.enabled ? 'bg-primary' : 'bg-gray-200'
                  } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.autoArchive.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {settings.autoArchive.enabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Archive after (days)</label>
                  <select
                    value={settings.autoArchive.afterDays}
                    onChange={(e) => handleAutoArchiveDays(parseInt(e.target.value))}
                    disabled={saving}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value={7}>7 days</option>
                    <option value={14}>14 days</option>
                    <option value={30}>30 days</option>
                    <option value={60}>60 days</option>
                    <option value={90}>90 days</option>
                  </select>
                </div>
              )}
            </div>
          </>
        )}

        {/* Save Status */}
        {saving && (
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span>Saving settings...</span>
          </div>
        )}
      </div>
    </div>
  );
}
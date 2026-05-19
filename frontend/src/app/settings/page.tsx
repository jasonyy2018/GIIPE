'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface UserSettings {
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
    eventReminders: boolean;
    newsUpdates: boolean;
    networkingRequests: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'private' | 'connections';
    showEmail: boolean;
    showPhone: boolean;
    allowMessages: boolean;
  };
  preferences: {
    language: string;
    timezone: string;
    dateFormat: string;
    theme: 'light' | 'dark' | 'auto';
  };
  account: {
    twoFactorEnabled: boolean;
    loginAlerts: boolean;
  };
}

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('notifications');
  const [settings, setSettings] = useState<UserSettings>({
    notifications: {
      email: true,
      sms: false,
      push: true,
      eventReminders: true,
      newsUpdates: true,
      networkingRequests: true,
    },
    privacy: {
      profileVisibility: 'public',
      showEmail: false,
      showPhone: false,
      allowMessages: true,
    },
    preferences: {
      language: 'en',
      timezone: 'UTC',
      dateFormat: 'MM/DD/YYYY',
      theme: 'light',
    },
    account: {
      twoFactorEnabled: false,
      loginAlerts: true,
    },
  });

  useEffect(() => {
    // Check authentication
    const checkAuth = () => {
      if (typeof window !== 'undefined') {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
          router.push('/login');
          return;
        }
      }

      // Load user settings (mock data for now)
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  const handleSettingChange = (category: keyof UserSettings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // Here you would save to backend
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      console.log('Saving settings:', settings);
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const resetSettings = () => {
    if (confirm('Are you sure you want to reset all settings to default values?')) {
      setSettings({
        notifications: {
          email: true,
          sms: false,
          push: true,
          eventReminders: true,
          newsUpdates: true,
          networkingRequests: true,
        },
        privacy: {
          profileVisibility: 'public',
          showEmail: false,
          showPhone: false,
          allowMessages: true,
        },
        preferences: {
          language: 'en',
          timezone: 'UTC',
          dateFormat: 'MM/DD/YYYY',
          theme: 'light',
        },
        account: {
          twoFactorEnabled: false,
          loginAlerts: true,
        },
      });
    }
  };

  const tabs = [
    { id: 'notifications', label: 'Notifications', icon: 'fas fa-bell' },
    { id: 'privacy', label: 'Privacy', icon: 'fas fa-shield-alt' },
    { id: 'preferences', label: 'Preferences', icon: 'fas fa-cog' },
    { id: 'account', label: 'Account Security', icon: 'fas fa-lock' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="mr-4 text-gray-600 hover:text-primary transition-colors"
              >
                <i className="fas fa-arrow-left text-xl"></i>
              </button>
              <h1 className="text-2xl font-bold text-primary-dark">Settings</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-primary hover:text-primary-dark font-medium"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="flex">
              {/* Sidebar */}
              <div className="w-1/4 bg-gray-50 border-r border-gray-200">
                <nav className="p-4 space-y-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full text-left px-4 py-3 rounded-md transition-colors ${
                        activeTab === tab.id
                          ? 'bg-primary text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <i className={`${tab.icon} mr-3`}></i>
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Content */}
              <div className="flex-1 p-6">
                {/* Notifications Tab */}
                {activeTab === 'notifications' && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Notification Settings</h2>

                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Delivery Methods</h3>
                        <div className="space-y-4">
                          {[
                            { key: 'email', label: 'Email Notifications', description: 'Receive notifications via email' },
                            { key: 'sms', label: 'SMS Notifications', description: 'Receive notifications via text message' },
                            { key: 'push', label: 'Push Notifications', description: 'Receive browser push notifications' },
                          ].map((item) => (
                            <div key={item.key} className="flex items-center justify-between">
                              <div>
                                <h4 className="text-sm font-medium text-gray-900">{item.label}</h4>
                                <p className="text-sm text-gray-500">{item.description}</p>
                              </div>
                              <button
                                onClick={() => handleSettingChange('notifications', item.key, !settings.notifications[item.key as keyof typeof settings.notifications])}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                                  settings.notifications[item.key as keyof typeof settings.notifications] ? 'bg-primary' : 'bg-gray-200'
                                }`}
                              >
                                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  settings.notifications[item.key as keyof typeof settings.notifications] ? 'translate-x-5' : 'translate-x-0'
                                }`} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Types</h3>
                        <div className="space-y-4">
                          {[
                            { key: 'eventReminders', label: 'Event Reminders', description: 'Get notified about upcoming events' },
                            { key: 'newsUpdates', label: 'News Updates', description: 'Receive updates about new articles and announcements' },
                            { key: 'networkingRequests', label: 'Networking Requests', description: 'Get notified when someone wants to connect' },
                          ].map((item) => (
                            <div key={item.key} className="flex items-center justify-between">
                              <div>
                                <h4 className="text-sm font-medium text-gray-900">{item.label}</h4>
                                <p className="text-sm text-gray-500">{item.description}</p>
                              </div>
                              <button
                                onClick={() => handleSettingChange('notifications', item.key, !settings.notifications[item.key as keyof typeof settings.notifications])}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                                  settings.notifications[item.key as keyof typeof settings.notifications] ? 'bg-primary' : 'bg-gray-200'
                                }`}
                              >
                                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  settings.notifications[item.key as keyof typeof settings.notifications] ? 'translate-x-5' : 'translate-x-0'
                                }`} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Privacy Tab */}
                {activeTab === 'privacy' && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Privacy Settings</h2>

                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Profile Visibility</label>
                        <select
                          value={settings.privacy.profileVisibility}
                          onChange={(e) => handleSettingChange('privacy', 'profileVisibility', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                        >
                          <option value="public">Public - Anyone can view your profile</option>
                          <option value="connections">Connections Only - Only your connections can view</option>
                          <option value="private">Private - Only you can view your profile</option>
                        </select>
                      </div>

                      <div className="space-y-4">
                        {[
                          { key: 'showEmail', label: 'Show Email Address', description: 'Display your email on your public profile' },
                          { key: 'showPhone', label: 'Show Phone Number', description: 'Display your phone number on your public profile' },
                          { key: 'allowMessages', label: 'Allow Messages', description: 'Allow other users to send you messages' },
                        ].map((item) => (
                          <div key={item.key} className="flex items-center justify-between">
                            <div>
                              <h4 className="text-sm font-medium text-gray-900">{item.label}</h4>
                              <p className="text-sm text-gray-500">{item.description}</p>
                            </div>
                            <button
                              onClick={() => handleSettingChange('privacy', item.key, !settings.privacy[item.key as keyof typeof settings.privacy])}
                              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                                settings.privacy[item.key as keyof typeof settings.privacy] ? 'bg-primary' : 'bg-gray-200'
                              }`}
                            >
                              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                settings.privacy[item.key as keyof typeof settings.privacy] ? 'translate-x-5' : 'translate-x-0'
                              }`} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Preferences Tab */}
                {activeTab === 'preferences' && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Preferences</h2>

                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                        <select
                          value={settings.preferences.language}
                          onChange={(e) => handleSettingChange('preferences', 'language', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                        >
                          <option value="en">English</option>
                          <option value="zh">中文</option>
                          <option value="es">Español</option>
                          <option value="fr">Français</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                        <select
                          value={settings.preferences.timezone}
                          onChange={(e) => handleSettingChange('preferences', 'timezone', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                        >
                          <option value="UTC">UTC</option>
                          <option value="America/New_York">Eastern Time</option>
                          <option value="America/Chicago">Central Time</option>
                          <option value="America/Denver">Mountain Time</option>
                          <option value="America/Los_Angeles">Pacific Time</option>
                          <option value="Europe/London">London</option>
                          <option value="Asia/Shanghai">Shanghai</option>
                          <option value="Asia/Tokyo">Tokyo</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
                        <select
                          value={settings.preferences.dateFormat}
                          onChange={(e) => handleSettingChange('preferences', 'dateFormat', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                        >
                          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                          <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
                        <select
                          value={settings.preferences.theme}
                          onChange={(e) => handleSettingChange('preferences', 'theme', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                        >
                          <option value="light">Light</option>
                          <option value="dark">Dark</option>
                          <option value="auto">Auto (System)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Account Security Tab */}
                {activeTab === 'account' && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Account Security</h2>

                    <div className="space-y-6">
                      <div className="space-y-4">
                        {[
                          { key: 'twoFactorEnabled', label: 'Two-Factor Authentication', description: 'Add an extra layer of security to your account' },
                          { key: 'loginAlerts', label: 'Login Alerts', description: 'Get notified when someone logs into your account' },
                        ].map((item) => (
                          <div key={item.key} className="flex items-center justify-between">
                            <div>
                              <h4 className="text-sm font-medium text-gray-900">{item.label}</h4>
                              <p className="text-sm text-gray-500">{item.description}</p>
                            </div>
                            <button
                              onClick={() => handleSettingChange('account', item.key, !settings.account[item.key as keyof typeof settings.account])}
                              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                                settings.account[item.key as keyof typeof settings.account] ? 'bg-primary' : 'bg-gray-200'
                              }`}
                            >
                              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                settings.account[item.key as keyof typeof settings.account] ? 'translate-x-5' : 'translate-x-0'
                              }`} />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="pt-6 border-t border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Password & Security</h3>
                        <div className="space-y-3">
                          <button className="w-full text-left px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-sm font-medium text-gray-900">Change Password</h4>
                                <p className="text-sm text-gray-500">Update your account password</p>
                              </div>
                              <i className="fas fa-chevron-right text-gray-400"></i>
                            </div>
                          </button>

                          <button className="w-full text-left px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-sm font-medium text-gray-900">Active Sessions</h4>
                                <p className="text-sm text-gray-500">Manage your active login sessions</p>
                              </div>
                              <i className="fas fa-chevron-right text-gray-400"></i>
                            </div>
                          </button>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-gray-200">
                        <h3 className="text-lg font-medium text-red-600 mb-4">Danger Zone</h3>
                        <button className="w-full text-left px-4 py-3 border border-red-300 rounded-md hover:bg-red-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-sm font-medium text-red-600">Delete Account</h4>
                              <p className="text-sm text-red-500">Permanently delete your account and all data</p>
                            </div>
                            <i className="fas fa-trash-alt text-red-400"></i>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-8 pt-6 border-t border-gray-200 flex justify-between">
                  <button
                    onClick={resetSettings}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Reset to Defaults
                  </button>
                  <div className="space-x-3">
                    <button
                      onClick={() => router.back()}
                      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveSettings}
                      disabled={saving}
                      className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? (
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
        </div>
      </main>
    </div>
  );
}

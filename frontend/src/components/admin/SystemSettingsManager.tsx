'use client';



import { useState, useEffect } from 'react';

import { toast } from 'react-hot-toast';



interface SystemSetting {

  id: string;

  key: string;

  value: string;

  description: string;

  updatedAt: string;

}



interface SettingCategory {

  name: string;

  description: string;

  settings: SystemSetting[];

}



interface SettingBackup {

  id: string;

  timestamp: string;

  settings: SystemSetting[];

  description: string;

}



export default function SystemSettingsManager() {

  const [settings, setSettings] = useState<SystemSetting[]>([]);

  const [loading, setLoading] = useState(true);

  const [editingKey, setEditingKey] = useState<string | null>(null);

  const [editValue, setEditValue] = useState('');

  const [editDescription, setEditDescription] = useState('');

  const [newSetting, setNewSetting] = useState({ key: '', value: '', description: '' });

  const [showNewForm, setShowNewForm] = useState(false);

  const [testingKey, setTestingKey] = useState<string | null>(null);

  const [testResult, setTestResult] = useState<string | null>(null);

  const [backups, setBackups] = useState<SettingBackup[]>([]);

  const [showBackups, setShowBackups] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');

  const [selectedCategory, setSelectedCategory] = useState('all');



  // Predefined setting categories for better organization

  const settingCategories = [

    { id: 'email', name: 'Email Configuration', pattern: /^(email|smtp|mail)/ },

    { id: 'storage', name: 'Storage Settings', pattern: /^(storage|upload|file)/ },

    { id: 'api', name: 'API Configuration', pattern: /^(api|rate|limit)/ },

    { id: 'security', name: 'Security Settings', pattern: /^(security|auth|jwt)/ },

    { id: 'system', name: 'System Settings', pattern: /^(system|app|debug)/ }

  ];



  useEffect(() => {

    fetchSettings();

    fetchBackups();

  }, []);



  const fetchSettings = async () => {

    try {

      const response = await fetch('/api/admin/settings');

      if (response.ok) {

        const data = await response.json();

        setSettings(data);

      } else {

        toast.error('Failed to fetch settings');

      }

    } catch (error) {

      toast.error('Error fetching settings');

    } finally {

      setLoading(false);

    }

  };



  const fetchBackups = async () => {

    try {

      const response = await fetch('/api/admin/settings/backups');

      if (response.ok) {

        const data = await response.json();

        setBackups(data);

      }

    } catch (error) {

      console.error('Error fetching backups:', error);

    }

  };



  const createSetting = async () => {

    if (!newSetting.key || !newSetting.value) {

      toast.error('Key and value are required');

      return;

    }



    try {

      const response = await fetch('/api/admin/settings', {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify(newSetting)

      });



      if (response.ok) {

        toast.success('Setting created successfully');

        setNewSetting({ key: '', value: '', description: '' });

        setShowNewForm(false);

        fetchSettings();

      } else {

        const error = await response.json();

        toast.error(error.message || 'Failed to create setting');

      }

    } catch (error) {

      toast.error('Error creating setting');

    }

  };



  const updateSetting = async (key: string) => {

    try {

      const response = await fetch(`/api/admin/settings/${key}`, {

        method: 'PUT',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ 

          value: editValue, 

          description: editDescription 

        })

      });



      if (response.ok) {

        toast.success('Setting updated successfully');

        setEditingKey(null);

        fetchSettings();

      } else {

        toast.error('Failed to update setting');

      }

    } catch (error) {

      toast.error('Error updating setting');

    }

  };



  const deleteSetting = async (key: string) => {

    if (!confirm('Are you sure you want to delete this setting  ')) return;



    try {

      const response = await fetch(`/api/admin/settings/${key}`, {

        method: 'DELETE'

      });



      if (response.ok) {

        toast.success('Setting deleted successfully');

        fetchSettings();

      } else {

        toast.error('Failed to delete setting');

      }

    } catch (error) {

      toast.error('Error deleting setting');

    }

  };



  const testSetting = async (key: string, value: string) => {

    setTestingKey(key);

    setTestResult(null);



    try {

      const response = await fetch('/api/admin/settings/test', {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ key, value })

      });



      const result = await response.json();

      setTestResult(result.success ? 'Test passed' : `Test failed: ${result.error}`);

    } catch (error) {

      setTestResult('Test failed: Network error');

    } finally {

      setTestingKey(null);

    }

  };



  const createBackup = async () => {

    const description = prompt('Enter backup description:');

    if (!description) return;



    try {

      const response = await fetch('/api/admin/settings/backup', {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ description })

      });



      if (response.ok) {

        toast.success('Backup created successfully');

        fetchBackups();

      } else {

        toast.error('Failed to create backup');

      }

    } catch (error) {

      toast.error('Error creating backup');

    }

  };



  const restoreBackup = async (backupId: string) => {

    if (!confirm('Are you sure you want to restore this backup   This will overwrite current settings.')) return;



    try {

      const response = await fetch(`/api/admin/settings/restore/${backupId}`, {

        method: 'POST'

      });



      if (response.ok) {

        toast.success('Settings restored successfully');

        fetchSettings();

      } else {

        toast.error('Failed to restore backup');

      }

    } catch (error) {

      toast.error('Error restoring backup');

    }

  };



  const startEdit = (setting: SystemSetting) => {

    setEditingKey(setting.key);

    setEditValue(setting.value);

    setEditDescription(setting.description || '');

  };



  const cancelEdit = () => {

    setEditingKey(null);

    setEditValue('');

    setEditDescription('');

  };



  const getCategoryForSetting = (key: string) => {

    for (const category of settingCategories) {

      if (category.pattern.test(key.toLowerCase())) {

        return category.id;

      }

    }

    return 'other';

  };



  const filteredSettings = settings.filter(setting => {

    const matchesSearch = setting.key.toLowerCase().includes(searchTerm.toLowerCase()) ||

                         (setting.description || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || getCategoryForSetting(setting.key) === selectedCategory;

    return matchesSearch && matchesCategory;

  });



  const groupedSettings = settingCategories.reduce((acc, category) => {

    acc[category.id] = filteredSettings.filter(setting => getCategoryForSetting(setting.key) === category.id);

    return acc;

  }, {} as Record<string, SystemSetting[]>);



  // Add 'other' category for settings that don't match predefined patterns

  groupedSettings.other = filteredSettings.filter(setting => getCategoryForSetting(setting.key) === 'other');



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

          <h2 className="text-2xl font-bold text-gray-900">System Settings</h2>

          <p className="text-gray-600">Configure system-wide settings and preferences</p>

        </div>

        <div className="flex space-x-3">

          <button

            onClick={createBackup}

            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"

          >

            <i className="fas fa-save mr-2"></i>

            Create Backup

          </button>

          <button

            onClick={() => setShowBackups(!showBackups)}

            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"

          >

            <i className="fas fa-history mr-2"></i>

            View Backups

          </button>

          <button

            onClick={() => setShowNewForm(!showNewForm)}

            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"

          >

            <i className="fas fa-plus mr-2"></i>

            Add Setting

          </button>

        </div>

      </div>



      {/* Search and Filter */}

      <div className="mb-6 flex space-x-4">

        <div className="flex-1">

          <input

            type="text"

            placeholder="Search settings..."

            value={searchTerm}

            onChange={(e) => setSearchTerm(e.target.value)}

            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"

          />

        </div>

        <select

          value={selectedCategory}

          onChange={(e) => setSelectedCategory(e.target.value)}

          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"

        >

          <option value="all">All Categories</option>

          {settingCategories.map(category => (

            <option key={category.id} value={category.id}>{category.name}</option>

          ))}

          <option value="other">Other</option>

        </select>

      </div>



      {/* Backup Management Modal */}

      {showBackups && (

        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">

          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-96 overflow-y-auto">

            <div className="flex justify-between items-center mb-4">

              <h3 className="text-lg font-semibold">Setting Backups</h3>

              <button

                onClick={() => setShowBackups(false)}

                className="text-gray-400 hover:text-gray-600"

              >

                <i className="fas fa-times"></i>

              </button>

            </div>

            <div className="space-y-3">

              {backups.map(backup => (

                <div key={backup.id} className="flex items-center justify-between p-3 border rounded-md">

                  <div>

                    <div className="font-medium">{backup.description}</div>

                    <div className="text-sm text-gray-500">

                      {new Date(backup.timestamp).toLocaleString()}  {backup.settings.length} settings

                    </div>

                  </div>

                  <button

                    onClick={() => restoreBackup(backup.id)}

                    className="px-3 py-1 bg-primary text-white rounded hover:bg-primary-dark transition-colors"

                  >

                    Restore

                  </button>

                </div>

              ))}

              {backups.length === 0 && (

                <div className="text-center text-gray-500 py-8">No backups available</div>

              )}

            </div>

          </div>

        </div>

      )}



      {/* New Setting Form */}

      {showNewForm && (

        <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">

          <h3 className="text-lg font-semibold mb-4">Add New Setting</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            <input

              type="text"

              placeholder="Setting key"

              value={newSetting.key}

              onChange={(e) => setNewSetting({ ...newSetting, key: e.target.value })}

              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"

            />

            <input

              type="text"

              placeholder="Setting value"

              value={newSetting.value}

              onChange={(e) => setNewSetting({ ...newSetting, value: e.target.value })}

              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"

            />

            <input

              type="text"

              placeholder="Description (optional)"

              value={newSetting.description}

              onChange={(e) => setNewSetting({ ...newSetting, description: e.target.value })}

              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"

            />

          </div>

          <div className="mt-4 flex space-x-3">

            <button

              onClick={createSetting}

              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"

            >

              Create Setting

            </button>

            <button

              onClick={() => setShowNewForm(false)}

              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"

            >

              Cancel

            </button>

          </div>

        </div>

      )}



      {/* Settings by Category */}

      <div className="space-y-6">

        {[...settingCategories, { id: 'other', name: 'Other Settings' }].map(category => {

          const categorySettings = groupedSettings[category.id] || [];

          if (categorySettings.length === 0 && selectedCategory === 'all') return null;



          return (

            <div key={category.id} className="border border-gray-200 rounded-lg">

              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">

                <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>

              </div>

              <div className="divide-y divide-gray-200">

                {categorySettings.map(setting => (

                  <div key={setting.key} className="p-4">

                    <div className="flex items-start justify-between">

                      <div className="flex-1">

                        <div className="flex items-center space-x-3">

                          <span className="font-medium text-gray-900">{setting.key}</span>

                          {testResult && testingKey === setting.key && (

                            <span className={`text-sm px-2 py-1 rounded ${

                              testResult.includes('passed') 

                                ? 'bg-green-100 text-green-800' 

                                : 'bg-red-100 text-red-800'

                            }`}>

                              {testResult}

                            </span>

                          )}

                        </div>

                        {editingKey === setting.key ? (

                          <div className="mt-2 space-y-2">

                            <input

                              type="text"

                              value={editValue}

                              onChange={(e) => setEditValue(e.target.value)}

                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"

                            />

                            <input

                              type="text"

                              placeholder="Description (optional)"

                              value={editDescription}

                              onChange={(e) => setEditDescription(e.target.value)}

                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"

                            />

                            <div className="flex space-x-2">

                              <button

                                onClick={() => updateSetting(setting.key)}

                                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"

                              >

                                Save

                              </button>

                              <button

                                onClick={cancelEdit}

                                className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"

                              >

                                Cancel

                              </button>

                            </div>

                          </div>

                        ) : (

                          <div className="mt-1">

                            <div className="text-gray-600 font-mono text-sm bg-gray-100 px-2 py-1 rounded">

                              {setting.value}

                            </div>

                            {setting.description && (

                              <div className="text-sm text-gray-500 mt-1">{setting.description}</div>

                            )}

                            <div className="text-xs text-gray-400 mt-1">

                              Last updated: {new Date(setting.updatedAt).toLocaleString()}

                            </div>

                          </div>

                        )}

                      </div>

                      <div className="flex space-x-2 ml-4">

                        <button

                          onClick={() => testSetting(setting.key, setting.value)}

                          disabled={testingKey === setting.key}

                          className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors disabled:opacity-50"

                        >

                          {testingKey === setting.key ? (

                            <i className="fas fa-spinner fa-spin"></i>

                          ) : (

                            <i className="fas fa-vial"></i>

                          )}

                        </button>

                        <button

                          onClick={() => startEdit(setting)}

                          className="px-3 py-1 bg-primary text-white rounded hover:bg-primary-dark transition-colors"

                        >

                          <i className="fas fa-edit"></i>

                        </button>

                        <button

                          onClick={() => deleteSetting(setting.key)}

                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"

                        >

                          <i className="fas fa-trash"></i>

                        </button>

                      </div>

                    </div>

                  </div>

                ))}

                {categorySettings.length === 0 && selectedCategory !== 'all' && (

                  <div className="p-4 text-center text-gray-500">No settings in this category</div>

                )}

              </div>

            </div>

          );

        })}

      </div>



      {filteredSettings.length === 0 && (

        <div className="text-center py-12">

          <i className="fas fa-cog text-4xl text-gray-300 mb-4"></i>

          <h3 className="text-lg font-medium text-gray-900 mb-2">No settings found</h3>

          <p className="text-gray-500">

            {searchTerm ? 'Try adjusting your search terms' : 'Create your first system setting to get started'}

          </p>

        </div>

      )}

    </div>

  );

}
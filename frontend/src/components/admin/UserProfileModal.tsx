'use client';

import { useState, useEffect } from 'react';
import { User, UserRole } from '@/types/user';

interface UserActivity {
  id: string;
  action: string;
  description: string;
  timestamp: Date;
  metadata?: any;
}

interface UserProfileModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdate?: (updatedUser: User) => void;
  mode?: 'view' | 'edit' | 'create';
}

interface UserFormData {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  password?: string;
  confirmPassword?: string;
  newPassword?: string;
  confirmNewPassword?: string;
  forcePasswordChange?: boolean;
}

export default function UserProfileModal({
  user,
  isOpen,
  onClose,
  onUserUpdate,
  mode = 'view'
}: UserProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'activity' | 'edit' | 'permissions'>('profile');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    role: 'MEMBER',
    isActive: true,
    password: '',
    confirmPassword: '',
    newPassword: '',
    confirmNewPassword: '',
    forcePasswordChange: true
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Initialize form data when user changes or mode changes
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        role: user.role || 'MEMBER',
        isActive: user.isActive ?? true,
        password: '',
        confirmPassword: '',
        newPassword: '',
        confirmNewPassword: '',
        forcePasswordChange: true
      });
    } else if (mode === 'create') {
      setFormData({
        username: '',
        email: '',
        firstName: '',
        lastName: '',
        role: 'MEMBER',
        isActive: true,
        password: '',
        confirmPassword: '',
        newPassword: '',
        confirmNewPassword: '',
        forcePasswordChange: false
      });
    }
  }, [user, mode]);

  // Reset activeTab when modal opens/closes or user changes
  useEffect(() => {
    if (isOpen && user) {
      // If mode is 'edit', set activeTab to 'edit' immediately
      if (mode === 'edit') {
        setActiveTab('edit');
      } else {
        setActiveTab('profile');
      }
      // Ensure form data is updated when user changes
      setFormData({
        username: user.username || '',
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        role: user.role || 'MEMBER',
        isActive: user.isActive ?? true,
        password: '',
        confirmPassword: '',
        newPassword: '',
        confirmNewPassword: '',
        forcePasswordChange: true
      });
    } else if (isOpen && mode === 'create') {
      setActiveTab('profile'); // Create mode shows form directly
    } else if (!isOpen) {
      setActiveTab('profile'); // Reset to profile when closing
      setFormErrors({});
    }
  }, [isOpen, user, mode]);
  
  // Update form data when switching to edit tab
  useEffect(() => {
    if (activeTab === 'edit' && user && mode !== 'create') {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        role: user.role || 'MEMBER',
        isActive: user.isActive ?? true,
        password: '',
        confirmPassword: '',
        newPassword: '',
        confirmNewPassword: '',
        forcePasswordChange: true
      });
      setFormErrors({}); // Clear any previous errors
    }
  }, [activeTab, user, mode]);

  // Load user activity when tab is selected
  useEffect(() => {
    if (activeTab === 'activity' && user && isOpen) {
      loadUserActivity();
    }
  }, [activeTab, user, isOpen]);

  const loadUserActivity = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${user.id}/activity`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.ok) {
        const activities = await response.json();
        setUserActivity(activities.map((activity: any) => ({
          ...activity,
          timestamp: new Date(activity.timestamp)
        })));
      }
    } catch (error) {
      console.error('Failed to load user activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (mode === 'create') {
      if (!formData.password) {
        errors.password = 'Password is required';
      } else if (formData.password.length < 6) {
        errors.password = 'Password must be at least 6 characters';
      }

      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }

    // Validate password change in edit mode
    if (mode !== 'create' && formData.newPassword) {
      if (formData.newPassword.length < 6) {
        errors.newPassword = 'Password must be at least 6 characters';
      }

      if (formData.newPassword !== formData.confirmNewPassword) {
        errors.confirmNewPassword = 'Passwords do not match';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    // Check if we have a user ID for updates
    if (mode !== 'create' && !user?.id) {
      setFormErrors({ general: 'User ID is missing. Cannot save changes.' });
      return;
    }

    setSaving(true);
    setFormErrors({}); // Clear previous errors
    
    try {
      const isCreateMode = mode === 'create';
      const endpoint = isCreateMode 
        ? '/api/admin/users'
        : `/api/admin/users/${user?.id}`;
      
      const method = isCreateMode ? 'POST' : 'PATCH';
      
      const payload: any = { 
        username: formData.username.trim(),
        email: formData.email.trim(),
        firstName: formData.firstName?.trim() || '',
        lastName: formData.lastName?.trim() || '',
        role: formData.role,
        isActive: formData.isActive
      };
      
      // Handle password updates
      if (isCreateMode && formData.password) {
        // Creating new user
        payload.password = formData.password;
      } else if (!isCreateMode && formData.newPassword) {
        // Admin updating user password
        payload.password = formData.newPassword;
        payload.mustChangePassword = formData.forcePasswordChange !== false; // Default to true
      }

      console.log('Saving user:', { endpoint, method, payload, mode, activeTab });

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(payload)
      });

      const responseData = await response.json().catch(() => ({ message: 'Failed to parse response' }));

      if (response.ok) {
        const updatedUser = responseData;
        onUserUpdate?.(updatedUser);
        // Show success message
        alert(isCreateMode ? 'User created successfully!' : 'User updated successfully!');
        onClose();
      } else {
        console.error('Save failed:', response.status, responseData);
        setFormErrors({ general: responseData.message || responseData.error || 'Failed to save user' });
      }
    } catch (error) {
      console.error('Error saving user:', error);
      setFormErrors({ general: 'Network error occurred. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof UserFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const getActivityIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'login': return 'fas fa-sign-in-alt text-green-600';
      case 'logout': return 'fas fa-sign-out-alt text-gray-600';
      case 'register': return 'fas fa-user-plus text-primary';
      case 'profile_update': return 'fas fa-edit text-primary';
      case 'password_change': return 'fas fa-key text-orange-600';
      case 'event_registration': return 'fas fa-calendar-plus text-green-600';
      case 'comment_created': return 'fas fa-comment text-primary';
      case 'role_changed': return 'fas fa-user-tag text-purple-600';
      case 'account_activated': return 'fas fa-check-circle text-green-600';
      case 'account_deactivated': return 'fas fa-ban text-red-600';
      default: return 'fas fa-circle text-gray-400';
    }
  };

  const formatActivityDescription = (activity: UserActivity) => {
    switch (activity.action.toLowerCase()) {
      case 'login':
        return `Logged in from ${activity.metadata?.ipAddress || 'unknown IP'}`;
      case 'register':
        return 'Account created';
      case 'profile_update':
        return 'Profile information updated';
      case 'password_change':
        return 'Password changed';
      case 'event_registration':
        return `Registered for event: ${activity.metadata?.eventTitle || 'Unknown Event'}`;
      case 'comment_created':
        return `Posted comment on ${activity.metadata?.targetType || 'content'}`;
      case 'role_changed':
        return `Role changed from ${activity.metadata?.oldRole || 'unknown'} to ${activity.metadata?.newRole || 'unknown'}`;
      case 'account_activated':
        return 'Account activated';
      case 'account_deactivated':
        return 'Account deactivated';
      default:
        return activity.description || activity.action;
    }
  };

  const getPermissionsByRole = (role: UserRole) => {
    const permissions: Record<string, { name: string; icon: string; permissions: string[] }> = {
      ADMIN: {
        name: 'Administrator',
        icon: 'fas fa-user-shield text-red-600',
        permissions: [
          'Full access to all features',
          'User management (create, edit, delete)',
          'Content management (events, news)',
          'System administration',
          'Analytics and reporting',
          'Audit logs access',
          'Permission management'
        ]
      },
      EDITOR: {
        name: 'Editor',
        icon: 'fas fa-user-edit text-primary',
        permissions: [
          'Create and edit events',
          'Create and edit news',
          'Publish content',
          'Moderate comments',
          'Review submissions',
          'Manage registrations',
          'View analytics',
          'View user profiles'
        ]
      },
      MEMBER: {
        name: 'Member',
        icon: 'fas fa-user text-gray-600',
        permissions: [
          'View events and news',
          'Create comments',
          'Manage own comments',
          'Create submissions',
          'Manage own submissions',
          'Register for events',
          'Manage own registrations',
          'View and edit own profile'
        ]
      }
    };

    return [permissions[role] || permissions.MEMBER];
  };

  const formatPermissionName = (permission: string): string => {
    return permission;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              {user && (
                <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-white font-medium text-lg">
                    {user.firstName?.[0] || user.username[0].toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <h3 className="text-xl font-medium text-gray-900">
                  {mode === 'create' 
                    ? 'Create New User' 
                    : user 
                      ? `${user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}`
                      : 'User Profile'
                  }
                </h3>
                {user && (
                  <p className="text-sm text-gray-500">{user.email}</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>

          {/* Tabs */}
          {mode !== 'create' && (
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'profile'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Profile Information
                </button>
                <button
                  onClick={() => setActiveTab('activity')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'activity'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Activity Timeline
                </button>
                <button
                  onClick={() => setActiveTab('edit')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'edit'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Edit User
                </button>
                <button
                  onClick={() => setActiveTab('permissions')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'permissions'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Permissions
                </button>
              </nav>
            </div>
          )}

          {/* Content */}
          <div className="max-h-96 overflow-y-auto">
            {/* Profile Tab */}
            {activeTab === 'profile' && mode !== 'create' && user && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Username
                    </label>
                    <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                      {user.username}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                      {user.email}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                      {user.firstName || 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                      {user.lastName || 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role
                    </label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.role === 'ADMIN' ? 'bg-red-100 text-red-800' :
                      user.role === 'EDITOR' ? 'bg-light text-primary-dark' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Joined
                    </label>
                    <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Login
                    </label>
                    <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Create/Edit Form */}
            {(activeTab === 'edit' || mode === 'create') && (
                  <div className="space-y-4">
                    {formErrors.general && (
                      <div className="bg-red-50 border border-red-200 rounded-md p-3">
                        <p className="text-sm text-red-600">{formErrors.general}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Username *
                        </label>
                        <input
                          type="text"
                          value={formData.username}
                          onChange={(e) => handleInputChange('username', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                            formErrors.username ? 'border-red-300' : 'border-gray-300'
                          }`}
                        />
                        {formErrors.username && (
                          <p className="text-xs text-red-600 mt-1">{formErrors.username}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email *
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                            formErrors.email ? 'border-red-300' : 'border-gray-300'
                          }`}
                        />
                        {formErrors.email && (
                          <p className="text-xs text-red-600 mt-1">{formErrors.email}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          First Name
                        </label>
                        <input
                          type="text"
                          value={formData.firstName}
                          onChange={(e) => handleInputChange('firstName', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Last Name
                        </label>
                        <input
                          type="text"
                          value={formData.lastName}
                          onChange={(e) => handleInputChange('lastName', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Role
                        </label>
                        <select
                          value={formData.role}
                          onChange={(e) => handleInputChange('role', e.target.value as UserRole)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                          <option value="MEMBER">Member</option>
                          <option value="EDITOR">Editor</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Status
                        </label>
                        <select
                          value={formData.isActive ? 'active' : 'inactive'}
                          onChange={(e) => handleInputChange('isActive', e.target.value === 'active')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>

                      {mode === 'create' && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Password *
                            </label>
                            <input
                              type="password"
                              value={formData.password}
                              onChange={(e) => handleInputChange('password', e.target.value)}
                              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                                formErrors.password ? 'border-red-300' : 'border-gray-300'
                              }`}
                            />
                            {formErrors.password && (
                              <p className="text-xs text-red-600 mt-1">{formErrors.password}</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Confirm Password *
                            </label>
                            <input
                              type="password"
                              value={formData.confirmPassword}
                              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                                formErrors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                              }`}
                            />
                            {formErrors.confirmPassword && (
                              <p className="text-xs text-red-600 mt-1">{formErrors.confirmPassword}</p>
                            )}
                          </div>
                        </>
                      )}
                      
                      {activeTab === 'edit' && mode !== 'create' && (
                        <>
                          <div className="col-span-2">
                            <h4 className="text-sm font-medium text-gray-700 mb-3">Change Password (Optional)</h4>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              New Password
                            </label>
                            <input
                              type="password"
                              value={formData.newPassword}
                              onChange={(e) => handleInputChange('newPassword', e.target.value)}
                              placeholder="Leave blank to keep current password"
                              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                                formErrors.newPassword ? 'border-red-300' : 'border-gray-300'
                              }`}
                            />
                            {formErrors.newPassword && (
                              <p className="text-xs text-red-600 mt-1">{formErrors.newPassword}</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Confirm New Password
                            </label>
                            <input
                              type="password"
                              value={formData.confirmNewPassword}
                              onChange={(e) => handleInputChange('confirmNewPassword', e.target.value)}
                              placeholder="Confirm new password"
                              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                                formErrors.confirmNewPassword ? 'border-red-300' : 'border-gray-300'
                              }`}
                            />
                            {formErrors.confirmNewPassword && (
                              <p className="text-xs text-red-600 mt-1">{formErrors.confirmNewPassword}</p>
                            )}
                          </div>

                          <div className="col-span-2">
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                id="forcePasswordChange"
                                checked={formData.forcePasswordChange}
                                onChange={(e) => handleInputChange('forcePasswordChange', e.target.checked)}
                                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                              />
                              <label htmlFor="forcePasswordChange" className="ml-2 block text-sm text-gray-700">
                                Require user to change password on next login
                              </label>
                            </div>
                            {formData.newPassword && (
                              <p className="text-xs text-gray-500 mt-2">
                                <i className="fas fa-info-circle mr-1"></i>
                                If checked, the user will be required to change their password when they next log in.
                              </p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

            {/* Activity Tab */}
            {activeTab === 'activity' && (
              <div className="space-y-4">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-2 text-gray-600">Loading activity...</span>
                  </div>
                ) : userActivity.length > 0 ? (
                  <div className="flow-root">
                    <ul className="-mb-8">
                      {userActivity.map((activity, index) => (
                        <li key={activity.id}>
                          <div className="relative pb-8">
                            {index !== userActivity.length - 1 && (
                              <span
                                className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                                aria-hidden="true"
                              />
                            )}
                            <div className="relative flex space-x-3">
                              <div>
                                <span className="h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white bg-gray-100">
                                  <i className={`${getActivityIcon(activity.action)} text-sm`}></i>
                                </span>
                              </div>
                              <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                <div>
                                  <p className="text-sm text-gray-900">
                                    {formatActivityDescription(activity)}
                                  </p>
                                </div>
                                <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                  <time dateTime={activity.timestamp.toISOString()}>
                                    {activity.timestamp.toLocaleDateString()} {activity.timestamp.toLocaleTimeString()}
                                  </time>
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <i className="fas fa-history text-4xl text-gray-300 mb-4"></i>
                    <p className="text-lg font-medium text-gray-400">No activity found</p>
                    <p className="text-sm text-gray-400 mt-1">
                      User activity will appear here once they start using the platform
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Permissions Tab */}
            {activeTab === 'permissions' && user && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Role-Based Permissions</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    User permissions are automatically assigned based on their role. Change the user's role in the Edit tab to modify permissions.
                  </p>
                  
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Current Role</p>
                        <p className="text-lg text-gray-700 mt-1">{user.role}</p>
                      </div>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        user.role === 'ADMIN' ? 'bg-red-100 text-red-800' :
                        user.role === 'EDITOR' ? 'bg-light text-primary-dark' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h5 className="text-md font-medium text-gray-900">Available Permissions</h5>
                    
                    {/* Permission Categories */}
                    {getPermissionsByRole(user.role).map((category) => (
                      <div key={category.name} className="border border-gray-200 rounded-lg p-4">
                        <h6 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                          <i className={`${category.icon} mr-2`}></i>
                          {category.name}
                        </h6>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {category.permissions.map((permission) => (
                            <div key={permission} className="flex items-center space-x-2">
                              <i className="fas fa-check-circle text-green-600"></i>
                              <span className="text-sm text-gray-700">{formatPermissionName(permission)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <i className="fas fa-info-circle text-blue-600"></i>
                      </div>
                      <div className="ml-3">
                        <h6 className="text-sm font-medium text-blue-900">Permission Information</h6>
                        <div className="mt-2 text-sm text-blue-700">
                          <ul className="list-disc list-inside space-y-1">
                            <li><strong>ADMIN:</strong> Full access to all system features and permissions</li>
                            <li><strong>EDITOR:</strong> Can manage content (events, news), moderate comments, and view analytics</li>
                            <li><strong>MEMBER:</strong> Basic user permissions for viewing content and managing own resources</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              {(activeTab === 'edit' || mode === 'create') ? 'Cancel' : 'Close'}
            </button>
            {(activeTab === 'edit' || mode === 'create') && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
                    Saving...
                  </>
                ) : (
                  mode === 'create' ? 'Create User' : 'Save Changes'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
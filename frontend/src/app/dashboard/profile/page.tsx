'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import DashboardLayout from '@/components/layout/DashboardLayout';
import AuthGuard from '@/components/auth/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';

function UserProfileContent() {
  const router = useRouter();
  const { user: authUser, updateProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [user, setUser] = useState({
    name: '',
    email: '',
    phone: '',
    organization: '',
    position: '',
    location: '',
    bio: '',
    avatar: '/images/features/innovation.jpg',
    interests: [] as string[],
    joinDate: ''
  });

  const [formData, setFormData] = useState(user);

  useEffect(() => {
    // Load user data from auth context
    const loadUserData = () => {
      if (!authUser) {
        setLoading(false);
        return;
      }
      
      const userProfile = {
        name: `${authUser.profile?.firstName || ''} ${authUser.profile?.lastName || ''}`.trim() || authUser.username || '',
        email: authUser.email || '',
        phone: '', // phone is not in UserProfile type
        organization: authUser.profile?.organization || '',
        position: '', // position is not in UserProfile type
        location: '', // location is not in UserProfile type
        bio: authUser.profile?.bio || '',
        avatar: authUser.profile?.avatar || '/images/features/innovation.jpg',
        interests: [], // interests is not in UserProfile type
        joinDate: authUser.createdAt ? new Date(authUser.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : ''
      };
      
      setUser(userProfile);
      setFormData(userProfile);
      setLoading(false);
    };

    loadUserData();
  }, [authUser]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    if (!authUser) return;
    
    setSaving(true);
    setError(null);
    setSuccess(false);
    
    try {
      // Extract first name and last name from full name
      const nameParts = formData.name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      // Prepare profile data for API
      // Note: position and location are not in the database schema yet
      // They are stored in the form but not sent to backend
      // phone is also not in UserProfile type, so we'll skip it for now
      const profileData = {
        profile: {
          firstName,
          lastName,
          bio: formData.bio,
          organization: formData.organization,
          avatar: formData.avatar,
        }
      };
      
      // Call the updateProfile API
      await updateProfile(profileData);
      
      // Update local state
      setUser(formData);
      setEditing(false);
      setSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setError(err.message || 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(user);
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // User navigation items
  const userNavigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-home', href: '/dashboard', active: false },
    { id: 'events', label: 'My Events', icon: 'fas fa-calendar', href: '/dashboard/events', active: false },
    { id: 'bookmarks', label: 'Bookmarks', icon: 'fas fa-bookmark', href: '/dashboard/bookmarks', active: false },
    { id: 'messages', label: 'Messages', icon: 'fas fa-envelope', href: '/dashboard/messages', active: false },
    { id: 'network', label: 'Network', icon: 'fas fa-users', href: '/dashboard/network', active: false },
    { id: 'profile', label: 'Profile', icon: 'fas fa-user', href: '/dashboard/profile', active: true }
  ];

  return (
    <DashboardLayout 
      title="My Profile" 
      navigationItems={userNavigationItems}
      userRole="user"
    >
      <div className="max-w-4xl mx-auto">
        <div className="px-4 py-6 sm:px-0">
          {/* Success/Error Messages */}
          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md">
              <i className="fas fa-check-circle mr-2"></i>
              Profile updated successfully!
            </div>
          )}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
              <i className="fas fa-exclamation-circle mr-2"></i>
              {error}
            </div>
          )}
          
          {/* Profile Header */}
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="px-6 py-8">
              <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
                <div className="relative">
                  <Image
                    src={user.avatar}
                    alt="Profile Picture"
                    width={120}
                    height={120}
                    className="rounded-full object-cover"
                  />
                  {editing && (
                    <button className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-2 hover:bg-primary-dark transition-colors">
                      <i className="fas fa-camera text-sm"></i>
                    </button>
                  )}
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
                  <p className="text-gray-600">{user.position} at {user.organization}</p>
                  <p className="text-gray-500 text-sm mt-1">
                    <i className="fas fa-map-marker-alt mr-1"></i>
                    {user.location}
                  </p>
                  <p className="text-gray-500 text-sm">
                    <i className="fas fa-calendar mr-1"></i>
                    Member since {user.joinDate}
                  </p>
                  <div className="mt-4">
                    {!editing ? (
                      <button
                        onClick={() => setEditing(true)}
                        className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors"
                      >
                        <i className="fas fa-edit mr-2"></i>
                        Edit Profile
                      </button>
                    ) : (
                      <div className="space-x-3">
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {saving ? (
                            <>
                              <i className="fas fa-spinner fa-spin mr-2"></i>
                              Saving...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-save mr-2"></i>
                              Save Changes
                            </>
                          )}
                        </button>
                        <button
                          onClick={handleCancel}
                          disabled={saving}
                          className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Personal Information */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  {editing ? (
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    />
                  ) : (
                    <p className="text-gray-900">{user.name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  {editing ? (
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    />
                  ) : (
                    <p className="text-gray-900">{user.email}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  {editing ? (
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    />
                  ) : (
                    <p className="text-gray-900">{user.phone}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  {editing ? (
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    />
                  ) : (
                    <p className="text-gray-900">{user.location}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Professional Information</h3>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
                  {editing ? (
                    <input
                      type="text"
                      name="organization"
                      value={formData.organization}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    />
                  ) : (
                    <p className="text-gray-900">{user.organization}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                  {editing ? (
                    <input
                      type="text"
                      name="position"
                      value={formData.position}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    />
                  ) : (
                    <p className="text-gray-900">{user.position}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                  {editing ? (
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    />
                  ) : (
                    <p className="text-gray-900">{user.bio}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Interests */}
          <div className="mt-6 bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Areas of Interest</h3>
            </div>
            <div className="px-6 py-4">
              <div className="flex flex-wrap gap-2">
                {user.interests.map((interest, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-light text-primary-dark"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Account Settings */}
          <div className="mt-6 bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Account Settings</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Email Notifications</h4>
                  <p className="text-sm text-gray-500">Receive notifications about events and updates</p>
                </div>
                <button className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-primary transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                  <span className="translate-x-5 inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">SMS Notifications</h4>
                  <p className="text-sm text-gray-500">Receive SMS reminders for upcoming events</p>
                </div>
                <button className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-gray-200 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                  <span className="translate-x-0 inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
                </button>
              </div>
              <div className="pt-4 border-t border-gray-200">
                <button className="text-red-600 hover:text-red-700 text-sm font-medium">
                  <i className="fas fa-trash-alt mr-2"></i>
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function UserProfile() {
  return (
    <AuthGuard requireAuth={true}>
      <UserProfileContent />
    </AuthGuard>
  );
}


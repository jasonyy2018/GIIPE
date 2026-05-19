'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function UserProfile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [user, setUser] = useState({
    name: 'Jane Cooper',
    email: 'jane@example.com',
    phone: '+1 (555) 123-4567',
    organization: 'Tech Innovation Corp',
    position: 'IP Manager',
    location: 'New York, USA',
    bio: 'Experienced intellectual property professional with over 8 years in patent strategy and innovation management.',
    avatar: '/images/features/innovation.jpg',
    interests: ['Patent Strategy', 'Innovation Management', 'IP Policy', 'Technology Transfer'],
    joinDate: 'March 2022'
  });

  const [formData, setFormData] = useState(user);

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = () => {
      const authToken = localStorage.getItem('authToken');
      const userData = localStorage.getItem('user');
      
      if (!authToken || !userData) {
        router.push('/login');
        return;
      }
      
      try {
        const parsedUser = JSON.parse(userData);
        const userProfile = {
          ...user,
          name: parsedUser.name || user.name,
          email: parsedUser.email || user.email
        };
        setUser(userProfile);
        setFormData(userProfile);
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
      
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = () => {
    setUser(formData);
    setEditing(false);
    // Here you would typically save to backend
    console.log('Saving user data:', formData);
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
              <h1 className="text-2xl font-bold text-primary-dark">My Profile</h1>
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
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
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
                          className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors"
                        >
                          <i className="fas fa-save mr-2"></i>
                          Save Changes
                        </button>
                        <button
                          onClick={handleCancel}
                          className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors"
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
      </main>
    </div>
  );
}
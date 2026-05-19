'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import PublicLayout from '@/components/public/PublicLayout';
import { useAuth } from '@/contexts/AuthContext';
import { publicAPI } from '@/lib/public-api';

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>}>
      <ChangePasswordContent />
    </Suspense>
  );
}

function ChangePasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const isRequired = searchParams.get('required') === 'true';
  
  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isAuthenticated && !isRequired) {
      router.push('/login');
    }
  }, [isAuthenticated, isRequired, router]);

  const validateForm = () => {
    setError(null);
    
    if (!isRequired && !formData.currentPassword) {
      setError('Current password is required');
      return false;
    }
    
    if (!formData.newPassword) {
      setError('New password is required');
      return false;
    }
    
    if (formData.newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return false;
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const payload: any = {
        newPassword: formData.newPassword,
      };

      // Only include current password if not required (forced change)
      if (!isRequired && formData.currentPassword) {
        payload.currentPassword = formData.currentPassword;
      }

      const endpoint = isRequired 
        ? '/api/users/force-change-password'
        : '/api/users/change-password';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to change password' }));
        throw new Error(errorData.message || 'Failed to change password');
      }

      setSuccess(true);
      
      // Update user data to clear mustChangePassword flag
      try {
        const currentUser = await publicAPI.getCurrentUser();
        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(currentUser));
        }
      } catch (err) {
        console.error('Failed to update user data:', err);
      }

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err: any) {
      console.error('Change password error:', err);
      setError(err.message || 'Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated && !isRequired) {
    return null;
  }

  return (
    <PublicLayout>
      <div className="min-h-screen bg-gradient-to-br from-light/30 to-white flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className={`p-8 text-center ${isRequired ? 'bg-yellow-500' : 'bg-primary'} text-white`}>
            <h1 className="text-2xl font-bold">
              {isRequired ? 'Password Change Required' : 'Change Password'}
            </h1>
            <p className="mt-2 opacity-90">
              {isRequired 
                ? 'You must change your password before continuing' 
                : 'Update your account password'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                <span className="text-sm text-red-600">{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-sm text-green-600">
                  Password changed successfully! Redirecting...
                </span>
              </div>
            )}

            {!isRequired && (
              <div className="mb-5">
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Current Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-500">
                    <Lock className="h-5 w-5" />
                  </span>
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    id="currentPassword"
                    className="w-full px-4 py-3 pl-10 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={formData.currentPassword}
                    onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                    required={!isRequired}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-gray-700"
                  >
                    {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            )}

            <div className="mb-5">
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-500">
                  <Lock className="h-5 w-5" />
                </span>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  id="newPassword"
                  className="w-full px-4 py-3 pl-10 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-gray-700"
                >
                  {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Must be at least 6 characters long</p>
            </div>

            <div className="mb-6">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-500">
                  <Lock className="h-5 w-5" />
                </span>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  className="w-full px-4 py-3 pl-10 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || success}
              style={{ backgroundColor: '#1B5E20' }}
              className="w-full py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0B4D3E'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1B5E20'}
            >
              {loading ? 'Changing Password...' : success ? 'Password Changed!' : 'Change Password'}
            </button>

            {!isRequired && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </PublicLayout>
  );
}


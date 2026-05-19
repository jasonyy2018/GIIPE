'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface AdminGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function AdminGuard({ children, fallback }: AdminGuardProps) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    // Wait for AuthContext to finish loading
    if (loading) {
      return;
    }

    // Check if user is authenticated
    if (!user) {
      console.log('[AdminGuard] No user found, redirecting to login');
      router.push('/login');
      setIsAuthorized(false);
      return;
    }

    // Debug: log user data
    console.log('[AdminGuard] User data:', { 
      email: user.email, 
      role: user.role, 
      isActive: user.isActive 
    });

    // Check if user is admin (case-insensitive check for robustness)
    const userRole = user.role?.toUpperCase();
    if (userRole !== 'ADMIN') {
      console.log('[AdminGuard] User is not admin, role:', userRole);
      router.push('/dashboard');
      setIsAuthorized(false);
      return;
    }

    // User is authenticated and is admin
    console.log('[AdminGuard] Admin access granted');
    setIsAuthorized(true);
  }, [user, loading, router]);

  // Show loading while AuthContext is checking or authorization is being determined
  if (loading || isAuthorized === null) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Verifying admin access...</p>
          </div>
        </div>
      )
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-exclamation-triangle text-2xl text-red-600"></i>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">You don't have permission to access this area.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary-dark transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
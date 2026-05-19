'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/public';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
  allowedRoles?: string[];
}

export default function AuthGuard({ 
  children, 
  requireAuth = true, 
  redirectTo = '/login',
  allowedRoles = []
}: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    if (!loading && !hasRedirected) {
      // Check authentication requirement
      if (requireAuth && !user) {
        setHasRedirected(true);
        router.replace(redirectTo);
        return;
      }

      // Check role permissions
      if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
        setHasRedirected(true);
        // Redirect to appropriate dashboard based on role
        if (user.role === UserRole.ADMIN) {
          router.replace('/admin');
        } else {
          router.replace('/dashboard');
        }
        return;
      }
    }
  }, [user, loading, requireAuth, redirectTo, allowedRoles, router, hasRedirected]);

  // Show loading while AuthContext is checking
  if (loading) {
    return null; // Refetch data to ensure synchronization
  }

  // If redirecting, don't render anything
  if (hasRedirected) {
    return null;
  }

  // Check authentication requirement (sync check)
  if (requireAuth && !user) {
    return null;
  }

  // Check role permissions (sync check)
  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    return null;
  }

  // If we reach here, auth check passed
  return <>{children}</>;
}
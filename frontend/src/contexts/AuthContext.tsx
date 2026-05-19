'use client'

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, AuthResponse, LoginDto, RegisterDto } from '@/types/public';
import { publicAPI } from '@/lib/public-api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginDto) => Promise<AuthResponse>;
  register: (userData: RegisterDto) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (profileData: Partial<User>) => Promise<User>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Use async function inside useEffect
    const initAuth = async () => {
      await checkAuthStatus();
    };
    initAuth();
  }, []);

  const checkAuthStatus = async () => {
    // Only check localStorage on client side
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      const userData = localStorage.getItem('user');
      
      // First, set user from localStorage if available (for instant UI render)
      if (userData) {
        try {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
        } catch (error) {
          console.error('Error parsing user data:', error);
          localStorage.removeItem('user');
        }
      }
      
      // If we have both token and user data, verify token is still valid in background
      if (token && userData) {
        try {
          // Try to verify token by fetching current user (background validation)
          const currentUser = await publicAPI.getCurrentUser();
          // If successful, use the fresh user data
          setUser(currentUser);
          // Update localStorage with fresh data
          localStorage.setItem('user', JSON.stringify(currentUser));
        } catch (error: any) {
          // Try to refresh token on 401 before logging out
          if (error?.status === 401) {
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
              try {
                const refreshRes = await fetch('/api/auth/refresh', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ refreshToken }),
                });
                if (refreshRes.ok) {
                  const refreshData = await refreshRes.json();
                  localStorage.setItem('authToken', refreshData.accessToken);
                  if (refreshData.refreshToken) {
                    localStorage.setItem('refreshToken', refreshData.refreshToken);
                  }
                  // Retry fetching current user with new token
                  const currentUser = await publicAPI.getCurrentUser();
                  setUser(currentUser);
                  localStorage.setItem('user', JSON.stringify(currentUser));
                  setLoading(false);
                  return; // skip the rest of error handling
                }
              } catch {
                // Refresh failed — fall through to logout
              }
            }
          }

          // Only clear auth data if it's a real authentication error (401, 403)
          // Don't clear on network errors or other issues to avoid false logouts
          const isAuthError = error?.status === 401 || error?.status === 403;
          const isNetworkError = error?.message?.includes('fetch') || 
                                 error?.message?.includes('network') ||
                                 error?.message?.includes('Failed to fetch');
          
          if (isAuthError) {
            // Real authentication error - token is invalid or expired
            console.error('Token validation failed (auth error):', error);
          localStorage.removeItem('user');
          localStorage.removeItem('authToken');
          localStorage.removeItem('refreshToken');
          setUser(null);
          } else if (!isNetworkError) {
            // Other errors (not network) - might be server issues, but keep user logged in
            console.warn('Token validation failed (non-auth error), keeping user logged in:', error);
            // Keep user data from localStorage, don't clear
          } else {
            // Network error - keep user logged in, just log the warning
            console.warn('Network error during token validation, keeping user logged in:', error);
            // Keep user data from localStorage, don't clear
          }
        }
      } else {
        // No token or user data, ensure clean state
        setUser(null);
        if (token) {
          // Token exists but no user data, clear token too
          localStorage.removeItem('authToken');
          localStorage.removeItem('refreshToken');
        }
        if (userData && !token) {
          // User data exists but no token, clear user data
          localStorage.removeItem('user');
          setUser(null);
        }
      }
    }
    setLoading(false);
  };

  const login = async (credentials: LoginDto): Promise<AuthResponse> => {
    const response: AuthResponse = await publicAPI.login(credentials);
    
    // Update user with mustChangePassword flag if present
    const userWithFlag = {
      ...response.user,
      mustChangePassword: response.mustChangePassword || response.user?.mustChangePassword
    };
    
    // Set user state immediately
    setUser(userWithFlag);
    
    // Store user data in localStorage for persistence
    if (typeof window !== 'undefined' && userWithFlag) {
      localStorage.setItem('user', JSON.stringify(userWithFlag));
    }
    
    return {
      ...response,
      user: userWithFlag,
      mustChangePassword: response.mustChangePassword || response.user?.mustChangePassword
    };
  };

  const register = async (userData: RegisterDto) => {
    try {
      const response: AuthResponse = await publicAPI.register(userData);
      setUser(response.user);
      
      // Store user data in localStorage for dashboard access
      if (typeof window !== 'undefined' && response.user) {
        localStorage.setItem('user', JSON.stringify(response.user));
      }
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await publicAPI.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      // Always clear user state and localStorage, even if API call fails
      setUser(null);
      // Clear all auth-related data from localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user');
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
      }
    }
  };

  const updateProfile = async (profileData: Partial<User>) => {
    try {
      const updatedUser = await publicAPI.updateProfile(profileData);
      setUser(updatedUser);
      
      // Update localStorage with new user data
      if (typeof window !== 'undefined' && updatedUser) {
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
      
      return updatedUser;
    } catch (error) {
      console.error('Profile update failed:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
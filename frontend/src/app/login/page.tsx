'use client'

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import PublicLayout from '@/components/public/PublicLayout';
import { useAuth } from '@/contexts/AuthContext';
import { LoginDto } from '@/types/public';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState<LoginDto>({
    email: '',
    password: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 8;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Real-time validation
    if (name === 'email' && value) {
      if (!validateEmail(value)) {
        setEmailError('Please enter a valid email address');
      } else {
        setEmailError(null);
      }
    }
    
    if (name === 'password' && value) {
      if (!validatePassword(value)) {
        setPasswordError('Password must be at least 8 characters');
      } else {
        setPasswordError(null);
      }
    }
    
    // Clear general error when user starts typing
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let isValid = true;

    // Validate email
    if (!validateEmail(formData.email)) {
      setEmailError('Please enter a valid email address');
      isValid = false;
    }

    // Validate password
    if (!validatePassword(formData.password)) {
      setPasswordError('Password must be at least 8 characters');
      isValid = false;
    }

    if (!isValid) {
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await login(formData);
      
      // Check if user must change password
      if (response.mustChangePassword || response.user?.mustChangePassword) {
        // Redirect to force password change page
        router.push('/change-password?required=true');
        return;
      }
      
      // Redirect based on user role or redirect parameter
      const redirectParam = searchParams.get('redirect');
      let redirectUrl = redirectParam;
      
      if (!redirectUrl) {
        // Admin users go to admin dashboard, others go to user dashboard
        redirectUrl = response.user?.role === 'ADMIN' ? '/admin' : '/dashboard';
      }
      
      router.push(redirectUrl);
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.message.includes('Failed to fetch')) {
        setError('Unable to connect to server. Please check your connection and try again.');
      } else {
        setError(err.message || 'Invalid email or password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="min-h-screen bg-gradient-to-br from-light/30 to-white flex items-center justify-center p-4">
        {/* Login Card */}
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl">
          {/* Brand Header */}
          <div className="p-8 text-center bg-primary text-white">
            {/* Logo removed */}
            <h1 className="text-2xl font-bold">Welcome Back</h1>
            <p className="mt-2 opacity-90">Sign in to your GIIP account</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="p-8">
            {/* Email Field */}
            <div className="mb-5">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-500">
                  <Mail className="h-5 w-5" />
                </span>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className={`w-full px-4 py-3 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300 ${
                    emailError ? 'border-accent focus:ring-accent/50 focus:border-accent' : 'border-gray-300'
                  }`}
                  placeholder="you@example.com"
                  required
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              {emailError && (
                <div className="text-accent text-xs mt-1 flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  <span>{emailError}</span>
                </div>
              )}
            </div>

            {/* Password Field */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <Link href="/forgot-password" className="text-sm text-primary hover:text-primary-dark transition-colors font-medium">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-500">
                  <Lock className="h-5 w-5" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  className={`w-full px-4 py-3 pl-10 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300 ${
                    passwordError ? 'border-accent focus:ring-accent/50 focus:border-accent' : 'border-gray-300'
                  }`}
                  placeholder="Enter your password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {passwordError && (
                <div className="text-accent text-xs mt-1 flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  <span>{passwordError}</span>
                </div>
              )}
            </div>

            {/* Remember Me */}
            <div className="flex items-center mb-6">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                Remember me for 30 days
              </label>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-primary text-white font-medium py-3 px-4 rounded-lg hover:bg-primary-dark transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-lg mb-6 ${
                loading ? 'bg-primary/80 cursor-not-allowed' : ''
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>


            {/* Error Message */}
            {error && (
              <div className="mt-4 text-sm text-accent flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                <span>{error}</span>
              </div>
            )}
          </form>
        </div>

        {/* Footer removed */}
      </div>
    </PublicLayout>
  );
}
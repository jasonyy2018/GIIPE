'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, User, Building, AlertCircle, CheckCircle, Phone, ArrowRight, ArrowLeft, UserPlus, Loader2 } from 'lucide-react';
import PublicLayout from '@/components/public/PublicLayout';
import { useAuth } from '@/contexts/AuthContext';
import { RegisterDto } from '@/types/public';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  
  const [formData, setFormData] = useState<RegisterDto>({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    organization: '',
    phone: '',
  });
  
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [termsAccepted, setTermsAccepted] = useState(false);
  
  // Individual field errors
  const [fieldErrors, setFieldErrors] = useState({
    firstName: '',
    lastName: '',
    username: '',
    usernameTaken: '',
    organization: '',
    phone: '',
    email: '',
    emailTaken: '',
    password: '',
    confirmPassword: '',
    terms: ''
  });

  // Validation functions
  const validateName = (name: string) => name.trim().length > 0;
  
  const validateUsername = (username: string) => {
    const re = /^[a-zA-Z0-9_]{3,20}$/;
    return re.test(username);
  };
  
  const validateOrganization = (org: string) => {
    return org.trim().length === 0 || org.trim().length >= 2;
  };
  
  const validatePhone = (phone: string) => {
    const re = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,4}[-\s.]?[0-9]{1,9}$/;
    return re.test(phone);
  };
  
  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };
  
  const validatePassword = (password: string) => {
    return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
  };

  const checkPasswordStrength = (password: string) => {
    if (password.length < 6) return 0;
    if (password.length < 8) return 25;
    if (!/[A-Z]/.test(password) || !/[!@#$%^&*]/.test(password)) return 50;
    return 100;
  };

  const getStrengthColor = (strength: number) => {
    if (strength === 0) return 'bg-gray-300';
    if (strength < 50) return 'bg-accent';
    if (strength < 100) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength === 0) return 'Very Weak';
    if (passwordStrength < 50) return 'Weak';
    if (passwordStrength < 100) return 'Good';
    return 'Strong';
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength === 0) return 'bg-gray-300';
    if (passwordStrength < 50) return 'bg-accent';
    if (passwordStrength < 100) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Real-time validation
    const newErrors = { ...fieldErrors };
    
    switch (name) {
      case 'firstName':
        newErrors.firstName = value && !validateName(value) ? 'Please enter your first name' : '';
        break;
      case 'lastName':
        newErrors.lastName = value && !validateName(value) ? 'Please enter your last name' : '';
        break;
      case 'username':
        newErrors.username = value && !validateUsername(value) ? 'Username must be 3-20 characters with letters, numbers, or underscores' : '';
        newErrors.usernameTaken = ''; // Clear username taken error when user types
        break;
      case 'organization':
        newErrors.organization = value && !validateOrganization(value) ? 'Please enter a valid organization name' : '';
        break;
      case 'phone':
        newErrors.phone = value && !validatePhone(value) ? 'Please enter a valid phone number' : '';
        break;
      case 'email':
        newErrors.email = value && !validateEmail(value) ? 'Please enter a valid email address' : '';
        newErrors.emailTaken = ''; // Clear email taken error when user types
        break;
      case 'password':
        setPasswordStrength(checkPasswordStrength(value));
        newErrors.password = value && !validatePassword(value) ? 'Password must meet requirements' : '';
        // Re-validate confirm password if it has value
        if (confirmPassword) {
          newErrors.confirmPassword = value !== confirmPassword ? 'Passwords do not match' : '';
        }
        break;
    }
    
    setFieldErrors(newErrors);
    
    // Clear general error when user starts typing
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setConfirmPassword(value);
    
    const newErrors = { ...fieldErrors };
    newErrors.confirmPassword = value && formData.password !== value ? 'Passwords do not match' : '';
    setFieldErrors(newErrors);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let isValid = true;
    const newErrors = { ...fieldErrors };

    // Reset messages
    setError(null);
    setSuccess(null);

    // Validate all fields
    if (!validateName(formData.firstName || '')) {
      newErrors.firstName = 'Please enter your first name';
      isValid = false;
    }

    if (!validateName(formData.lastName || '')) {
      newErrors.lastName = 'Please enter your last name';
      isValid = false;
    }

    if (!validateUsername(formData.username)) {
      newErrors.username = 'Username must be 3-20 characters with letters, numbers, or underscores';
      isValid = false;
    }

    if (formData.organization && !validateOrganization(formData.organization)) {
      newErrors.organization = 'Please enter a valid organization name';
      isValid = false;
    }

    if (!validatePhone(formData.phone || '')) {
      newErrors.phone = 'Please enter a valid phone number';
      isValid = false;
    }

    if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
      isValid = false;
    }

    if (!validatePassword(formData.password)) {
      newErrors.password = 'Password must meet requirements';
      isValid = false;
    }

    if (formData.password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    if (!termsAccepted) {
      newErrors.terms = 'Please agree to the terms to continue';
      isValid = false;
    }

    setFieldErrors(newErrors);

    if (!isValid) return;

    setLoading(true);

    try {
      // Only send fields that the backend expects
      const registerData = {
        email: formData.email,
        username: formData.username,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        organization: formData.organization,
        phone: formData.phone
      };
      await register(registerData);
      
      // Show success message and redirect after a short delay
      setSuccess('Account created successfully! Redirecting...');
      
      // Use setTimeout to allow the registration to complete and localStorage to be updated
      setTimeout(() => {
        // Get user data from localStorage to check role and redirect
        const userData = localStorage.getItem('user');
        if (userData) {
          try {
            const user = JSON.parse(userData);
            // Redirect based on user role
            if (user.role === 'ADMIN') {
              router.push('/admin');
            } else {
              router.push('/dashboard');
            }
          } catch (error) {
            console.error('Error parsing user data:', error);
            router.push('/dashboard');
          }
        } else {
          // Fallback to dashboard if no user data
          router.push('/dashboard');
        }
      }, 1000);
    } catch (err: any) {
      const errorMessage = err.message || 'Something went wrong. Please try again later.';
      
      // Handle specific error cases
      if (errorMessage.includes('username') && errorMessage.includes('taken')) {
        const newErrors = { ...fieldErrors };
        newErrors.usernameTaken = 'This username is already taken';
        setFieldErrors(newErrors);
      } else if (errorMessage.includes('email') && errorMessage.includes('registered')) {
        const newErrors = { ...fieldErrors };
        newErrors.emailTaken = 'This email is already registered';
        setFieldErrors(newErrors);
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="min-h-screen bg-gradient-to-br from-light/30 to-white flex items-center justify-center p-4">
        {/* Register Card */}
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl">
          {/* Brand Header */}
          <div className="p-8 text-center bg-primary text-white">
            {/* Logo removed */}
            <h1 className="text-2xl font-bold">Create Account</h1>
            <p className="mt-2 opacity-90">Join GIIP to access exclusive services</p>
          </div>

          {/* Register Form */}
          <form onSubmit={handleSubmit} className="p-8">
            {/* Name Fields (First and Last) */}
            <div className="flex flex-col md:flex-row gap-4 mb-5">
              <div className="flex-1">
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-500">
                    <User className="h-5 w-5" />
                  </span>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    className={`w-full px-4 py-3 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300 ${
                      fieldErrors.firstName ? 'border-accent focus:ring-accent/50 focus:border-accent' : 'border-gray-300'
                    }`}
                    placeholder="John"
                    required
                    value={formData.firstName}
                    onChange={handleChange}
                  />
                </div>
                {fieldErrors.firstName && (
                  <div className="text-accent text-xs mt-1 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    <span>{fieldErrors.firstName}</span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-500">
                    <User className="h-5 w-5" />
                  </span>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    className={`w-full px-4 py-3 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300 ${
                      fieldErrors.lastName ? 'border-accent focus:ring-accent/50 focus:border-accent' : 'border-gray-300'
                    }`}
                    placeholder="Doe"
                    required
                    value={formData.lastName}
                    onChange={handleChange}
                  />
                </div>
                {fieldErrors.lastName && (
                  <div className="text-accent text-xs mt-1 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    <span>{fieldErrors.lastName}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Username Field */}
            <div className="mb-5">
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-500">
                  <User className="h-5 w-5" />
                </span>
                <input
                  type="text"
                  id="username"
                  name="username"
                  className={`w-full px-4 py-3 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300 ${
                    fieldErrors.username || fieldErrors.usernameTaken ? 'border-accent focus:ring-accent/50 focus:border-accent' : 'border-gray-300'
                  }`}
                  placeholder="your_username"
                  required
                  value={formData.username}
                  onChange={handleChange}
                />
              </div>
              <div className="text-xs text-gray-500 mt-1">
                3-20 characters (letters, numbers, and underscores only)
              </div>
              {fieldErrors.username && (
                <div className="text-accent text-xs mt-1 flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  <span>{fieldErrors.username}</span>
                </div>
              )}
              {fieldErrors.usernameTaken && (
                <div className="text-accent text-xs mt-1 flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  <span>{fieldErrors.usernameTaken}</span>
                </div>
              )}
            </div>

            {/* Organization */}
            <div className="mb-5">
              <label htmlFor="organization" className="block text-sm font-medium text-gray-700 mb-1">
                Organization
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-500">
                  <Building className="h-5 w-5" />
                </span>
                <input
                  type="text"
                  id="organization"
                  name="organization"
                  className={`w-full px-4 py-3 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300 ${
                    fieldErrors.organization ? 'border-accent focus:ring-accent/50 focus:border-accent' : 'border-gray-300'
                  }`}
                  placeholder="Your company or organization"
                  value={formData.organization}
                  onChange={handleChange}
                />
              </div>
              {fieldErrors.organization && (
                <div className="text-accent text-xs mt-1 flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  <span>{fieldErrors.organization}</span>
                </div>
              )}
            </div>

            {/* Phone Number */}
            <div className="mb-5">
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-500">
                  <Phone className="h-5 w-5" />
                </span>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  className={`w-full px-4 py-3 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300 ${
                    fieldErrors.phone ? 'border-accent focus:ring-accent/50 focus:border-accent' : 'border-gray-300'
                  }`}
                  placeholder="+1 (555) 123-4567"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
              {fieldErrors.phone && (
                <div className="text-accent text-xs mt-1 flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  <span>{fieldErrors.phone}</span>
                </div>
              )}
            </div>

            {/* Email */}
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
                    fieldErrors.email || fieldErrors.emailTaken ? 'border-accent focus:ring-accent/50 focus:border-accent' : 'border-gray-300'
                  }`}
                  placeholder="you@example.com"
                  required
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              {fieldErrors.email && (
                <div className="text-accent text-xs mt-1 flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  <span>{fieldErrors.email}</span>
                </div>
              )}
              {fieldErrors.emailTaken && (
                <div className="text-accent text-xs mt-1 flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  <span>{fieldErrors.emailTaken}</span>
                </div>
              )}
            </div>

            {/* Password Field */}
            <div className="mb-5">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Create Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-500">
                  <Lock className="h-5 w-5" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  className={`w-full px-4 py-3 pl-10 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300 ${
                    fieldErrors.password ? 'border-accent focus:ring-accent/50 focus:border-accent' : 'border-gray-300'
                  }`}
                  placeholder="Create a strong password"
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

              {/* Password Strength Indicator */}
              <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden mt-1">
                <div 
                  className={`h-full transition-all duration-300 ${getStrengthColor(passwordStrength)}`}
                  style={{ width: `${passwordStrength}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                At least 8 characters with letters and numbers
              </div>
              {fieldErrors.password && (
                <div className="text-accent text-xs mt-1 flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  <span>{fieldErrors.password}</span>
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="mb-5">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-500">
                  <Lock className="h-5 w-5" />
                </span>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  className={`w-full px-4 py-3 pl-10 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300 ${
                    fieldErrors.confirmPassword ? 'border-accent focus:ring-accent/50 focus:border-accent' : 'border-gray-300'
                  }`}
                  placeholder="Confirm your password"
                  required
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    const newErrors = { ...fieldErrors };
                    newErrors.confirmPassword = e.target.value && formData.password !== e.target.value ? 'Passwords do not match' : '';
                    setFieldErrors(newErrors);
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-primary transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <div className="text-accent text-xs mt-1 flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  <span>{fieldErrors.confirmPassword}</span>
                </div>
              )}
              {confirmPassword && formData.password === confirmPassword && !fieldErrors.confirmPassword && (
                <div className="text-green-600 text-xs mt-1 flex items-center">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  <span>Passwords match</span>
                </div>
              )}
            </div>

            {/* Terms Agreement */}
            <div className="flex items-start mb-6">
              <input
                id="terms-agree"
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => {
                  setTermsAccepted(e.target.checked);
                  const newErrors = { ...fieldErrors };
                  newErrors.terms = !e.target.checked ? 'Please agree to the terms to continue' : '';
                  setFieldErrors(newErrors);
                }}
                className="h-4 w-4 mt-1 text-primary focus:ring-primary border-gray-300 rounded"
                required
              />
              <label htmlFor="terms-agree" className="ml-2 block text-sm text-gray-700">
                I agree to the{' '}
                <Link href="/terms" className="hidden">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="hidden">
                  Privacy Policy
                </Link>
              </label>
            </div>
            {fieldErrors.terms && (
              <div className="text-accent text-xs mb-6 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                <span>{fieldErrors.terms}</span>
              </div>
            )}

            {/* Form Buttons */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-primary text-white font-medium py-3 px-4 rounded-lg hover:bg-primary-dark transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-lg mb-4 ${
                loading ? 'bg-primary/80 cursor-not-allowed' : ''
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <UserPlus className="h-5 w-5" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => router.push('/login')}
              className="w-full border border-primary text-primary font-medium py-3 px-4 rounded-lg hover:bg-primary hover:text-white transition-all duration-300 flex items-center justify-center gap-2"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Cancel</span>
            </button>


            {/* Success/Error Messages */}
            {success && (
              <div className="mt-4 text-sm text-green-600 flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                <span>{success}</span>
              </div>
            )}
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
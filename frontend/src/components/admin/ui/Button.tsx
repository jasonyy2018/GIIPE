'use client';

import { forwardRef, ButtonHTMLAttributes } from 'react';
import { useReducedMotion } from '../AccessibilityUtils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  loadingText?: string;
  icon?: string;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  loading = false,
  loadingText,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  children,
  className = '',
  disabled,
  ...props
}, ref) => {
  const prefersReducedMotion = useReducedMotion();

  const baseClasses = `
    inline-flex items-center justify-center font-medium rounded-lg
    focus:outline-none focus:ring-2 focus:ring-offset-2
    transition-all duration-200 ease-in-out
    disabled:opacity-50 disabled:cursor-not-allowed
    ${prefersReducedMotion ? '' : 'transform hover:scale-105 active:scale-95'}
    ${fullWidth ? 'w-full' : ''}
  `;

  const variantClasses = {
    primary: 'bg-primary text-white hover:bg-primary-dark focus:ring-primary border border-transparent',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500 border border-gray-300',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 border border-transparent',
    warning: 'bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500 border border-transparent',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 border border-transparent',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500 border border-transparent'
  };

  const sizeClasses = {
    xs: 'px-2.5 py-1.5 text-xs',
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-4 py-2 text-base',
    xl: 'px-6 py-3 text-base'
  };

  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <>
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {loadingText || 'Loading...'}
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <i className={`${icon} ${children ? 'mr-2' : ''}`} aria-hidden="true" />
          )}
          {children}
          {icon && iconPosition === 'right' && (
            <i className={`${icon} ${children ? 'ml-2' : ''}`} aria-hidden="true" />
          )}
        </>
      )}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
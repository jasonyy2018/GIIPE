'use client';

import { forwardRef, InputHTMLAttributes, useState } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconClick?: () => void;
  variant?: 'default' | 'filled' | 'outlined';
  fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  onRightIconClick,
  variant = 'default',
  fullWidth = false,
  className = '',
  id,
  type = 'text',
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const isPassword = type === 'password';
  const actualType = isPassword && showPassword ? 'text' : type;

  const baseClasses = `
    block w-full px-3 py-2 text-sm
    transition-all duration-200 ease-in-out
    focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50
    disabled:opacity-50 disabled:cursor-not-allowed
    ${fullWidth ? 'w-full' : ''}
  `;

  const variantClasses = {
    default: `
      border border-gray-300 rounded-lg
      focus:border-primary
      ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
    `,
    filled: `
      bg-gray-100 border border-transparent rounded-lg
      focus:bg-white focus:border-primary
      ${error ? 'bg-red-50 border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
    `,
    outlined: `
      border-2 border-gray-300 rounded-lg bg-transparent
      focus:border-primary
      ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
    `
  };

  const paddingClasses = `
    ${leftIcon ? 'pl-10' : 'pl-3'}
    ${rightIcon || isPassword ? 'pr-10' : 'pr-3'}
  `;

  const handleRightIconClick = () => {
    if (isPassword) {
      setShowPassword(!showPassword);
    } else if (onRightIconClick) {
      onRightIconClick();
    }
  };

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <label
          htmlFor={inputId}
          className={`block text-sm font-medium mb-2 transition-colors duration-200 ${
            error ? 'text-red-700' : isFocused ? 'text-primary' : 'text-gray-700'
          }`}
        >
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <i className={`${leftIcon} text-gray-400`} aria-hidden="true" />
          </div>
        )}
        
        <input
          ref={ref}
          id={inputId}
          type={actualType}
          className={`${baseClasses} ${variantClasses[variant]} ${paddingClasses} ${className}`}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
          }
          {...props}
        />
        
        {(rightIcon || isPassword) && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <button
              type="button"
              onClick={handleRightIconClick}
              className={`text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 transition-colors duration-200 ${
                !isPassword && !onRightIconClick ? 'cursor-default' : 'cursor-pointer'
              }`}
              disabled={!isPassword && !onRightIconClick}
              aria-label={isPassword ? (showPassword ? 'Hide password' : 'Show password') : undefined}
            >
              <i 
                className={
                  isPassword 
                    ? (showPassword ? 'fas fa-eye-slash' : 'fas fa-eye')
                    : rightIcon || 'fas fa-info-circle'
                } 
                aria-hidden="true" 
              />
            </button>
          </div>
        )}
      </div>
      
      {error && (
        <p id={`${inputId}-error`} className="mt-1 text-sm text-red-600" role="alert">
          <i className="fas fa-exclamation-circle mr-1" aria-hidden="true" />
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p id={`${inputId}-helper`} className="mt-1 text-sm text-gray-500">
          {helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
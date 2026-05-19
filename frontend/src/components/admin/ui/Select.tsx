'use client';

import { forwardRef, SelectHTMLAttributes, useState } from 'react';

interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
  variant?: 'default' | 'filled' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  error,
  helperText,
  options,
  placeholder,
  variant = 'default',
  size = 'md',
  fullWidth = false,
  className = '',
  id,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);

  const inputId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

  const baseClasses = `
    block w-full text-sm appearance-none cursor-pointer
    transition-all duration-200 ease-in-out
    focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50
    disabled:opacity-50 disabled:cursor-not-allowed
    ${fullWidth ? 'w-full' : ''}
  `;

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base'
  };

  const variantClasses = {
    default: `
      border border-gray-300 rounded-lg bg-white
      focus:border-primary
      ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
    `,
    filled: `
      bg-gray-100 border border-transparent rounded-lg
      focus:bg-white focus:border-primary
      ${error ? 'bg-red-50 border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
    `,
    outlined: `
      border-2 border-gray-300 rounded-lg bg-white
      focus:border-primary
      ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
    `
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
        <select
          ref={ref}
          id={inputId}
          className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className} pr-10`}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
          }
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        
        {/* Custom dropdown arrow */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <i className="fas fa-chevron-down text-gray-400" aria-hidden="true" />
        </div>
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

Select.displayName = 'Select';

export default Select;
'use client';

import { forwardRef, InputHTMLAttributes } from 'react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  description?: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'switch';
  indeterminate?: boolean;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({
  label,
  description,
  error,
  size = 'md',
  variant = 'default',
  indeterminate = false,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const labelSizeClasses = {
    sm: 'text-sm',
    md: 'text-sm',
    lg: 'text-base'
  };

  if (variant === 'switch') {
    return (
      <div className="flex items-center">
        <div className="relative">
          <input
            ref={ref}
            type="checkbox"
            id={inputId}
            className="sr-only"
            aria-describedby={error ? `${inputId}-error` : description ? `${inputId}-description` : undefined}
            {...props}
          />
          <div
            className={`
              block w-12 h-6 rounded-full transition-colors duration-200 ease-in-out cursor-pointer
              ${props.checked ? 'bg-primary' : 'bg-gray-300'}
              ${props.disabled ? 'opacity-50 cursor-not-allowed' : ''}
              ${error ? 'ring-2 ring-red-500' : ''}
            `}
            onClick={() => {
              if (!props.disabled && ref && 'current' in ref && ref.current) {
                ref.current.click();
              }
            }}
          >
            <div
              className={`
                absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ease-in-out
                ${props.checked ? 'transform translate-x-6' : ''}
              `}
            />
          </div>
        </div>
        
        {(label || description) && (
          <div className="ml-3">
            {label && (
              <label
                htmlFor={inputId}
                className={`font-medium cursor-pointer ${labelSizeClasses[size]} ${
                  error ? 'text-red-700' : 'text-gray-900'
                } ${props.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {label}
                {props.required && <span className="text-red-500 ml-1">*</span>}
              </label>
            )}
            {description && (
              <p id={`${inputId}-description`} className="text-sm text-gray-500">
                {description}
              </p>
            )}
          </div>
        )}
        
        {error && (
          <p id={`${inputId}-error`} className="mt-1 text-sm text-red-600" role="alert">
            <i className="fas fa-exclamation-circle mr-1" aria-hidden="true" />
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-start">
      <div className="flex items-center h-5">
        <input
          ref={ref}
          type="checkbox"
          id={inputId}
          className={`
            ${sizeClasses[size]} text-primary border-gray-300 rounded
            focus:ring-primary focus:ring-2 focus:ring-opacity-50
            transition-colors duration-200 ease-in-out
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
            ${className}
          `}
          aria-describedby={error ? `${inputId}-error` : description ? `${inputId}-description` : undefined}
          {...props}
        />
      </div>
      
      {(label || description) && (
        <div className="ml-3">
          {label && (
            <label
              htmlFor={inputId}
              className={`font-medium cursor-pointer ${labelSizeClasses[size]} ${
                error ? 'text-red-700' : 'text-gray-900'
              } ${props.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {label}
              {props.required && <span className="text-red-500 ml-1">*</span>}
            </label>
          )}
          {description && (
            <p id={`${inputId}-description`} className="text-sm text-gray-500">
              {description}
            </p>
          )}
        </div>
      )}
      
      {error && (
        <p id={`${inputId}-error`} className="mt-1 text-sm text-red-600" role="alert">
          <i className="fas fa-exclamation-circle mr-1" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
});

Checkbox.displayName = 'Checkbox';

export default Checkbox;
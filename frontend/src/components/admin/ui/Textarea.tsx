'use client';

import { forwardRef, TextareaHTMLAttributes, useState, useRef, useEffect } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  variant?: 'default' | 'filled' | 'outlined';
  autoResize?: boolean;
  maxHeight?: number;
  showCharCount?: boolean;
  maxLength?: number;
  fullWidth?: boolean;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label,
  error,
  helperText,
  variant = 'default',
  autoResize = false,
  maxHeight = 200,
  showCharCount = false,
  maxLength,
  fullWidth = false,
  className = '',
  id,
  value,
  onChange,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const internalRef = useRef<HTMLTextAreaElement | null>(null);

  const inputId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

  // Handle auto-resize
  useEffect(() => {
    if (autoResize && internalRef.current) {
      const textarea = internalRef.current;
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, maxHeight);
      textarea.style.height = `${newHeight}px`;
    }
  }, [value, autoResize, maxHeight]);

  // Update character count
  useEffect(() => {
    if (showCharCount && typeof value === 'string') {
      setCharCount(value.length);
    }
  }, [value, showCharCount]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (showCharCount) {
      setCharCount(e.target.value.length);
    }
    if (onChange) {
      onChange(e);
    }
  };

  const baseClasses = `
    block w-full px-3 py-2 text-sm resize-none
    transition-all duration-200 ease-in-out
    focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50
    disabled:opacity-50 disabled:cursor-not-allowed
    ${fullWidth ? 'w-full' : ''}
    ${autoResize ? 'overflow-hidden' : 'overflow-auto'}
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

  const isOverLimit = maxLength && charCount > maxLength;

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
      
      <textarea
        ref={(node) => {
          internalRef.current = node;
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
          }
        }}
        id={inputId}
        className={`${baseClasses} ${variantClasses[variant]} ${className}`}
        value={value}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={
          error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
        }
        maxLength={maxLength}
        style={autoResize ? { maxHeight: `${maxHeight}px` } : undefined}
        {...props}
      />
      
      {/* Character count and helper text row */}
      <div className="flex justify-between items-start mt-1">
        <div className="flex-1">
          {error && (
            <p id={`${inputId}-error`} className="text-sm text-red-600" role="alert">
              <i className="fas fa-exclamation-circle mr-1" aria-hidden="true" />
              {error}
            </p>
          )}
          
          {helperText && !error && (
            <p id={`${inputId}-helper`} className="text-sm text-gray-500">
              {helperText}
            </p>
          )}
        </div>
        
        {showCharCount && (
          <div className={`text-xs ml-2 ${
            isOverLimit ? 'text-red-600' : 'text-gray-500'
          }`}>
            {charCount}{maxLength && `/${maxLength}`}
          </div>
        )}
      </div>
    </div>
  );
});

Textarea.displayName = 'Textarea';

export default Textarea;
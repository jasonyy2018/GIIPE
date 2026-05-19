'use client';

import { createContext, useContext, useState, useEffect, FormHTMLAttributes, ReactNode } from 'react';
import Button from './Button';
import Input from './Input';
import Select from './Select';
import Textarea from './Textarea';
import Checkbox from './Checkbox';

// Form Context
interface FormContextType {
  values: Record<string, any>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  setValue: (name: string, value: any) => void;
  setError: (name: string, error: string) => void;
  setTouched: (name: string, touched: boolean) => void;
  validateField: (name: string, value: any) => string | null;
}

const FormContext = createContext<FormContextType | null>(null);

export const useFormContext = () => {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('Form components must be used within a Form component');
  }
  return context;
};

// Validation rules
export interface ValidationRule {
  required?: boolean | string;
  minLength?: number | { value: number; message: string };
  maxLength?: number | { value: number; message: string };
  min?: number | { value: number; message: string };
  max?: number | { value: number; message: string };
  pattern?: RegExp | { value: RegExp; message: string };
  email?: boolean | string;
  custom?: (value: any) => string | null;
}

// Form Props
interface FormProps extends Omit<FormHTMLAttributes<HTMLFormElement>, 'onSubmit'> {
  initialValues?: Record<string, any>;
  validationRules?: Record<string, ValidationRule>;
  onSubmit: (values: Record<string, any>) => Promise<void> | void;
  onValidationError?: (errors: Record<string, string>) => void;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  children: ReactNode;
}

// Main Form Component
export default function Form({
  initialValues = {},
  validationRules = {},
  onSubmit,
  onValidationError,
  validateOnChange = true,
  validateOnBlur = true,
  children,
  className = '',
  ...props
}: FormProps) {
  const [values, setValues] = useState<Record<string, any>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation function
  const validateField = (name: string, value: any): string | null => {
    const rules = validationRules[name];
    if (!rules) return null;

    // Required validation
    if (rules.required) {
      const isEmpty = value === null || value === undefined || value === '' || 
                     (Array.isArray(value) && value.length === 0);
      if (isEmpty) {
        return typeof rules.required === 'string' ? rules.required : `${name} is required`;
      }
    }

    // Skip other validations if value is empty and not required
    if (!value && !rules.required) return null;

    // String validations
    if (typeof value === 'string') {
      // Min length
      if (rules.minLength) {
        const minLength = typeof rules.minLength === 'number' ? rules.minLength : rules.minLength.value;
        const message = typeof rules.minLength === 'object' ? rules.minLength.message : 
                       `${name} must be at least ${minLength} characters`;
        if (value.length < minLength) return message;
      }

      // Max length
      if (rules.maxLength) {
        const maxLength = typeof rules.maxLength === 'number' ? rules.maxLength : rules.maxLength.value;
        const message = typeof rules.maxLength === 'object' ? rules.maxLength.message : 
                       `${name} must be no more than ${maxLength} characters`;
        if (value.length > maxLength) return message;
      }

      // Email validation
      if (rules.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return typeof rules.email === 'string' ? rules.email : 'Please enter a valid email address';
        }
      }

      // Pattern validation
      if (rules.pattern) {
        const pattern = 'value' in rules.pattern ? rules.pattern.value : rules.pattern;
        const message = 'message' in rules.pattern ? rules.pattern.message : 
                       `${name} format is invalid`;
        if (!pattern.test(value)) return message;
      }
    }

    // Number validations
    if (typeof value === 'number') {
      // Min value
      if (rules.min !== undefined) {
        const min = typeof rules.min === 'number' ? rules.min : rules.min.value;
        const message = typeof rules.min === 'object' ? rules.min.message : 
                       `${name} must be at least ${min}`;
        if (value < min) return message;
      }

      // Max value
      if (rules.max !== undefined) {
        const max = typeof rules.max === 'number' ? rules.max : rules.max.value;
        const message = typeof rules.max === 'object' ? rules.max.message : 
                       `${name} must be no more than ${max}`;
        if (value > max) return message;
      }
    }

    // Custom validation
    if (rules.custom) {
      return rules.custom(value);
    }

    return null;
  };

  // Validate all fields
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    Object.keys(validationRules).forEach(name => {
      const error = validateField(name, values[name]);
      if (error) {
        newErrors[name] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    
    if (!isValid && onValidationError) {
      onValidationError(newErrors);
    }

    return isValid;
  };

  // Set field value
  const setValue = (name: string, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    if (validateOnChange && touched[name]) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error || '' }));
    }
  };

  // Set field error
  const setError = (name: string, error: string) => {
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  // Set field touched
  const setTouchedField = (name: string, isTouched: boolean) => {
    setTouched(prev => ({ ...prev, [name]: isTouched }));
    
    if (validateOnBlur && isTouched) {
      const error = validateField(name, values[name]);
      setErrors(prev => ({ ...prev, [name]: error || '' }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;

    // Mark all fields as touched
    const allTouched: Record<string, boolean> = {};
    Object.keys(validationRules).forEach(name => {
      allTouched[name] = true;
    });
    setTouched(allTouched);

    // Validate form
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const contextValue: FormContextType = {
    values,
    errors,
    touched,
    isSubmitting,
    setValue,
    setError,
    setTouched: setTouchedField,
    validateField,
  };

  return (
    <FormContext.Provider value={contextValue}>
      <form onSubmit={handleSubmit} className={className} {...props}>
        {children}
      </form>
    </FormContext.Provider>
  );
}

// Form Field Components
interface FormFieldProps {
  name: string;
  label?: string;
  helperText?: string;
  className?: string;
}

// Form Input
interface FormInputProps extends FormFieldProps {
  type?: string;
  placeholder?: string;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconClick?: () => void;
  variant?: 'default' | 'filled' | 'outlined';
  fullWidth?: boolean;
}

export function FormInput({ name, ...props }: FormInputProps) {
  const { values, errors, touched, setValue, setTouched } = useFormContext();

  return (
    <Input
      {...props}
      value={values[name] || ''}
      error={touched[name] ? errors[name] : undefined}
      onChange={(e) => setValue(name, e.target.value)}
      onBlur={() => setTouched(name, true)}
    />
  );
}

// Form Select
interface FormSelectProps extends FormFieldProps {
  options: Array<{ value: string | number; label: string; disabled?: boolean }>;
  placeholder?: string;
  variant?: 'default' | 'filled' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export function FormSelect({ name, ...props }: FormSelectProps) {
  const { values, errors, touched, setValue, setTouched } = useFormContext();

  return (
    <Select
      {...props}
      value={values[name] || ''}
      error={touched[name] ? errors[name] : undefined}
      onChange={(e) => setValue(name, e.target.value)}
      onBlur={() => setTouched(name, true)}
    />
  );
}

// Form Textarea
interface FormTextareaProps extends FormFieldProps {
  placeholder?: string;
  variant?: 'default' | 'filled' | 'outlined';
  autoResize?: boolean;
  maxHeight?: number;
  showCharCount?: boolean;
  maxLength?: number;
  fullWidth?: boolean;
}

export function FormTextarea({ name, ...props }: FormTextareaProps) {
  const { values, errors, touched, setValue, setTouched } = useFormContext();

  return (
    <Textarea
      {...props}
      value={values[name] || ''}
      error={touched[name] ? errors[name] : undefined}
      onChange={(e) => setValue(name, e.target.value)}
      onBlur={() => setTouched(name, true)}
    />
  );
}

// Form Checkbox
interface FormCheckboxProps extends FormFieldProps {
  description?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'switch';
}

export function FormCheckbox({ name, ...props }: FormCheckboxProps) {
  const { values, errors, touched, setValue, setTouched } = useFormContext();

  return (
    <Checkbox
      {...props}
      checked={values[name] || false}
      error={touched[name] ? errors[name] : undefined}
      onChange={(e) => setValue(name, e.target.checked)}
      onBlur={() => setTouched(name, true)}
    />
  );
}

// Form Submit Button
interface FormSubmitProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loadingText?: string;
  fullWidth?: boolean;
  className?: string;
}

export function FormSubmit({ children, loadingText = 'Submitting...', ...props }: FormSubmitProps) {
  const { isSubmitting } = useFormContext();

  return (
    <Button
      type="submit"
      loading={isSubmitting}
      loadingText={loadingText}
      disabled={isSubmitting}
      {...props}
    >
      {children}
    </Button>
  );
}
'use client';

import { useState, useRef } from 'react';

interface ImageUploadProps {
  value?: string;
  onChange: (imageUrl: string) => void;
  label?: string;
  placeholder?: string;
  accept?: string;
  maxSize?: number; // in MB
}

export default function ImageUpload({
  value,
  onChange,
  label = 'Image',
  placeholder = 'Upload an image',
  accept = 'image/*',
  maxSize = 5
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const normalizePreviewUrl = (url?: string): string => {
    if (!url) return '';
    // Keep existing proxied path.
    if (url.startsWith('/api/uploads/')) return url;
    // Convert backend absolute URLs to frontend proxy path.
    if (url.includes('/api/uploads/')) {
      const m = url.match(/\/api\/uploads\/(.+)$/);
      if (m) return `/api/uploads/${m[1]}`;
    }
    if (url.includes('/uploads/')) {
      const m = url.match(/\/uploads\/(.+)$/);
      if (m) return `/api/uploads/${m[1]}`;
    }
    return url;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`File size must be less than ${maxSize}MB`);
      return;
    }

    setError('');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('authToken');
      
      if (!token) {
        setUploading(false);
        setError('You are not logged in. Please log in and try again.');
        if (typeof window !== 'undefined') {
          setTimeout(() => {
            window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
          }, 2000);
        }
        return;
      }
      
      console.log('Uploading file:', file.name, 'Size:', file.size, 'Type:', file.type);
      
      // Use frontend API route which forwards to backend
      const response = await fetch('/api/upload?category=image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      console.log('Upload response status:', response.status);
      
      if (!response.ok) {
        let errorMessage = 'Upload failed';
        try {
          const errorText = await response.text();
          console.error('Upload failed:', response.status, errorText);
          
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.message || errorData.error || errorMessage;
          } catch (parseError) {
            errorMessage = errorText || errorMessage;
          }
          
          // Handle authentication errors
          if (response.status === 401) {
            errorMessage = 'Your session has expired. Please log in again.';
            localStorage.removeItem('authToken');
            localStorage.removeItem('refreshToken');
            setTimeout(() => {
              if (typeof window !== 'undefined') {
                window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
              }
            }, 2000);
          }
        } catch (e) {
          console.error('Error processing upload error:', e);
        }
        
        setError(errorMessage);
        setUploading(false);
        return;
      }

      const result = await response.json();
      console.log('Upload successful:', result);
      const rawUrl = result.url || result.path || result.filePath;
      onChange(normalizePreviewUrl(rawUrl));
    } catch (error) {
      console.error('Upload error:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!value) return;
    
    // If there's an image URL, try to delete it from the server
    if (value && (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/api/uploads/') || value.startsWith('/uploads/'))) {
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`/api/upload?url=${encodeURIComponent(value)}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          console.warn('Failed to delete image from server:', response.status);
          // Continue with local removal even if server delete fails
        } else {
          console.log('Image deleted from server successfully');
        }
      } catch (error) {
        console.error('Error deleting image from server:', error);
        // Continue with local removal even if server delete fails
      }
    }
    
    // Remove from UI
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      
      <div className="flex items-center space-x-4">
        {/* Image Preview */}
        {value && (
          <div className="relative">
            <img
              src={normalizePreviewUrl(value)}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border border-gray-300"
              onError={(e) => {
                console.error('Image preview failed to load:', value);
                // Try to fix the URL if it's incorrect
                const img = e.currentTarget;
                const fallback = normalizePreviewUrl(value);
                if (fallback && img.src !== fallback) {
                  img.src = fallback;
                }
              }}
            />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
            >
              ×
            </button>
          </div>
        )}

        {/* Upload Button */}
        <div className="flex-1">
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <button
            type="button"
            onClick={handleClick}
            disabled={uploading}
            className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                Uploading...
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <i className="fas fa-cloud-upload-alt mr-2"></i>
                {value ? 'Change Image' : placeholder}
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}

      {/* Help Text */}
      <p className="text-gray-500 text-xs">
        Supported formats: JPG, PNG, GIF. Max size: {maxSize}MB
      </p>
    </div>
  );
}
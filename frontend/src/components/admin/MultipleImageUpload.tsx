'use client';

import { useState, useRef } from 'react';

interface MultipleImageUploadProps {
  value?: string[];
  onChange: (imageUrls: string[]) => void;
  label?: string;
  placeholder?: string;
  accept?: string;
  maxSize?: number; // in MB
  maxImages?: number;
}

export default function MultipleImageUpload({
  value = [],
  onChange,
  label = 'Images',
  placeholder = 'Upload images',
  accept = 'image/*',
  maxSize = 5,
  maxImages = 20
}: MultipleImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Check total images limit
    if (value.length + files.length > maxImages) {
      setError(`Maximum ${maxImages} images allowed. You can add ${maxImages - value.length} more.`);
      return;
    }

    // Validate file types and sizes
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        setError('Please select only image files');
        return;
      }
      if (file.size > maxSize * 1024 * 1024) {
        setError(`File size must be less than ${maxSize}MB for each image`);
        return;
      }
    }

    setError('');
    setUploading(true);

    try {
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

      // Upload files sequentially
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload?category=image', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          let errorMessage = 'Upload failed';
          try {
            const errorText = await response.text();
            try {
              const errorData = JSON.parse(errorText);
              errorMessage = errorData.message || errorData.error || errorMessage;
            } catch {
              errorMessage = errorText || errorMessage;
            }
          } catch (e) {
            console.error('Error processing upload error:', e);
          }
          
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
          
          setError(errorMessage);
          setUploading(false);
          return;
        }

        const result = await response.json();
        const imageUrl = result.url || result.path || result.filePath;
        if (imageUrl) {
          uploadedUrls.push(imageUrl);
        }
      }

      // Add new URLs to existing ones
      onChange([...value, ...uploadedUrls]);
    } catch (error) {
      console.error('Upload error:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload images. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async (index: number) => {
    const imageUrl = value[index];
    
    // Try to delete from server
    if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || imageUrl.startsWith('/api/uploads/') || imageUrl.startsWith('/uploads/'))) {
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`/api/upload?url=${encodeURIComponent(imageUrl)}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          console.warn('Failed to delete image from server:', response.status);
        } else {
          console.log('Image deleted from server successfully');
        }
      } catch (error) {
        console.error('Error deleting image from server:', error);
      }
    }
    
    // Remove from array
    const newUrls = value.filter((_, i) => i !== index);
    onChange(newUrls);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      
      {/* Image Grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {value.map((url, index) => (
            <div key={index} className="relative group">
              <img
                src={url}
                alt={`Guest ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg border border-gray-300"
                onError={(e) => {
                  console.error('Image preview failed to load:', url);
                }}
              />
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Button */}
      {value.length < maxImages && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            multiple
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
                {placeholder} ({value.length}/{maxImages})
              </div>
            )}
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}

      {/* Help Text */}
      <p className="text-gray-500 text-xs">
        Supported formats: JPG, PNG, GIF. Max size: {maxSize}MB per image. Maximum {maxImages} images.
      </p>
    </div>
  );
}


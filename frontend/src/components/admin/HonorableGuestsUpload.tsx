'use client';

import { useState, useRef } from 'react';

export interface HonorableGuest {
  photoUrl: string;
  name: string;
  title: string;
}

interface HonorableGuestsUploadProps {
  value?: HonorableGuest[];
  onChange: (guests: HonorableGuest[]) => void;
  label?: string;
  placeholder?: string;
  accept?: string;
  maxSize?: number; // in MB
  maxGuests?: number;
}

/**
 * Parse name and title from filename
 * Supports formats like:
 * - "John Doe - Professor.jpg"
 * - "John_Doe_Professor.jpg"
 * - "John Doe, Professor.jpg"
 * - "John Doe (Professor).jpg"
 * - "John Doe.jpg" (name only)
 */
function parseNameAndTitleFromFilename(filename: string): { name: string; title: string } {
  // Remove file extension
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '').trim();
  
  if (!nameWithoutExt) {
    return { name: '', title: '' };
  }

  // Try different separators
  // Format: "Name - Title"
  if (nameWithoutExt.includes(' - ')) {
    const parts = nameWithoutExt.split(' - ');
    return {
      name: parts[0].trim(),
      title: parts.slice(1).join(' - ').trim()
    };
  }

  // Format: "Name, Title"
  if (nameWithoutExt.includes(', ')) {
    const parts = nameWithoutExt.split(', ');
    return {
      name: parts[0].trim(),
      title: parts.slice(1).join(', ').trim()
    };
  }

  // Format: "Name (Title)"
  const parenMatch = nameWithoutExt.match(/^(.+?)\s*\(([^)]+)\)$/);
  if (parenMatch) {
    return {
      name: parenMatch[1].trim(),
      title: parenMatch[2].trim()
    };
  }

  // Format: "Name_Title" (underscore separator, last underscore separates name and title)
  if (nameWithoutExt.includes('_')) {
    const parts = nameWithoutExt.split('_');
    // If there are multiple underscores, use the last one as separator
    // e.g., "John_Doe_Professor" -> name: "John Doe", title: "Professor"
    if (parts.length >= 2) {
      const lastIndex = nameWithoutExt.lastIndexOf('_');
      return {
        name: nameWithoutExt.substring(0, lastIndex).replace(/_/g, ' ').trim(),
        title: nameWithoutExt.substring(lastIndex + 1).trim()
      };
    }
  }

  // If no separator found, treat entire filename as name
  return {
    name: nameWithoutExt.replace(/_/g, ' ').trim(),
    title: ''
  };
}

export default function HonorableGuestsUpload({
  value = [],
  onChange,
  label = 'Honorable Guests',
  placeholder = 'Upload guest photos',
  accept = 'image/*',
  maxSize = 5,
  maxGuests = 100
}: HonorableGuestsUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Check total guests limit
    if (value.length + files.length > maxGuests) {
      setError(`Maximum ${maxGuests} guests allowed. You can add ${maxGuests - value.length} more.`);
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
      const newGuests: HonorableGuest[] = [];
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
        console.log('Upload response:', result);
        let imageUrl = result.url || result.path || result.filePath;
        if (!imageUrl) {
          console.error('No image URL in upload response:', result);
          setError(`Upload failed: No image URL returned from server. Response: ${JSON.stringify(result)}`);
          setUploading(false);
          return;
        }
        
        // Normalize URL: convert absolute URLs to relative paths for consistency
        // If URL contains localhost:3001/api/uploads/, convert to /api/uploads/
        if (imageUrl.includes('localhost:3001/api/uploads/')) {
          const pathMatch = imageUrl.match(/\/api\/uploads\/(.+)$/);
          if (pathMatch) {
            imageUrl = `/api/uploads/${pathMatch[1]}`;
          }
        } else if (imageUrl.includes('/api/uploads/')) {
          // Already a relative path, ensure it starts with /
          if (!imageUrl.startsWith('/')) {
            imageUrl = `/${imageUrl}`;
          }
        } else if (result.path && !imageUrl.startsWith('http')) {
          // If we have a path but no full URL, construct relative path
          imageUrl = `/api/uploads/${result.path}`;
        }
        
        // Parse name and title from filename
        const { name, title } = parseNameAndTitleFromFilename(file.name);
        newGuests.push({
          photoUrl: imageUrl,
          name: name,
          title: title
        });
      }

      // Add new guests to existing ones
      onChange([...value, ...newGuests]);
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
    const guest = value[index];
    
    // Try to delete photo from server
    if (guest.photoUrl && (guest.photoUrl.startsWith('http://') || guest.photoUrl.startsWith('https://') || guest.photoUrl.startsWith('/api/uploads/') || guest.photoUrl.startsWith('/uploads/'))) {
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`/api/upload?url=${encodeURIComponent(guest.photoUrl)}`, {
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
    const newGuests = value.filter((_, i) => i !== index);
    onChange(newGuests);
  };

  const handleGuestChange = (index: number, field: keyof HonorableGuest, newValue: string) => {
    const newGuests = [...value];
    newGuests[index] = {
      ...newGuests[index],
      [field]: newValue
    };
    onChange(newGuests);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      
      {/* Guests List */}
      {value.length > 0 && (
        <div className="space-y-4">
          {value.map((guest, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex gap-4">
                {/* Photo Preview */}
                <div className="relative flex-shrink-0">
                  <img
                    src={guest.photoUrl}
                    alt={`Guest ${index + 1}`}
                    className="w-24 h-24 object-cover rounded-lg border border-gray-300"
                    onError={(e) => {
                      console.error('Image preview failed to load:', guest.photoUrl);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
                
                {/* Name and Title Inputs */}
                <div className="flex-1 space-y-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={guest.name}
                      onChange={(e) => handleGuestChange(index, 'name', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Enter guest name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={guest.title}
                      onChange={(e) => handleGuestChange(index, 'title', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Enter guest title/position"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Button */}
      {value.length < maxGuests && (
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
                {placeholder} ({value.length}/{maxGuests})
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
        Supported formats: JPG, PNG, GIF. Max size: {maxSize}MB per image. Maximum {maxGuests} guests.
        <br />
        <span className="font-medium">Tip:</span> Name and title will be automatically extracted from filename.
        Supported formats: "Name - Title.jpg", "Name, Title.jpg", "Name (Title).jpg", or "Name_Title.jpg"
      </p>
    </div>
  );
}


'use client';

import { useState, useRef } from 'react';
import { FileText, Upload, X } from 'lucide-react';

interface PDFUploadProps {
  value?: string; // PDF file path
  fileName?: string; // Original file name
  onChange: (filePath: string, fileName: string) => void;
  onRemove?: () => void;
  label?: string;
  placeholder?: string;
  maxSize?: number; // in MB
}

export default function PDFUpload({
  value,
  fileName,
  onChange,
  onRemove,
  label = 'PDF Attachment',
  placeholder = 'Upload a PDF document',
  maxSize = 10
}: PDFUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      setError('Please select a PDF file');
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
        setError('Please login to upload files');
        window.location.href = '/login';
        return;
      }

      const response = await fetch(`/api/upload?category=pdf`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('refreshToken');
          alert('Session expired. Please login again.');
          window.location.href = '/login';
          return;
        }
        
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      const storedPath =
        (typeof data?.path === 'string' && data.path) ||
        (typeof data?.filePath === 'string' && data.filePath) ||
        '';
      if (!storedPath) {
        throw new Error('Upload succeeded but no file path was returned');
      }
      onChange(storedPath, file.name);
    } catch (err: any) {
      console.error('PDF upload error:', err);
      setError(err.message || 'Failed to upload PDF file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    if (onRemove) {
      onRemove();
    } else {
      onChange('', '');
    }
    setError('');
  };

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />
      
      {value ? (
        <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-300 rounded-md gap-2">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <FileText className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {fileName || 'PDF Document'}
              </p>
              <p className="text-xs text-gray-500 truncate">{value}</p>
            </div>
          </div>
          <div className="flex items-center flex-shrink-0 gap-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 rounded border border-primary/30 disabled:opacity-50"
              title="Replace PDF"
            >
              {uploading ? '…' : 'Replace'}
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
              title="Remove PDF"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-gray-50 transition-colors"
        >
          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 mb-1">
            {uploading ? 'Uploading...' : placeholder}
          </p>
          <p className="text-xs text-gray-500">
            PDF only, max {maxSize}MB
          </p>
          {error && (
            <p className="text-red-500 text-sm mt-2">{error}</p>
          )}
        </div>
      )}
      {value && error && (
        <p className="text-red-500 text-sm mt-2">{error}</p>
      )}
    </div>
  );
}


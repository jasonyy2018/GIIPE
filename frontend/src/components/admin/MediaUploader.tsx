'use client';

import { useState, useCallback } from 'react';
import { Upload, X, File, Image, FileText, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  preview?: string;
}

interface MediaUploaderProps {
  onUpload: (files: File[]) => Promise<UploadedFile[]>;
  onRemove?: (fileId: string) => void;
  accept?: string;
  maxSize?: number; // in bytes
  maxFiles?: number;
  multiple?: boolean;
  className?: string;
  uploadedFiles?: UploadedFile[];
}

export function MediaUploader({
  onUpload,
  onRemove,
  accept = "image/*,application/pdf,.doc,.docx,.txt",
  maxSize = 10 * 1024 * 1024, // 10MB
  maxFiles = 5,
  multiple = true,
  className,
  uploadedFiles = []
}: MediaUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return Image;
    if (type.includes('pdf') || type.includes('document')) return FileText;
    return File;
  };

  const validateFiles = (files: File[]) => {
    const errors: string[] = [];

    if (uploadedFiles.length + files.length > maxFiles) {
      errors.push(`Maximum ${maxFiles} files allowed`);
    }

    files.forEach(file => {
      if (file.size > maxSize) {
        errors.push(`${file.name} is too large (max ${formatFileSize(maxSize)})`);
      }
    });

    return errors;
  };

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const errors = validateFiles(fileArray);

    if (errors.length > 0) {
      setError(errors.join(', '));
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      await onUpload(fileArray);
    } catch (err) {
      setError('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, [onUpload, maxSize, maxFiles, uploadedFiles.length]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  }, [handleFiles]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
          isDragOver 
            ? "border-blue-400 bg-blue-50" 
            : "border-gray-300 hover:border-gray-400",
          isUploading && "opacity-50 pointer-events-none"
        )}
      >
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInput}
          className="hidden"
          id="file-upload"
          disabled={isUploading}
        />
        
        <div className="space-y-2">
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <div>
            <label
              htmlFor="file-upload"
              className="cursor-pointer text-primary hover:text-blue-500 font-medium"
            >
              Click to upload
            </label>
            <span className="text-gray-500"> or drag and drop</span>
          </div>
          <p className="text-sm text-gray-500">
            {accept.includes('image') && 'Images, '}
            PDF, DOC, TXT up to {formatFileSize(maxSize)}
          </p>
        </div>

        {isUploading && (
          <div className="mt-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">Uploading...</p>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-md">
          <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
          <span className="text-sm text-red-700">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">Uploaded Files</h4>
          <div className="space-y-2">
            {uploadedFiles.map((file) => {
              const FileIcon = getFileIcon(file.type);
              return (
                <div
                  key={file.id}
                  className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <FileIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  {file.preview && file.type.startsWith('image/') && (
                    <img
                      src={file.preview}
                      alt={file.name}
                      className="h-10 w-10 object-cover rounded mr-3"
                    />
                  )}
                  {onRemove && (
                    <button
                      onClick={() => onRemove(file.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
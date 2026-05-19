'use client';

import { useState } from 'react';
import { MarkdownEditor } from './MarkdownEditor';
import { MediaUploader } from './MediaUploader';
import { Save, Eye, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContentEditorProps {
  title: string;
  content: string;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
  onSave: () => void;
  onPreview?: () => void;
  isLoading?: boolean;
  showMediaUploader?: boolean;
  className?: string;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  preview?: string;
}

export function ContentEditor({
  title,
  content,
  onTitleChange,
  onContentChange,
  onSave,
  onPreview,
  isLoading = false,
  showMediaUploader = true,
  className
}: ContentEditorProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  const handleFileUpload = async (files: File[]): Promise<UploadedFile[]> => {
    // Mock upload - in real app, this would upload to your backend
    const newFiles: UploadedFile[] = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file),
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
    return newFiles;
  };

  const handleFileRemove = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const insertFileReference = (file: UploadedFile) => {
    const reference = file.type.startsWith('image/') 
      ? `![${file.name}](${file.url})`
      : `[${file.name}](${file.url})`;
    
    onContentChange(content + '\n\n' + reference);
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Enter title..."
            className="text-2xl font-bold border-0 bg-transparent focus:outline-none focus:ring-0 w-full placeholder-gray-400"
          />
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100"
          >
            <Settings className="h-5 w-5" />
          </button>
          {onPreview && (
            <button
              onClick={onPreview}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </button>
          )}
          <button
            onClick={onSave}
            disabled={isLoading}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Content Settings</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm">
                <option>Draft</option>
                <option>Published</option>
                <option>Archived</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm">
                <option>General</option>
                <option>Conference</option>
                <option>News</option>
                <option>Announcement</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Content Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <MarkdownEditor
            value={content}
            onChange={onContentChange}
            height="500px"
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Media Uploader */}
          {showMediaUploader && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Media</h3>
              <MediaUploader
                onUpload={handleFileUpload}
                onRemove={handleFileRemove}
                uploadedFiles={uploadedFiles}
                maxFiles={10}
              />
              
              {/* File References */}
              {uploadedFiles.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-medium text-gray-700 mb-2">Insert Reference</h4>
                  <div className="space-y-1">
                    {uploadedFiles.map(file => (
                      <button
                        key={file.id}
                        onClick={() => insertFileReference(file)}
                        className="block w-full text-left px-2 py-1 text-xs text-primary hover:bg-blue-50 rounded truncate"
                      >
                        {file.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Actions */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">
                Insert Table
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">
                Add Code Block
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">
                Insert Divider
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
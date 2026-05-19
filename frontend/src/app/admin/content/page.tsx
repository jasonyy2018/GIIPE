'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/admin/PageHeader';
import { ContentEditor } from '@/components/admin/ContentEditor';
import { Plus } from 'lucide-react';

export default function ContentPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('# Welcome to the Conference\n\nThis is a sample markdown content for your conference page.\n\n## Features\n\n- **Rich text editing** with Markdown support\n- Live preview functionality\n- Media upload capabilities\n- Easy content management\n\n## Getting Started\n\nStart writing your content using Markdown syntax. You can:\n\n1. Add headings with `#`\n2. Create **bold** and *italic* text\n3. Insert links and images\n4. Add code blocks and quotes\n\n> This is a quote block to highlight important information.\n\n```javascript\n// Code example\nconst conference = {\n  name: "AI Summit 2024",\n  date: "2024-03-15",\n  location: "Tech Center"\n};\n```\n\nEnjoy creating amazing content for your conference!');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Saving content:', { title, content });
    setIsLoading(false);
  };

  const handlePreview = () => {
    console.log('Preview content:', { title, content });
    // In real app, open preview in new tab or modal
  };

  return (
    <>
      <PageHeader 
        title="Content Management" 
        description="Create and manage conference content with rich text editing"
      >
        <button className="flex items-center px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-dark">
          <Plus className="h-4 w-4 mr-2" />
          New Content
        </button>
      </PageHeader>

      <div className="p-6">
        <ContentEditor
          title={title}
          content={content}
          onTitleChange={setTitle}
          onContentChange={setContent}
          onSave={handleSave}
          onPreview={handlePreview}
          isLoading={isLoading}
          showMediaUploader={true}
        />
      </div>
    </>
  );
}
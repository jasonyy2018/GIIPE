'use client';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="border-b border-gray-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-gray-500">
              {description}
            </p>
          )}
        </div>
        {children && (
          <div className="flex flex-shrink-0 space-x-3">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
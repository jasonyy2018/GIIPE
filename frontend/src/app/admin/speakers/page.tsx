'use client';

import AdminLayout from '@/components/admin/AdminLayout';

export default function SpeakersPage() {
  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto py-10">
        <h1 className="text-2xl font-bold mb-2">Speakers</h1>
        <p className="text-gray-600">
          Speakers management is not enabled yet in this deployment. If you want, I can wire this page to backend
          endpoints and add create/edit/list features.
        </p>
      </div>
    </AdminLayout>
  );
}


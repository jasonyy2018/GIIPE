import { Metadata } from 'next';
import AuditLogInterface from '../../../components/admin/AuditLogInterface';

export const metadata: Metadata = {
  title: 'Audit Logs - Admin Dashboard',
  description: 'Advanced audit log viewer with search, filtering, and analytics',
};

export default function AuditPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <AuditLogInterface />
    </div>
  );
}
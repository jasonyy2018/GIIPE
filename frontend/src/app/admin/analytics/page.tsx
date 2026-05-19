import InteractiveAnalyticsDashboard from '@/components/admin/InteractiveAnalyticsDashboard';
import { DateRangeSelector } from '@/components/admin/DateRangeSelector';
import { ComparativeAnalyticsChart } from '@/components/admin/ComparativeAnalyticsChart';
import { PageHeader } from '@/components/admin/PageHeader';

export default function AnalyticsPage() {
  return (
    <>
      <PageHeader 
        title="Advanced Analytics Dashboard" 
        description="Interactive analytics with drill-down capabilities, real-time updates, and comparative analysis"
      />
      <div className="p-6 space-y-6">
        <InteractiveAnalyticsDashboard 
          enableRealTime={true}
          allowDrillDown={true}
        />
      </div>
    </>
  );
}

export const metadata = {
  title: 'Analytics Dashboard - Conference Management',
  description: 'Monitor your conference management platform performance and metrics',
};
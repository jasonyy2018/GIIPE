'use client';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

interface RegistrationsChartProps {
  data: {
    totalRegistrations: number;
    confirmedRegistrations: number;
    pendingRegistrations: number;
    cancelledRegistrations: number;
  };
}

const COLORS = {
  confirmed: '#10b981',
  pending: '#f59e0b',
  cancelled: '#ef4444',
};

export function RegistrationsChart({ data }: RegistrationsChartProps) {
  const chartData = [
    {
      name: 'Confirmed',
      value: data.confirmedRegistrations,
      color: COLORS.confirmed,
    },
    {
      name: 'Pending',
      value: data.pendingRegistrations,
      color: COLORS.pending,
    },
    {
      name: 'Cancelled',
      value: data.cancelledRegistrations,
      color: COLORS.cancelled,
    },
  ].filter(item => item.value > 0);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload;
              return (
                <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                  <p className="text-sm font-medium text-gray-900">{data.name}</p>
                  <p className="text-sm" style={{ color: data.color }}>
                    Count: {data.value}
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
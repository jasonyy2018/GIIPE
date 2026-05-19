'use client';

import { useState, useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts';

interface ChartDataPoint {
  [key: string]: any;
}

interface InteractiveChartProps {
  data: ChartDataPoint[];
  type: 'line' | 'area' | 'bar' | 'pie';
  xKey: string;
  yKeys: string[];
  colors?: string[];
  title?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  enableZoom?: boolean;
  enableBrush?: boolean;
  customTooltip?: (props: any) => React.ReactNode;
  onDataPointClick?: (data: ChartDataPoint) => void;
  className?: string;
}

const DEFAULT_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#F97316', // Orange
  '#06B6D4', // Cyan
  '#84CC16', // Lime
];

export default function InteractiveChart({
  data,
  type,
  xKey,
  yKeys,
  colors = DEFAULT_COLORS,
  title,
  height = 300,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  enableZoom = false,
  enableBrush = false,
  customTooltip,
  onDataPointClick,
  className = ''
}: InteractiveChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());

  // Filter data based on hidden series
  const filteredData = useMemo(() => {
    if (hiddenSeries.size === 0) return data;
    
    return data.map(item => {
      const filteredItem = { ...item };
      Array.from(hiddenSeries).forEach(key => {
        delete filteredItem[key];
      });
      return filteredItem;
    });
  }, [data, hiddenSeries]);

  // Get visible y-keys
  const visibleYKeys = yKeys.filter(key => !hiddenSeries.has(key));

  const handleLegendClick = (dataKey: string) => {
    const newHiddenSeries = new Set(hiddenSeries);
    if (newHiddenSeries.has(dataKey)) {
      newHiddenSeries.delete(dataKey);
    } else {
      newHiddenSeries.add(dataKey);
    }
    setHiddenSeries(newHiddenSeries);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    if (customTooltip) {
      return customTooltip({ active, payload, label });
    }

    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-medium text-gray-900 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-gray-600">{entry.dataKey}:</span>
            <span className="text-sm font-medium text-gray-900">
              {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const CustomLegend = ({ payload }: any) => {
    if (!showLegend || !payload) return null;

    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {payload.map((entry: any, index: number) => (
          <button
            key={index}
            onClick={() => handleLegendClick(entry.dataKey)}
            className={`flex items-center space-x-2 px-3 py-1 rounded-lg transition-all duration-200 ${
              hiddenSeries.has(entry.dataKey)
                ? 'opacity-50 bg-gray-100'
                : 'hover:bg-gray-50'
            }`}
          >
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm font-medium text-gray-700">
              {entry.value}
            </span>
          </button>
        ))}
      </div>
    );
  };

  const renderChart = () => {
    const commonProps = {
      data: filteredData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
      onClick: onDataPointClick,
    };

    switch (type) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />}
            <XAxis 
              dataKey={xKey} 
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {visibleYKeys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
                connectNulls={false}
              />
            ))}
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />}
            <XAxis 
              dataKey={xKey} 
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {visibleYKeys.map((key, index) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stackId="1"
                stroke={colors[index % colors.length]}
                fill={colors[index % colors.length]}
                fillOpacity={0.6}
              />
            ))}
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />}
            <XAxis 
              dataKey={xKey} 
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {visibleYKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={colors[index % colors.length]}
                radius={[2, 2, 0, 0]}
              />
            ))}
          </BarChart>
        );

      case 'pie':
        const pieData = data.map((item, index) => ({
          name: item[xKey],
          value: item[yKeys[0]],
          color: colors[index % colors.length]
        }));

        return (
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {pieData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color}
                  stroke={activeIndex === index ? '#374151' : 'none'}
                  strokeWidth={activeIndex === index ? 2 : 0}
                />
              ))}
            </Pie>
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
          </PieChart>
        );

      default:
        return <div>Unsupported chart type</div>;
    }
  };

  const chartElement = renderChart();

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
      {title && (
        <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      )}
      
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          {chartElement}
        </ResponsiveContainer>
      </div>

      {showLegend && type !== 'pie' && (
        <CustomLegend payload={yKeys.map((key, index) => ({
          dataKey: key,
          value: key,
          color: colors[index % colors.length]
        }))} />
      )}
    </div>
  );
}
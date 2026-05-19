export interface DashboardWidget {
  id: string;
  title: string;
  type: 'metric' | 'chart' | 'list' | 'status' | 'activity' | 'progress';
  size: 'small' | 'medium' | 'large' | 'extra-large';
  position: { x: number; y: number; w: number; h: number };
  refreshInterval: number; // in seconds
  data: any;
  config: WidgetConfig;
  isVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WidgetConfig {
  showTrend?: boolean;
  chartType?: 'line' | 'bar' | 'pie' | 'area' | 'donut';
  colorScheme?: 'primary' | 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  filters?: FilterConfig[];
  dataSource?: string;
  maxItems?: number;
  showHeader?: boolean;
  showFooter?: boolean;
  customTitle?: string;
  thresholds?: {
    warning?: number;
    critical?: number;
  };
}

export interface FilterConfig {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between';
  value: any;
}

export interface WidgetTemplate {
  id: string;
  name: string;
  description: string;
  category: 'analytics' | 'monitoring' | 'content' | 'users' | 'events';
  defaultConfig: Partial<DashboardWidget>;
  previewImage?: string;
}

export interface DashboardLayout {
  id: string;
  name: string;
  isDefault: boolean;
  widgets: DashboardWidget[];
  gridSettings: {
    cols: number;
    rowHeight: number;
    margin: [number, number];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface WidgetDataSource {
  id: string;
  name: string;
  endpoint: string;
  method: 'GET' | 'POST';
  parameters?: Record<string, any>;
  transformFunction?: string;
  refreshInterval: number;
}

export type WidgetSize = {
  small: { w: 2, h: 2 };
  medium: { w: 3, h: 3 };
  large: { w: 4, h: 4 };
  'extra-large': { w: 6, h: 4 };
};

export const WIDGET_SIZES: WidgetSize = {
  small: { w: 2, h: 2 },
  medium: { w: 3, h: 3 },
  large: { w: 4, h: 4 },
  'extra-large': { w: 6, h: 4 }
};

export interface WidgetAction {
  id: string;
  label: string;
  icon: string;
  action: (widget: DashboardWidget) => void;
  requiresConfirmation?: boolean;
  confirmMessage?: string;
}
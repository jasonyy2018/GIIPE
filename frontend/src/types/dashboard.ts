// Dashboard customization types
export interface DashboardWidget {
  id: string;
  title: string;
  component: string;
  enabled: boolean;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  settings?: Record<string, any>;
}

export interface DashboardLayout {
  id: string;
  name: string;
  widgets: DashboardWidget[];
  gridColumns: number;
  gridRows: number;
}

export interface DashboardTheme {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    accent: string;
  };
  spacing: 'compact' | 'normal' | 'spacious';
  borderRadius: 'none' | 'small' | 'medium' | 'large';
}

export interface DashboardPreferences {
  userId: string;
  currentLayout: string;
  currentTheme: string;
  autoSave: boolean;
  showWidgetTitles: boolean;
  enableAnimations: boolean;
  compactMode: boolean;
  refreshInterval: number; // in seconds
  hiddenWidgets: string[];
  customLayouts: DashboardLayout[];
}

export interface WidgetConfig {
  id: string;
  name: string;
  description: string;
  component: string;
  category: 'stats' | 'content' | 'social' | 'events' | 'analytics' | 'actions';
  defaultSize: {
    width: number;
    height: number;
  };
  minSize: {
    width: number;
    height: number;
  };
  maxSize?: {
    width: number;
    height: number;
  };
  configurable: boolean;
  icon: string;
}
import { IsOptional, IsDateString, IsEnum, IsString, IsArray, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export enum AnalyticsMetricType {
  USERS = 'users',
  EVENTS = 'events',
  REGISTRATIONS = 'registrations',
  ENGAGEMENT = 'engagement',
  REVENUE = 'revenue',
  PERFORMANCE = 'performance'
}

export enum ChartType {
  LINE = 'line',
  AREA = 'area',
  BAR = 'bar',
  PIE = 'pie'
}

export enum DateRangePreset {
  TODAY = 'today',
  LAST_7_DAYS = '7d',
  LAST_30_DAYS = '30d',
  LAST_90_DAYS = '90d',
  CUSTOM = 'custom'
}

export class EnhancedAnalyticsQueryDto {
  @ApiProperty({ enum: DateRangePreset, default: DateRangePreset.LAST_30_DAYS })
  @IsOptional()
  @IsEnum(DateRangePreset)
  preset?: DateRangePreset = DateRangePreset.LAST_30_DAYS;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ enum: AnalyticsMetricType, isArray: true, required: false })
  @IsOptional()
  @IsArray()
  @IsEnum(AnalyticsMetricType, { each: true })
  @Transform(({ value }) => typeof value === 'string' ? value.split(',') : value)
  metrics?: AnalyticsMetricType[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  groupBy?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  limit?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  includeComparison?: boolean;
}

export class DrillDownQueryDto {
  @ApiProperty()
  @IsString()
  date: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  level?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  metric?: string;
}

export interface AnalyticsMetric {
  id: string;
  name: string;
  value: number;
  previousValue: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  category: string;
  unit?: string;
  description?: string;
}

export interface ChartDataPoint {
  date: string;
  value: number;
  previousValue?: number;
  category?: string;
  metadata?: Record<string, any>;
}

export interface ComparativeDataPoint {
  date: string;
  current: number;
  previous: number;
  category?: string;
  metadata?: Record<string, any>;
}

export interface DrillDownData {
  level: number;
  filters: Record<string, any>;
  data: ChartDataPoint[];
  breadcrumb: string[];
  totalRecords: number;
}

export interface AnalyticsInsight {
  id: string;
  type: 'trend' | 'anomaly' | 'recommendation' | 'alert';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  data: any;
  actionable: boolean;
  recommendations?: string[];
  timestamp: Date;
  affectedMetrics: string[];
}

export interface RealTimeAnalyticsUpdate {
  type: 'analytics_update';
  timestamp: Date;
  metrics: Record<string, Partial<AnalyticsMetric>>;
  alerts?: AnalyticsInsight[];
}

export interface AnalyticsDashboardConfig {
  id: string;
  userId: string;
  name: string;
  isDefault: boolean;
  layout: {
    widgets: Array<{
      id: string;
      type: string;
      position: { x: number; y: number };
      size: { width: number; height: number };
      config: Record<string, any>;
    }>;
  };
  filters: {
    dateRange: DateRangePreset;
    metrics: AnalyticsMetricType[];
    customFilters: Record<string, any>;
  };
  refreshInterval: number;
  createdAt: Date;
  updatedAt: Date;
}

export class CreateDashboardConfigDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiProperty()
  layout: {
    widgets: Array<{
      id: string;
      type: string;
      position: { x: number; y: number };
      size: { width: number; height: number };
      config: Record<string, any>;
    }>;
  };

  @ApiProperty()
  filters: {
    dateRange: DateRangePreset;
    metrics: AnalyticsMetricType[];
    customFilters: Record<string, any>;
  };

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  refreshInterval?: number;
}

export class UpdateDashboardConfigDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  layout?: {
    widgets: Array<{
      id: string;
      type: string;
      position: { x: number; y: number };
      size: { width: number; height: number };
      config: Record<string, any>;
    }>;
  };

  @ApiProperty({ required: false })
  @IsOptional()
  filters?: {
    dateRange: DateRangePreset;
    metrics: AnalyticsMetricType[];
    customFilters: Record<string, any>;
  };

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  refreshInterval?: number;
}
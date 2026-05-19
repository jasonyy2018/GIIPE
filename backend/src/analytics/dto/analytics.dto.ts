import { IsOptional, IsDateString, IsEnum, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum DateRange {
  LAST_7_DAYS = 'last_7_days',
  LAST_30_DAYS = 'last_30_days',
  LAST_90_DAYS = 'last_90_days',
  LAST_YEAR = 'last_year',
  CUSTOM = 'custom',
}

export class AnalyticsQueryDto {
  @ApiProperty({ enum: DateRange, default: DateRange.LAST_30_DAYS })
  @IsOptional()
  @IsEnum(DateRange)
  dateRange?: DateRange = DateRange.LAST_30_DAYS;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class UserActivityDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsString()
  action: string;

  @ApiProperty()
  @IsString()
  resource: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  resourceId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  metadata?: Record<string, any>;
}

export interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  totalEvents: number;
  publishedEvents: number;
  totalRegistrations: number;
  totalSubmissions: number;
  totalComments: number;
  pendingComments: number;
  userGrowth: number;
  eventGrowth: number;
  registrationGrowth: number;
}

export interface UserActivityMetrics {
  totalActions: number;
  uniqueUsers: number;
  topActions: Array<{
    action: string;
    count: number;
  }>;
  activityByDay: Array<{
    date: string;
    count: number;
  }>;
}

export interface EventMetrics {
  totalEvents: number;
  publishedEvents: number;
  draftEvents: number;
  completedEvents: number;
  averageRegistrations: number;
  topEvents: Array<{
    id: string;
    title: string;
    registrationCount: number;
  }>;
  eventsByMonth: Array<{
    month: string;
    count: number;
  }>;
}

export interface RegistrationMetrics {
  totalRegistrations: number;
  confirmedRegistrations: number;
  pendingRegistrations: number;
  cancelledRegistrations: number;
  registrationsByEvent: Array<{
    eventId: string;
    eventTitle: string;
    count: number;
  }>;
  registrationsByMonth: Array<{
    month: string;
    count: number;
  }>;
}

export interface SystemMetrics {
  databaseSize: number;
  totalFiles: number;
  storageUsed: number;
  averageResponseTime: number;
  errorRate: number;
  uptime: number;
}
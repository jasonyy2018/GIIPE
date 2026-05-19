import { IsString, IsOptional, IsDateString, IsNumber, Min, IsArray, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class CreateAuditLogDto {
  @ApiProperty({ description: 'User ID who performed the action', required: false })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({ description: 'Action performed' })
  @IsString()
  action: string;

  @ApiProperty({ description: 'Resource type' })
  @IsString()
  resource: string;

  @ApiProperty({ description: 'Resource ID', required: false })
  @IsString()
  @IsOptional()
  resourceId?: string;

  @ApiProperty({ description: 'Additional details', required: false })
  @IsOptional()
  details?: any;

  @ApiProperty({ description: 'IP address', required: false })
  @IsString()
  @IsOptional()
  ipAddress?: string;

  @ApiProperty({ description: 'User agent', required: false })
  @IsString()
  @IsOptional()
  userAgent?: string;
}

export class AuditLogFiltersDto {
  @ApiProperty({ description: 'Filter by user ID', required: false })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({ description: 'Filter by action', required: false })
  @IsString()
  @IsOptional()
  action?: string;

  @ApiProperty({ description: 'Filter by resource', required: false })
  @IsString()
  @IsOptional()
  resource?: string;

  @ApiProperty({ description: 'Filter by resource ID', required: false })
  @IsString()
  @IsOptional()
  resourceId?: string;

  @ApiProperty({ description: 'Start date for filtering', required: false })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ description: 'End date for filtering', required: false })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({ description: 'Page number', required: false, default: 1 })
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiProperty({ description: 'Items per page', required: false, default: 20 })
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number = 20;

  @ApiProperty({ description: 'Search term for advanced search', required: false })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({ description: 'Filter by IP address', required: false })
  @IsString()
  @IsOptional()
  ipAddress?: string;

  @ApiProperty({ description: 'Sort field', required: false, default: 'createdAt' })
  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiProperty({ description: 'Sort order', required: false, default: 'desc' })
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiProperty({ description: 'Include user details', required: false, default: true })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  includeUser?: boolean = true;
}

export class AuditLogExportDto {
  @ApiProperty({ description: 'Export format', enum: ['csv', 'json', 'excel'] })
  @IsEnum(['csv', 'json', 'excel'])
  format: 'csv' | 'json' | 'excel';

  @ApiProperty({ description: 'Fields to include in export', required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  fields?: string[];

  @ApiProperty({ description: 'Filters to apply', required: false })
  @Type(() => AuditLogFiltersDto)
  @IsOptional()
  filters?: AuditLogFiltersDto;
}

export class AuditLogAnalyticsDto {
  @ApiProperty({ description: 'Start date for analytics', required: false })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ description: 'End date for analytics', required: false })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({ description: 'Group by field', required: false, default: 'action' })
  @IsString()
  @IsOptional()
  groupBy?: string = 'action';

  @ApiProperty({ description: 'Time interval for grouping', required: false, default: 'day' })
  @IsEnum(['hour', 'day', 'week', 'month'])
  @IsOptional()
  interval?: 'hour' | 'day' | 'week' | 'month' = 'day';
}
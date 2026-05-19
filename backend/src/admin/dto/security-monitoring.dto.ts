import { IsString, IsOptional, IsDateString, IsNumber, Min, IsEnum, IsBoolean, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class SecurityEventFiltersDto {
  @ApiProperty({ description: 'Filter by event type', required: false })
  @IsString()
  @IsOptional()
  eventType?: string;

  @ApiProperty({ description: 'Filter by severity level', required: false })
  @IsEnum(['low', 'medium', 'high', 'critical'])
  @IsOptional()
  severity?: 'low' | 'medium' | 'high' | 'critical';

  @ApiProperty({ description: 'Filter by IP address', required: false })
  @IsString()
  @IsOptional()
  ipAddress?: string;

  @ApiProperty({ description: 'Filter by user ID', required: false })
  @IsString()
  @IsOptional()
  userId?: string;

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

  @ApiProperty({ description: 'Include resolved events', required: false, default: true })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  includeResolved?: boolean = true;
}

export class CreateSecurityEventDto {
  @ApiProperty({ description: 'Type of security event' })
  @IsString()
  eventType: string;

  @ApiProperty({ description: 'Severity level', enum: ['low', 'medium', 'high', 'critical'] })
  @IsEnum(['low', 'medium', 'high', 'critical'])
  severity: 'low' | 'medium' | 'high' | 'critical';

  @ApiProperty({ description: 'Event description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'IP address associated with the event', required: false })
  @IsString()
  @IsOptional()
  ipAddress?: string;

  @ApiProperty({ description: 'User ID associated with the event', required: false })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({ description: 'Additional event details', required: false })
  @IsOptional()
  details?: any;

  @ApiProperty({ description: 'User agent string', required: false })
  @IsString()
  @IsOptional()
  userAgent?: string;
}

export class SecurityComplianceReportDto {
  @ApiProperty({ description: 'Report type', enum: ['gdpr', 'hipaa', 'sox', 'pci'] })
  @IsEnum(['gdpr', 'hipaa', 'sox', 'pci'])
  reportType: 'gdpr' | 'hipaa' | 'sox' | 'pci';

  @ApiProperty({ description: 'Start date for report', required: false })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ description: 'End date for report', required: false })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({ description: 'Include detailed findings', required: false, default: false })
  @IsBoolean()
  @IsOptional()
  includeDetails?: boolean = false;
}

export class SuspiciousActivityAnalysisDto {
  @ApiProperty({ description: 'Analysis period in days', required: false, default: 7 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  periodDays?: number = 7;

  @ApiProperty({ description: 'Minimum threshold for suspicious activity', required: false, default: 5 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  threshold?: number = 5;

  @ApiProperty({ description: 'Activity types to analyze', required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  activityTypes?: string[];

  @ApiProperty({ description: 'Include behavioral patterns', required: false, default: true })
  @IsBoolean()
  @IsOptional()
  includeBehavioralPatterns?: boolean = true;
}

export class IPBlockingDto {
  @ApiProperty({ description: 'IP address to block' })
  @IsString()
  ipAddress: string;

  @ApiProperty({ description: 'Reason for blocking' })
  @IsString()
  reason: string;

  @ApiProperty({ description: 'Block duration in hours (0 for permanent)', required: false, default: 24 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  durationHours?: number = 24;

  @ApiProperty({ description: 'Automatically block related IPs', required: false, default: false })
  @IsBoolean()
  @IsOptional()
  autoBlockRelated?: boolean = false;
}
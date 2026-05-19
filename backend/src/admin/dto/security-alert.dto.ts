import { IsString, IsOptional, IsDateString, IsNumber, Min, IsEnum, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class CreateSecurityAlertDto {
  @ApiProperty({ description: 'Alert type' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Alert severity', enum: ['low', 'medium', 'high', 'critical'] })
  @IsEnum(['low', 'medium', 'high', 'critical'])
  severity: 'low' | 'medium' | 'high' | 'critical';

  @ApiProperty({ description: 'Alert title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Alert description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Alert source' })
  @IsString()
  source: string;

  @ApiProperty({ description: 'IP address associated with the alert', required: false })
  @IsString()
  @IsOptional()
  ipAddress?: string;

  @ApiProperty({ description: 'User ID associated with the alert', required: false })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsOptional()
  metadata?: any;
}

export class AcknowledgeAlertDto {
  @ApiProperty({ description: 'Acknowledgment note', required: false })
  @IsString()
  @IsOptional()
  note?: string;
}

export class ResolveAlertDto {
  @ApiProperty({ description: 'Resolution note' })
  @IsString()
  resolutionNote: string;
}

export class SecurityAlertFiltersDto {
  @ApiProperty({ description: 'Filter by alert type', required: false })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiProperty({ description: 'Filter by severity level', required: false })
  @IsEnum(['low', 'medium', 'high', 'critical'])
  @IsOptional()
  severity?: 'low' | 'medium' | 'high' | 'critical';

  @ApiProperty({ description: 'Filter by acknowledgment status', required: false })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  acknowledged?: boolean;

  @ApiProperty({ description: 'Filter by resolution status', required: false })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  resolved?: boolean;

  @ApiProperty({ description: 'Filter by escalation status', required: false })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  escalated?: boolean;

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
}

export class EscalationRuleDto {
  @ApiProperty({ description: 'Escalation level' })
  @IsNumber()
  @Min(1)
  level: number;

  @ApiProperty({ description: 'Timeout in minutes before escalation' })
  @IsNumber()
  @Min(1)
  timeoutMinutes: number;

  @ApiProperty({ description: 'Severity after escalation', enum: ['low', 'medium', 'high', 'critical'] })
  @IsEnum(['low', 'medium', 'high', 'critical'])
  severity: 'low' | 'medium' | 'high' | 'critical';

  @ApiProperty({ description: 'Notification channels for escalation' })
  @IsArray()
  @IsString({ each: true })
  notificationChannels: string[];

  @ApiProperty({ description: 'Recipients for escalation notifications' })
  @IsArray()
  @IsString({ each: true })
  recipients: string[];
}

export class CreateAlertRuleDto {
  @ApiProperty({ description: 'Rule name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Alert type this rule applies to' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Default severity', enum: ['low', 'medium', 'high', 'critical'] })
  @IsEnum(['low', 'medium', 'high', 'critical'])
  severity: 'low' | 'medium' | 'high' | 'critical';

  @ApiProperty({ description: 'Rule conditions' })
  @IsOptional()
  conditions?: any;

  @ApiProperty({ description: 'Whether the rule is enabled', default: true })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean = true;

  @ApiProperty({ description: 'Escalation rules', type: [EscalationRuleDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EscalationRuleDto)
  escalationRules: EscalationRuleDto[];

  @ApiProperty({ description: 'Default notification channels' })
  @IsArray()
  @IsString({ each: true })
  notificationChannels: string[];
}

export class UpdateAlertRuleDto {
  @ApiProperty({ description: 'Rule name', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'Default severity', enum: ['low', 'medium', 'high', 'critical'], required: false })
  @IsEnum(['low', 'medium', 'high', 'critical'])
  @IsOptional()
  severity?: 'low' | 'medium' | 'high' | 'critical';

  @ApiProperty({ description: 'Rule conditions', required: false })
  @IsOptional()
  conditions?: any;

  @ApiProperty({ description: 'Whether the rule is enabled', required: false })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiProperty({ description: 'Escalation rules', type: [EscalationRuleDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EscalationRuleDto)
  @IsOptional()
  escalationRules?: EscalationRuleDto[];

  @ApiProperty({ description: 'Default notification channels', required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  notificationChannels?: string[];
}

export class CreateNotificationChannelDto {
  @ApiProperty({ description: 'Channel type', enum: ['email', 'sms', 'webhook', 'in-app'] })
  @IsEnum(['email', 'sms', 'webhook', 'in-app'])
  type: 'email' | 'sms' | 'webhook' | 'in-app';

  @ApiProperty({ description: 'Channel name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Channel configuration' })
  @IsOptional()
  config?: any;

  @ApiProperty({ description: 'Whether the channel is enabled', default: true })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean = true;
}

export class UpdateNotificationChannelDto {
  @ApiProperty({ description: 'Channel name', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'Channel configuration', required: false })
  @IsOptional()
  config?: any;

  @ApiProperty({ description: 'Whether the channel is enabled', required: false })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}

export class TestNotificationChannelDto {
  @ApiProperty({ description: 'Test message' })
  @IsString()
  message: string;

  @ApiProperty({ description: 'Test recipient', required: false })
  @IsString()
  @IsOptional()
  recipient?: string;
}

export class SecurityAlertMetricsDto {
  @ApiProperty({ description: 'Number of days for metrics calculation', required: false, default: 30 })
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @IsOptional()
  days?: number = 30;
}

export class SecurityAlertResponseDto {
  @ApiProperty({ description: 'Alert ID' })
  id: string;

  @ApiProperty({ description: 'Alert type' })
  type: string;

  @ApiProperty({ description: 'Alert severity' })
  severity: string;

  @ApiProperty({ description: 'Alert title' })
  title: string;

  @ApiProperty({ description: 'Alert description' })
  description: string;

  @ApiProperty({ description: 'Alert source' })
  source: string;

  @ApiProperty({ description: 'IP address', required: false })
  ipAddress?: string;

  @ApiProperty({ description: 'User ID', required: false })
  userId?: string;

  @ApiProperty({ description: 'Additional metadata', required: false })
  metadata?: any;

  @ApiProperty({ description: 'Whether alert is acknowledged' })
  acknowledged: boolean;

  @ApiProperty({ description: 'Who acknowledged the alert', required: false })
  acknowledgedBy?: string;

  @ApiProperty({ description: 'When alert was acknowledged', required: false })
  acknowledgedAt?: Date;

  @ApiProperty({ description: 'Whether alert is resolved' })
  resolved: boolean;

  @ApiProperty({ description: 'Who resolved the alert', required: false })
  resolvedBy?: string;

  @ApiProperty({ description: 'When alert was resolved', required: false })
  resolvedAt?: Date;

  @ApiProperty({ description: 'Resolution note', required: false })
  resolutionNote?: string;

  @ApiProperty({ description: 'Whether alert was escalated' })
  escalated: boolean;

  @ApiProperty({ description: 'When alert was escalated', required: false })
  escalatedAt?: Date;

  @ApiProperty({ description: 'Current escalation level' })
  escalationLevel: number;

  @ApiProperty({ description: 'Response time in seconds', required: false })
  responseTime?: number;

  @ApiProperty({ description: 'When alert was created' })
  createdAt: Date;

  @ApiProperty({ description: 'When alert was last updated' })
  updatedAt: Date;
}

export class PaginatedSecurityAlertsDto {
  @ApiProperty({ description: 'List of security alerts', type: [SecurityAlertResponseDto] })
  alerts: SecurityAlertResponseDto[];

  @ApiProperty({ description: 'Total number of alerts' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  @ApiProperty({ description: 'Number of items per page' })
  limit: number;
}
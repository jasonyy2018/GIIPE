import { IsString, IsEnum, IsOptional, IsBoolean, IsArray, IsObject, IsDateString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateNotificationDto {
  @IsEnum(['info', 'warning', 'error', 'success', 'security'])
  type: 'info' | 'warning' | 'error' | 'success' | 'security';

  @IsEnum(['system', 'user', 'content', 'security', 'analytics', 'maintenance'])
  category: 'system' | 'user' | 'content' | 'security' | 'analytics' | 'maintenance';

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsEnum(['low', 'medium', 'high', 'urgent'])
  priority: 'low' | 'medium' | 'high' | 'urgent';

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsArray()
  actions?: NotificationActionDto[];

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsBoolean()
  persistent?: boolean;
}

export class NotificationActionDto {
  @IsString()
  id: string;

  @IsString()
  label: string;

  @IsString()
  action: string;

  @IsOptional()
  @IsEnum(['primary', 'secondary', 'danger'])
  style?: 'primary' | 'secondary' | 'danger';

  @IsOptional()
  @IsString()
  url?: string;
}

export class GetNotificationsDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  type?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  category?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  priority?: string[];

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  read?: boolean;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  offset?: number;
}

export class MarkNotificationsReadDto {
  @IsArray()
  @IsString({ each: true })
  notificationIds: string[];
}

export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsObject()
  categories?: {
    system?: boolean;
    user?: boolean;
    content?: boolean;
    security?: boolean;
    analytics?: boolean;
    maintenance?: boolean;
  };

  @IsOptional()
  @IsObject()
  priorities?: {
    low?: boolean;
    medium?: boolean;
    high?: boolean;
    urgent?: boolean;
  };

  @IsOptional()
  @IsObject()
  deliveryMethods?: {
    inApp?: boolean;
    email?: boolean;
    push?: boolean;
  };

  @IsOptional()
  @IsObject()
  quietHours?: {
    enabled?: boolean;
    start?: string;
    end?: string;
  };
}

export class ExecuteNotificationActionDto {
  @IsString()
  actionId: string;
}
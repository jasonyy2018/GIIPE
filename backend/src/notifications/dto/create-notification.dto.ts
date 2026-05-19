import { IsString, IsEmail, IsObject, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum NotificationType {
  EMAIL = 'email',
  IN_APP = 'in_app',
}

export enum NotificationTemplate {
  USER_REGISTRATION = 'user_registration',
  EVENT_REGISTRATION = 'event_registration',
  SUBMISSION_RECEIVED = 'submission_received',
  SUBMISSION_APPROVED = 'submission_approved',
  SUBMISSION_REJECTED = 'submission_rejected',
  COMMENT_MODERATION = 'comment_moderation',
  PASSWORD_RESET = 'password_reset',
  EVENT_REMINDER = 'event_reminder',
}

export class CreateNotificationDto {
  @ApiProperty({ description: 'Recipient email address' })
  @IsEmail()
  to: string;

  @ApiProperty({ description: 'Notification type', enum: NotificationType })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ description: 'Template to use', enum: NotificationTemplate })
  @IsEnum(NotificationTemplate)
  template: NotificationTemplate;

  @ApiProperty({ description: 'Template variables for substitution' })
  @IsObject()
  @IsOptional()
  variables?: Record<string, any>;

  @ApiProperty({ description: 'User ID (optional)' })
  @IsString()
  @IsOptional()
  userId?: string;
}
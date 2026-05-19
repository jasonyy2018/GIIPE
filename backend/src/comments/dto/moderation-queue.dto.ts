import { IsOptional, IsEnum, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CommentStatus, CommentTargetType } from '@prisma/client';

export class ModerationQueueFiltersDto {
  @IsOptional()
  @IsEnum(CommentStatus)
  status?: CommentStatus;

  @IsOptional()
  @IsEnum(CommentTargetType)
  targetType?: CommentTargetType;

  @IsOptional()
  @IsString()
  category?: string; // Sensitive word category

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}

export class ModerationQueueResponseDto {
  id: string;
  content: string;
  status: CommentStatus;
  targetType: CommentTargetType;
  targetId: string;
  sensitiveFlags: string[];
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
  };
  target?: {
    id: string;
    title: string;
  };
  reports?: Array<{
    id: string;
    reason: string;
    description: string;
    reportedAt: Date;
    reportedBy: {
      id: string;
      username: string;
    };
  }>;
  reportCount?: number;
}
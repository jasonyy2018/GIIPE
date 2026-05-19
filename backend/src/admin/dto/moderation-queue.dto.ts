import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsInt, Min, IsArray, IsUUID } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { CommentStatus, CommentTargetType } from '@prisma/client';

export class ModerationQueueFiltersDto {
  @ApiPropertyOptional({ description: 'Filter by comment status' })
  @IsOptional()
  @IsEnum(CommentStatus)
  status?: CommentStatus;

  @ApiPropertyOptional({ description: 'Filter by target type' })
  @IsOptional()
  @IsEnum(CommentTargetType)
  targetType?: CommentTargetType;

  @ApiPropertyOptional({ description: 'Filter by sensitive word category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Search in comment content' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Sort by field', default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort order', default: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class BulkModerationDto {
  @ApiProperty({ description: 'Array of comment IDs to moderate' })
  @IsArray()
  @IsUUID(4, { each: true })
  commentIds: string[];

  @ApiProperty({ description: 'Action to perform', enum: CommentStatus })
  @IsEnum(CommentStatus)
  action: CommentStatus;

  @ApiPropertyOptional({ description: 'Optional moderation note' })
  @IsOptional()
  @IsString()
  moderationNote?: string;
}

export class ModerationQueueItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  content: string;

  @ApiProperty({ enum: CommentStatus })
  status: CommentStatus;

  @ApiProperty({ enum: CommentTargetType })
  targetType: CommentTargetType;

  @ApiProperty()
  targetId: string;

  @ApiProperty()
  sensitiveFlags: string[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  user: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
  };

  @ApiPropertyOptional()
  target?: {
    id: string;
    title: string;
  };

  @ApiProperty()
  reports: Array<{
    id: string;
    reason: string;
    description: string;
    reportedAt: Date;
    reportedBy: {
      id: string;
      username: string;
    };
  }>;

  @ApiProperty()
  reportCount: number;
}

export class ModerationQueueResponseDto {
  @ApiProperty({ type: [ModerationQueueItemDto] })
  comments: ModerationQueueItemDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

export class ModerationStatsDto {
  @ApiProperty()
  pending: number;

  @ApiProperty()
  flagged: number;

  @ApiProperty()
  approved: number;

  @ApiProperty()
  rejected: number;

  @ApiProperty()
  totalReports: number;

  @ApiProperty()
  avgResponseTime: number;

  @ApiProperty()
  moderationRate: number;
}
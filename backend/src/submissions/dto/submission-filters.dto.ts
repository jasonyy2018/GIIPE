import { IsOptional, IsEnum, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SubmissionStatus } from '@prisma/client';

export class SubmissionFiltersDto {
  @ApiPropertyOptional({
    description: 'Filter by submission status',
    enum: SubmissionStatus,
  })
  @IsOptional()
  @IsEnum(SubmissionStatus)
  status?: SubmissionStatus;

  @ApiPropertyOptional({
    description: 'Filter by event ID',
    example: 'clp123abc456def789',
  })
  @IsOptional()
  @IsString()
  eventId?: string;

  @ApiPropertyOptional({
    description: 'Filter by user ID',
    example: 'clp123abc456def789',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Search in submission titles, descriptions, or user names',
    example: 'machine learning',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Submission date from (ISO string)',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsString()
  createdFrom?: string;

  @ApiPropertyOptional({
    description: 'Submission date to (ISO string)',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsString()
  createdTo?: string;

  @ApiPropertyOptional({
    description: 'Sort field',
    enum: ['createdAt', 'updatedAt', 'title', 'status', 'eventTitle', 'userName'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Number of items to skip',
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
import { IsString, IsOptional, IsDateString, IsInt, IsArray, IsEnum, Min, Max, MaxLength, IsBoolean, IsUUID } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { EventStatus } from '@prisma/client';

export class AdminCreateEventDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(100000)
  description?: string;

  @IsOptional()
  @IsString()
  contentMarkdown?: string;

  @IsOptional()
  @IsString()
  contentHtml?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  maxAttendees?: number;

  @IsOptional()
  @IsDateString()
  registrationDeadline?: string;

  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => Array.isArray(value) ? value : [value])
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isTemplate?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  templateName?: string;

  @IsOptional()
  @IsDateString()
  scheduledPublishAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  submitUrl?: string;

  @IsOptional()
  @IsString()
  pdfAttachment?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  pdfAttachmentName?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  showPdfAttachment?: boolean;

  @IsOptional()
  @IsArray()
  honorableGuests?: Array<{
    photoUrl: string;
    name: string;
    title: string;
  }>;
}

export class AdminUpdateEventDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100000)
  description?: string;

  @IsOptional()
  @IsString()
  contentMarkdown?: string;

  @IsOptional()
  @IsString()
  contentHtml?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  maxAttendees?: number;

  @IsOptional()
  @IsDateString()
  registrationDeadline?: string;

  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => Array.isArray(value) ? value : [value])
  tags?: string[];

  @IsOptional()
  @IsDateString()
  scheduledPublishAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  submitUrl?: string;

  @IsOptional()
  @IsString()
  pdfAttachment?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  pdfAttachmentName?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  showPdfAttachment?: boolean;

  @IsOptional()
  @IsArray()
  honorableGuests?: Array<{
    photoUrl: string;
    name: string;
    title: string;
  }>;
}

export class AdminEventFiltersDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsDateString()
  startDateFrom?: string;

  @IsOptional()
  @IsDateString()
  startDateTo?: string;

  @IsOptional()
  @IsDateString()
  endDateFrom?: string;

  @IsOptional()
  @IsDateString()
  endDateTo?: string;

  @IsOptional()
  @IsString()
  createdBy?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isTemplate?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.toLowerCase())
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class DuplicateEventDto {
  @IsUUID()
  sourceEventId: string;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  copyRegistrations?: boolean = false;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  copySubmissions?: boolean = false;
}

export class EventWorkflowDto {
  @IsEnum(EventStatus)
  targetStatus: EventStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class BulkEventActionDto {
  @IsArray()
  @IsUUID(undefined, { each: true })
  eventIds: string[];

  @IsString()
  action: 'publish' | 'unpublish' | 'cancel' | 'delete' | 'duplicate';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
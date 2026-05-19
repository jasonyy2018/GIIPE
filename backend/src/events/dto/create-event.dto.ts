import { IsString, IsOptional, IsDateString, IsInt, IsArray, IsEnum, IsBoolean, Min, MaxLength } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { EventStatus } from '@prisma/client';

export class CreateEventDto {
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

  @IsOptional()
  @IsString()
  featuredImage?: string;

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
  @IsString()
  @MaxLength(500)
  submitUrl?: string;

  @IsOptional()
  @IsArray()
  honorableGuests?: Array<{
    photoUrl: string;
    name: string;
    title: string;
  }>;

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
  @IsInt()
  @Min(0)
  @Type(() => Number)
  price?: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isPaymentEnabled?: boolean;
}
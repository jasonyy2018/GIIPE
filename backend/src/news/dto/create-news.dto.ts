import { IsString, IsOptional, IsArray, IsEnum, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { EventStatus } from '@prisma/client';

export class CreateNewsDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
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
  @IsEnum(EventStatus)
  status?: EventStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => Array.isArray(value) ? value : [value])
  tags?: string[];
}
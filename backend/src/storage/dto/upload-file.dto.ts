import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum FileCategory {
  SUBMISSION = 'submission',
  AVATAR = 'avatar',
  DOCUMENT = 'document',
  IMAGE = 'image',
  PDF = 'pdf',
}

export class UploadFileDto {
  @ApiProperty({
    description: 'Category of the file',
    enum: FileCategory,
    example: FileCategory.SUBMISSION,
  })
  @IsEnum(FileCategory)
  category: FileCategory;

  @ApiPropertyOptional({
    description: 'Reference ID (e.g., submission ID, user ID)',
    example: 'clp123abc456def789',
  })
  @IsOptional()
  @IsString()
  referenceId?: string;

  @ApiPropertyOptional({
    description: 'Custom filename (without extension)',
    example: 'research-paper',
  })
  @IsOptional()
  @IsString()
  customName?: string;
}
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SubmissionStatus } from '@prisma/client';

export class UpdateSubmissionDto {
  @ApiPropertyOptional({
    description: 'Title of the submission',
    example: 'Machine Learning in Healthcare: A Comprehensive Study',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Description of the submission',
    example: 'This paper explores the applications of machine learning algorithms in healthcare diagnostics...',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Status of the submission',
    enum: SubmissionStatus,
    example: SubmissionStatus.UNDER_REVIEW,
  })
  @IsOptional()
  @IsEnum(SubmissionStatus)
  status?: SubmissionStatus;
}
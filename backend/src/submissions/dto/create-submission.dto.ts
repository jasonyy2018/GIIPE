import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSubmissionDto {
  @ApiProperty({
    description: 'Title of the submission',
    example: 'Machine Learning in Healthcare: A Comprehensive Study',
  })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    description: 'Description of the submission',
    example: 'This paper explores the applications of machine learning algorithms in healthcare diagnostics...',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'ID of the event this submission is for',
    example: 'clp123abc456def789',
  })
  @IsString()
  eventId: string;
}
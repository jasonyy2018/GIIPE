import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEmailTemplateDto {
  @ApiProperty({ description: 'Template name/key' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Email subject template' })
  @IsString()
  subject: string;

  @ApiProperty({ description: 'HTML body template' })
  @IsString()
  htmlBody: string;

  @ApiProperty({ description: 'Plain text body template' })
  @IsString()
  @IsOptional()
  textBody?: string;

  @ApiProperty({ description: 'Template description' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateEmailTemplateDto {
  @ApiProperty({ description: 'Email subject template' })
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiProperty({ description: 'HTML body template' })
  @IsString()
  @IsOptional()
  htmlBody?: string;

  @ApiProperty({ description: 'Plain text body template' })
  @IsString()
  @IsOptional()
  textBody?: string;

  @ApiProperty({ description: 'Template description' })
  @IsString()
  @IsOptional()
  description?: string;
}
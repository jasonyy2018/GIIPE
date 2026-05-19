import { IsString, IsNotEmpty, IsEnum, MaxLength } from 'class-validator';
import { ReportReason } from '@prisma/client';

export class ReportCommentDto {
  @IsEnum(ReportReason)
  reason: ReportReason;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string;
}
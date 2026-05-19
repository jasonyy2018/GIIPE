import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { CommentStatus } from '@prisma/client';

export class ModerateCommentDto {
  @IsEnum(CommentStatus)
  status: CommentStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  moderationNote?: string;
}
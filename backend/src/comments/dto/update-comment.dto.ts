import { IsString, IsOptional, MaxLength, IsEnum } from 'class-validator';
import { CommentStatus } from '@prisma/client';

export class UpdateCommentDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  content?: string;

  @IsOptional()
  @IsEnum(CommentStatus)
  status?: CommentStatus;
}
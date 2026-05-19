import { IsString, IsNotEmpty, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { CommentTargetType } from '@prisma/client';

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;

  @IsEnum(CommentTargetType)
  targetType: CommentTargetType;

  @IsString()
  @IsNotEmpty()
  targetId: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}
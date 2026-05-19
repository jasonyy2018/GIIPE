import { CommentStatus, CommentTargetType } from '@prisma/client';

export class CommentResponseDto {
  id: string;
  content: string;
  status: CommentStatus;
  targetType: CommentTargetType;
  targetId: string;
  sensitiveFlags: string[];
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  user: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
  replies?: CommentResponseDto[];
  replyCount?: number;
  
  // Moderation fields (only visible to admins)
  moderationNote?: string;
  moderatedBy?: string;
  moderatedAt?: Date;
  moderator?: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
  };
  reports?: Array<{
    id: string;
    reason: string;
    description?: string;
    createdAt: Date;
    reporter: {
      id: string;
      username: string;
    };
  }>;
  reportCount?: number;
}
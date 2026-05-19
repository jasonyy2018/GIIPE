import { CommentResponseDto } from './comment-response.dto';

export class ModerationQueueResponseDto {
  comments: CommentResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class CommentReportResponseDto {
  id: string;
  reason: string;
  description?: string;
  createdAt: Date;
  reporter: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
  };
}
export enum CommentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  FLAGGED = 'FLAGGED',
}

export enum CommentTargetType {
  EVENT = 'EVENT',
  NEWS = 'NEWS',
  SUBMISSION = 'SUBMISSION',
}

export enum ReportReason {
  SPAM = 'SPAM',
  INAPPROPRIATE = 'INAPPROPRIATE',
  HARASSMENT = 'HARASSMENT',
  HATE_SPEECH = 'HATE_SPEECH',
  MISINFORMATION = 'MISINFORMATION',
  OTHER = 'OTHER',
}

export interface ModerationQueueItem {
  id: string;
  content: string;
  status: CommentStatus;
  targetType: CommentTargetType;
  targetId: string;
  sensitiveFlags: string[];
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
  };
  target?: {
    id: string;
    title: string;
  };
  reports: Array<{
    id: string;
    reason: ReportReason;
    description: string;
    reportedAt: string;
    reportedBy: {
      id: string;
      username: string;
    };
  }>;
  reportCount: number;
}

export interface ModerationQueueResponse {
  comments: ModerationQueueItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ModerationStats {
  pending: number;
  flagged: number;
  approved: number;
  rejected: number;
  totalReports: number;
  avgResponseTime: number;
  moderationRate: number;
}

export interface ModerationFilters {
  status?: CommentStatus;
  targetType?: CommentTargetType;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface BulkModerationRequest {
  commentIds: string[];
  action: CommentStatus;
  moderationNote?: string;
}

export interface BulkModerationResponse {
  success: number;
  failed: number;
  errors: string[];
}

export interface CommentDetails extends ModerationQueueItem {
  moderationNote?: string;
  moderatedBy?: string;
  moderatedAt?: string;
  moderator?: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
  };
  user: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
    createdAt?: string;
  };
  target?: {
    id: string;
    title: string;
    description?: string;
  };
}
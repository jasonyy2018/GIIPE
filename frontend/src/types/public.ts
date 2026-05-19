export interface Event {
  id: string;
  title: string;
  description?: string;
  contentMarkdown?: string;
  contentHtml?: string;
  featuredImage?: string;
  pdfAttachment?: string;
  pdfAttachmentName?: string;
  showPdfAttachment?: boolean;
  submitUrl?: string;
  honorableGuests?: Array<{
    photoUrl: string;
    name: string;
    title: string;
  }>;
  startDate: string;
  endDate: string;
  location: string;
  maxAttendees: number;
  registrationDeadline?: string;
  status: EventStatus;
  tags: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  registrationCount?: number;
  isRegistered?: boolean;
  price?: number;
  isPaymentEnabled?: boolean;
}

export enum EventStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED'
}

export interface News {
  id: string;
  title: string;
  description?: string;
  content?: string;
  contentMarkdown?: string;
  contentHtml?: string;
  featuredImage?: string;
  pdfAttachment?: string;
  pdfAttachmentName?: string;
  excerpt?: string;
  status: NewsStatus;
  tags: string[];
  createdBy: string;
  creator?: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
  };
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

// News uses EventStatus in backend for consistency, but we map it logically
export enum NewsStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  // For news, we don't use CANCELLED or COMPLETED - only DRAFT and PUBLISHED
}

export interface PaginatedResponse<T> {
  data?: T[];  // Keep for backward compatibility
  events?: T[];  // For events API
  news?: T[];    // For news API
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export interface EventFilters {
  status?: EventStatus;
  tags?: string[];
  startDate?: string;
  endDate?: string;
  startDateFrom?: string; // Filter events with startDate >= this date
  startDateTo?: string;   // Filter events with startDate <= this date
  endDateFrom?: string;   // Filter events with endDate >= this date
  endDateTo?: string;     // Filter events with endDate <= this date
  search?: string;
  location?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface NewsFilters {
  status?: NewsStatus;
  tags?: string[];
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface Registration {
  id: string;
  userId: string;
  eventId: string;
  status: RegistrationStatus;
  registeredAt: string;
  additionalInfo?: Record<string, any>;
  event?: Event;
}

export enum RegistrationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  WAITLISTED = 'waitlisted'
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  profile: UserProfile;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  mustChangePassword?: boolean;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  EDITOR = 'EDITOR',
  MEMBER = 'MEMBER'
}

export interface UserProfile {
  firstName?: string;
  lastName?: string;
  bio?: string;
  organization?: string;
  website?: string;
  avatar?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  mustChangePassword?: boolean;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  organization?: string;
  phone?: string;
}

export interface Comment {
  id: string;
  content: string;
  userId: string;
  eventId?: string;
  newsId?: string;
  parentId?: string;
  status: CommentStatus;
  createdAt: string;
  updatedAt: string;
  user?: User;
  replies?: Comment[];
}

export enum CommentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export interface CommentDto {
  content: string;
  eventId?: string;
  newsId?: string;
  parentId?: string;
}

export interface Submission {
  id: string;
  title: string;
  description: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  userId: string;
  eventId?: string;
  status: SubmissionStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewComments?: string;
  user?: User;
  event?: Event;
}

export enum SubmissionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  UNDER_REVIEW = 'under_review'
}
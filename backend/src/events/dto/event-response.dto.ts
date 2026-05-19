import { Event, User, EventStatus } from '@prisma/client';

type EventWithRelations = Event & {
  creator?: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
  };
  _count?: {
    registrations: number;
    submissions: number;
  };
};

function normalizePublicImageUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  const v = String(url).trim();
  if (!v) return undefined;
  if (v.startsWith('/api/uploads/')) return v;

  // Convert absolute backend/upload URLs to frontend same-origin proxy path.
  const apiMatch = v.match(/\/api\/uploads\/(.+)$/);
  if (apiMatch) return `/api/uploads/${apiMatch[1]}`;
  const uploadsMatch = v.match(/\/uploads\/(.+)$/);
  if (uploadsMatch) return `/api/uploads/${uploadsMatch[1]}`;

  return v;
}

export class EventResponseDto {
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
  startDate: Date;
  endDate: Date;
  location?: string;
  maxAttendees?: number;
  registrationDeadline?: Date;
  status: EventStatus;
  tags: string[];
  price: number;
  isPaymentEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  creator?: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
  };
  registrationCount?: number;
  submissionCount?: number;

  constructor(event: EventWithRelations) {
    this.id = event.id;
    this.title = event.title;
    this.description = event.description;
    this.contentMarkdown = event.contentMarkdown;
    this.contentHtml = event.contentHtml;
    this.featuredImage = normalizePublicImageUrl(event.featuredImage);
    this.pdfAttachment = event.pdfAttachment;
    this.pdfAttachmentName = event.pdfAttachmentName;
    this.showPdfAttachment = event.showPdfAttachment ?? true;
    this.submitUrl = event.submitUrl;
    // Parse JSON if it's a string, otherwise use as is
    if (event.honorableGuests) {
      if (typeof event.honorableGuests === 'string') {
        try {
          this.honorableGuests = JSON.parse(event.honorableGuests);
        } catch {
          this.honorableGuests = [];
        }
      } else if (Array.isArray(event.honorableGuests)) {
        this.honorableGuests = event.honorableGuests as Array<{
          photoUrl: string;
          name: string;
          title: string;
        }>;
      } else {
        this.honorableGuests = [];
      }
    } else {
      this.honorableGuests = [];
    }
    this.startDate = event.startDate;
    this.endDate = event.endDate;
    this.location = event.location;
    this.maxAttendees = event.maxAttendees;
    this.registrationDeadline = event.registrationDeadline;
    this.status = event.status;
    this.tags = event.tags;
    this.price = event.price || 0;
    this.isPaymentEnabled = event.isPaymentEnabled || false;
    this.createdAt = event.createdAt;
    this.updatedAt = event.updatedAt;
    this.createdBy = event.createdBy;
    
    if (event.creator) {
      this.creator = {
        id: event.creator.id,
        username: event.creator.username,
        firstName: event.creator.firstName,
        lastName: event.creator.lastName,
      };
    }

    if (event._count) {
      this.registrationCount = event._count.registrations || 0;
      this.submissionCount = event._count.submissions || 0;
    }
  }
}

export class PaginatedEventsDto {
  events: EventResponseDto[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;

  constructor(events: EventResponseDto[], total: number, limit: number, offset: number) {
    this.events = events;
    this.total = total;
    this.limit = limit;
    this.offset = offset;
    this.hasMore = offset + limit < total;
  }
}
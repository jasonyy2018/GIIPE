import { News, User, EventStatus } from '@prisma/client';

type NewsWithRelations = News & {
  creator?: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
  };
};

export class NewsResponseDto {
  id: string;
  title: string;
  description?: string;
  contentMarkdown?: string;
  contentHtml?: string;
  featuredImage?: string;
  pdfAttachment?: string;
  pdfAttachmentName?: string;
  status: EventStatus;
  tags: string[];
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  creator?: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
  };

  constructor(news: NewsWithRelations) {
    this.id = news.id;
    this.title = news.title;
    this.description = news.description;
    this.contentMarkdown = news.contentMarkdown;
    this.contentHtml = news.contentHtml;
    this.featuredImage = news.featuredImage;
    this.pdfAttachment = news.pdfAttachment;
    this.pdfAttachmentName = news.pdfAttachmentName;
    this.status = news.status;
    this.tags = news.tags;
    this.publishedAt = news.publishedAt;
    this.createdAt = news.createdAt;
    this.updatedAt = news.updatedAt;
    this.createdBy = news.createdBy;
    
    if (news.creator) {
      this.creator = {
        id: news.creator.id,
        username: news.creator.username,
        firstName: news.creator.firstName,
        lastName: news.creator.lastName,
      };
    }
  }
}

export class PaginatedNewsDto {
  news: NewsResponseDto[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;

  constructor(news: NewsResponseDto[], total: number, limit: number, offset: number) {
    this.news = news;
    this.total = total;
    this.limit = limit;
    this.offset = offset;
    this.hasMore = offset + limit < total;
  }
}
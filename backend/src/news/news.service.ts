import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ContentService } from '../content/content.service';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { NewsFiltersDto } from './dto/news-filters.dto';
import { NewsResponseDto, PaginatedNewsDto } from './dto/news-response.dto';
import { EventStatus, UserRole, Prisma } from '@prisma/client';
import { extractFeaturedImage } from '../common/utils/markdown.utils';

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly contentService: ContentService,
  ) {}

  async create(createNewsDto: CreateNewsDto, userId: string): Promise<NewsResponseDto> {
    try {
      // Process content if provided
      let processedContent = null;
      if (createNewsDto.contentMarkdown) {
        processedContent = await this.contentService.processMarkdown(createNewsDto.contentMarkdown);
      } else if (createNewsDto.contentHtml) {
        processedContent = await this.contentService.processHtml(createNewsDto.contentHtml);
      }

      // Extract featured image from content
      const featuredImage = createNewsDto.featuredImage || 
        extractFeaturedImage(
          processedContent?.markdown || createNewsDto.contentMarkdown,
          processedContent?.html || createNewsDto.contentHtml
        );

      const news = await this.prisma.news.create({
        data: {
          title: createNewsDto.title,
          description: createNewsDto.description,
          contentMarkdown: processedContent?.markdown || createNewsDto.contentMarkdown,
          contentHtml: processedContent?.html || createNewsDto.contentHtml,
          featuredImage,
          pdfAttachment: createNewsDto.pdfAttachment,
          pdfAttachmentName: createNewsDto.pdfAttachmentName,
          status: createNewsDto.status || EventStatus.DRAFT,
          tags: createNewsDto.tags || [],
          publishedAt: createNewsDto.status === EventStatus.PUBLISHED ? new Date() : null,
          createdBy: userId,
        },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      this.logger.log(`News article created: ${news.id} by user ${userId}`);
      return new NewsResponseDto(news);
    } catch (error) {
      this.logger.error('Error creating news article', error);
      throw new BadRequestException('Failed to create news article');
    }
  }

  async findAll(filters: NewsFiltersDto, userRole?: UserRole): Promise<PaginatedNewsDto> {
    try {
      const where: Prisma.NewsWhereInput = {};

      // Apply filters
      if (filters.search) {
        where.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      // Apply status filter only if explicitly provided
      // If no status filter is provided:
      //   - ADMIN/EDITOR: show all statuses (no filter)
      //   - Non-admin authenticated users: show only published
      //   - Unauthenticated users (public route): show only published
      this.logger.debug(`findAll - userRole: ${userRole}, filters.status: ${filters.status}`);
      if (filters.status) {
        where.status = filters.status;
        this.logger.debug(`Applied status filter: ${filters.status}`);
      } else if (userRole === UserRole.ADMIN || userRole === UserRole.EDITOR) {
        // ADMIN/EDITOR can see all statuses when no filter is provided - no status filter applied
        this.logger.debug('ADMIN/EDITOR user - no status filter applied');
      } else {
        // Non-admin users or unauthenticated users can only see published news
        where.status = EventStatus.PUBLISHED;
        this.logger.debug('Non-admin or unauthenticated user - applying PUBLISHED filter');
      }

      if (filters.tag) {
        where.tags = { has: filters.tag };
      }

      if (filters.publishedFrom || filters.publishedTo) {
        where.publishedAt = {};
        if (filters.publishedFrom) {
          where.publishedAt.gte = new Date(filters.publishedFrom);
        }
        if (filters.publishedTo) {
          where.publishedAt.lte = new Date(filters.publishedTo);
        }
      }

      if (filters.createdBy) {
        where.createdBy = filters.createdBy;
      }

      // Build orderBy
      const orderBy: Prisma.NewsOrderByWithRelationInput = {};
      if (filters.sortBy === 'title') {
        orderBy.title = filters.sortOrder;
      } else if (filters.sortBy === 'publishedAt') {
        orderBy.publishedAt = filters.sortOrder;
      } else if (filters.sortBy === 'status') {
        orderBy.status = filters.sortOrder;
      } else {
        orderBy.createdAt = filters.sortOrder;
      }

      const [news, total] = await Promise.all([
        this.prisma.news.findMany({
          where,
          include: {
            creator: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy,
          take: filters.limit,
          skip: filters.offset,
        }),
        this.prisma.news.count({ where }),
      ]);

      const newsDtos = news.map(newsItem => new NewsResponseDto(newsItem));
      return new PaginatedNewsDto(newsDtos, total, filters.limit, filters.offset);
    } catch (error) {
      this.logger.error('Error fetching news articles', error);
      throw new BadRequestException('Failed to fetch news articles');
    }
  }

  async findOne(id: string, userRole?: UserRole): Promise<NewsResponseDto> {
    try {
      const news = await this.prisma.news.findUnique({
        where: { id },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (!news) {
        throw new NotFoundException('News article not found');
      }

      // Check if user can view this news article
      if (news.status !== EventStatus.PUBLISHED && 
          userRole !== UserRole.ADMIN && 
          userRole !== UserRole.EDITOR) {
        throw new ForbiddenException('Access denied to this news article');
      }

      return new NewsResponseDto(news);
    } catch (error) {
      this.logger.error(`Error fetching news article ${id}`, error);
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch news article');
    }
  }

  async update(id: string, updateNewsDto: UpdateNewsDto, userId: string, userRole: UserRole): Promise<NewsResponseDto> {
    try {
      const existingNews = await this.prisma.news.findUnique({
        where: { id },
      });

      if (!existingNews) {
        throw new NotFoundException('News article not found');
      }

      // Check permissions
      if (userRole !== UserRole.ADMIN && existingNews.createdBy !== userId) {
        throw new ForbiddenException('You can only update your own news articles');
      }

      // Process content if provided
      let processedContent = null;
      if (updateNewsDto.contentMarkdown) {
        processedContent = await this.contentService.processMarkdown(updateNewsDto.contentMarkdown);
      } else if (updateNewsDto.contentHtml) {
        processedContent = await this.contentService.processHtml(updateNewsDto.contentHtml);
      }

      const updateData: Prisma.NewsUpdateInput = {
        ...updateNewsDto,
      };

      if (processedContent) {
        updateData.contentMarkdown = processedContent.markdown;
        updateData.contentHtml = processedContent.html;
      }

      // Extract featured image if content was updated
      if (updateNewsDto.contentMarkdown || updateNewsDto.contentHtml || processedContent) {
        const featuredImage = updateNewsDto.featuredImage || 
          extractFeaturedImage(
            processedContent?.markdown || updateNewsDto.contentMarkdown,
            processedContent?.html || updateNewsDto.contentHtml
          );
        updateData.featuredImage = featuredImage;
      }

      // Set publishedAt if status is being changed to published
      if (updateNewsDto.status === EventStatus.PUBLISHED && existingNews.status !== EventStatus.PUBLISHED) {
        updateData.publishedAt = new Date();
      } else if (updateNewsDto.status && updateNewsDto.status !== EventStatus.PUBLISHED) {
        updateData.publishedAt = null;
      }

      const news = await this.prisma.news.update({
        where: { id },
        data: updateData,
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      this.logger.log(`News article updated: ${news.id} by user ${userId}`);
      return new NewsResponseDto(news);
    } catch (error) {
      this.logger.error(`Error updating news article ${id}`, error);
      if (error instanceof NotFoundException || error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to update news article');
    }
  }

  async remove(id: string, userId: string, userRole: UserRole): Promise<void> {
    try {
      const existingNews = await this.prisma.news.findUnique({
        where: { id },
      });

      if (!existingNews) {
        throw new NotFoundException('News article not found');
      }

      // Check permissions
      if (userRole !== UserRole.ADMIN && existingNews.createdBy !== userId) {
        throw new ForbiddenException('You can only delete your own news articles');
      }

      await this.prisma.news.delete({
        where: { id },
      });

      this.logger.log(`News article deleted: ${id} by user ${userId}`);
    } catch (error) {
      this.logger.error(`Error deleting news article ${id}`, error);
      if (error instanceof NotFoundException || error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to delete news article');
    }
  }

  async publish(id: string, userId: string, userRole: UserRole): Promise<NewsResponseDto> {
    try {
      const existingNews = await this.prisma.news.findUnique({
        where: { id },
      });

      if (!existingNews) {
        throw new NotFoundException('News article not found');
      }

      // Check permissions
      if (userRole !== UserRole.ADMIN && userRole !== UserRole.EDITOR) {
        throw new ForbiddenException('Only admins and editors can publish news articles');
      }

      if (existingNews.status === EventStatus.PUBLISHED) {
        throw new BadRequestException('News article is already published');
      }

      const news = await this.prisma.news.update({
        where: { id },
        data: { 
          status: EventStatus.PUBLISHED,
          publishedAt: new Date(),
        },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      this.logger.log(`News article published: ${news.id} by user ${userId}`);
      return new NewsResponseDto(news);
    } catch (error) {
      this.logger.error(`Error publishing news article ${id}`, error);
      if (error instanceof NotFoundException || error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to publish news article');
    }
  }

  async getNewsTags(): Promise<string[]> {
    try {
      const news = await this.prisma.news.findMany({
        select: { tags: true },
        where: { status: EventStatus.PUBLISHED },
      });

      const allTags = news.flatMap(newsItem => newsItem.tags);
      const uniqueTags = [...new Set(allTags)].sort();
      
      return uniqueTags;
    } catch (error) {
      this.logger.error('Error fetching news tags', error);
      throw new BadRequestException('Failed to fetch news tags');
    }
  }

  async getFeaturedNews(limit: number = 5): Promise<NewsResponseDto[]> {
    try {
      const news = await this.prisma.news.findMany({
        where: { 
          status: EventStatus.PUBLISHED,
          publishedAt: { not: null },
        },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { publishedAt: 'desc' },
        take: limit,
      });

      return news.map(newsItem => new NewsResponseDto(newsItem));
    } catch (error) {
      this.logger.error('Error fetching featured news', error);
      throw new BadRequestException('Failed to fetch featured news');
    }
  }
}
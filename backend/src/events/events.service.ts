import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ContentService } from '../content/content.service';
import { CacheService } from '../common/cache/cache.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventFiltersDto } from './dto/event-filters.dto';
import { EventResponseDto, PaginatedEventsDto } from './dto/event-response.dto';
import { EventStatus, UserRole, Prisma } from '@prisma/client';
import { extractFeaturedImage } from '../common/utils/markdown.utils';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly contentService: ContentService,
    private readonly cacheService: CacheService,
  ) {}

  async create(createEventDto: CreateEventDto, userId: string): Promise<EventResponseDto> {
    try {
      // Validate dates
      const startDate = new Date(createEventDto.startDate);
      const endDate = new Date(createEventDto.endDate);
      
      if (startDate >= endDate) {
        throw new BadRequestException('Start date must be before end date');
      }

      if (createEventDto.registrationDeadline) {
        const regDeadline = new Date(createEventDto.registrationDeadline);
        if (regDeadline >= startDate) {
          throw new BadRequestException('Registration deadline must be before event start date');
        }
      }

      // Process content if provided
      let processedContent = null;
      if (createEventDto.contentMarkdown) {
        processedContent = await this.contentService.processMarkdown(createEventDto.contentMarkdown);
      } else if (createEventDto.contentHtml) {
        processedContent = await this.contentService.processHtml(createEventDto.contentHtml);
      }

      // Extract featured image from content
      const featuredImage = createEventDto.featuredImage || 
        extractFeaturedImage(
          processedContent?.markdown || createEventDto.contentMarkdown,
          processedContent?.html || createEventDto.contentHtml
        );

      const event = await this.prisma.event.create({
        data: {
          title: createEventDto.title,
          description: createEventDto.description,
          contentMarkdown: processedContent?.markdown || createEventDto.contentMarkdown,
          contentHtml: processedContent?.html || createEventDto.contentHtml,
          featuredImage,
          pdfAttachment: createEventDto.pdfAttachment,
          pdfAttachmentName: createEventDto.pdfAttachmentName,
          showPdfAttachment: createEventDto.showPdfAttachment ?? true,
          submitUrl: createEventDto.submitUrl,
          honorableGuests: createEventDto.honorableGuests || [],
          startDate,
          endDate,
          location: createEventDto.location,
          maxAttendees: createEventDto.maxAttendees,
          registrationDeadline: createEventDto.registrationDeadline ? new Date(createEventDto.registrationDeadline) : null,
          status: createEventDto.status || EventStatus.DRAFT,
          tags: createEventDto.tags || [],
          price: createEventDto.price || 0,
          isPaymentEnabled: createEventDto.isPaymentEnabled || false,
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
          _count: {
            select: {
              registrations: true,
              submissions: true,
            },
          },
        },
      });

      this.logger.log(`Event created: ${event.id} by user ${userId}`);
      
      // Invalidate cache for event lists since a new event was created
      try {
        await this.cacheService.invalidateEventCache(event.id);
      } catch (error) {
        this.logger.warn('Failed to invalidate cache after event creation', error);
      }
      
      return new EventResponseDto(event);
    } catch (error) {
      this.logger.error('Error creating event', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create event');
    }
  }

  async findAll(filters: EventFiltersDto, userRole?: UserRole): Promise<PaginatedEventsDto> {
    try {
      const where: Prisma.EventWhereInput = {};

      // Apply filters
      if (filters.search) {
        where.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
          { location: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      // Apply status filter only if explicitly provided
      // If no status filter is provided:
      //   - ADMIN/EDITOR: show all statuses (no filter)
      //   - Non-admin authenticated users: show PUBLISHED and COMPLETED events
      //   - Unauthenticated users (public route): show PUBLISHED and COMPLETED events
      this.logger.debug(`findAll - userRole: ${userRole}, filters.status: ${filters.status}`);
      if (filters.status) {
        where.status = filters.status;
        this.logger.debug(`Applied status filter: ${filters.status}`);
      } else if (userRole === UserRole.ADMIN || userRole === UserRole.EDITOR) {
        // ADMIN/EDITOR can see all statuses when no filter is provided - no status filter applied
        this.logger.debug('ADMIN/EDITOR user - no status filter applied');
      } else {
        // Non-admin users or unauthenticated users can see PUBLISHED and COMPLETED events
        where.status = { in: [EventStatus.PUBLISHED, EventStatus.COMPLETED] };
        this.logger.debug('Non-admin or unauthenticated user - applying PUBLISHED and COMPLETED filter');
      }

      if (filters.location) {
        where.location = { contains: filters.location, mode: 'insensitive' };
      }

      if (filters.tag) {
        where.tags = { has: filters.tag };
      }

      if (filters.startDateFrom || filters.startDateTo) {
        where.startDate = {};
        if (filters.startDateFrom) {
          (where.startDate as any).gte = new Date(filters.startDateFrom);
        }
        if (filters.startDateTo) {
          (where.startDate as any).lte = new Date(filters.startDateTo);
        }
      }

      if (filters.endDateFrom || filters.endDateTo) {
        where.endDate = {};
        if (filters.endDateFrom) {
          (where.endDate as any).gte = new Date(filters.endDateFrom);
        }
        if (filters.endDateTo) {
          (where.endDate as any).lte = new Date(filters.endDateTo);
        }
      }

      if (filters.createdBy) {
        where.createdBy = filters.createdBy;
      }

      // Build orderBy
      const orderBy: Prisma.EventOrderByWithRelationInput = {};
      if (filters.sortBy === 'title') {
        orderBy.title = filters.sortOrder;
      } else if (filters.sortBy === 'startDate') {
        orderBy.startDate = filters.sortOrder;
      } else if (filters.sortBy === 'endDate') {
        orderBy.endDate = filters.sortOrder;
      } else if (filters.sortBy === 'status') {
        orderBy.status = filters.sortOrder;
      } else {
        orderBy.createdAt = filters.sortOrder;
      }

      const [events, total] = await Promise.all([
        this.prisma.event.findMany({
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
            _count: {
              select: {
                registrations: true,
                submissions: true,
              },
            },
          },
          orderBy,
          take: filters.limit,
          skip: filters.offset,
        }),
        this.prisma.event.count({ where }),
      ]);

      this.logger.debug(`findAll - Found ${events.length} events, total: ${total}, where: ${JSON.stringify(where)}`);
      const eventDtos = events.map(event => new EventResponseDto(event));
      return new PaginatedEventsDto(eventDtos, total, filters.limit, filters.offset);
    } catch (error) {
      this.logger.error('Error fetching events', error);
      throw new BadRequestException('Failed to fetch events');
    }
  }

  async findOne(id: string, userRole?: UserRole): Promise<EventResponseDto> {
    try {
      const event = await this.prisma.event.findUnique({
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
          _count: {
            select: {
              registrations: true,
              submissions: true,
            },
          },
        },
      });

      if (!event) {
        throw new NotFoundException('Event not found');
      }

      // Check if user can view this event
      // Allow public access to PUBLISHED and COMPLETED events
      // Only ADMIN/EDITOR can view DRAFT or other statuses
      const isPublicStatus = event.status === EventStatus.PUBLISHED || event.status === EventStatus.COMPLETED;
      if (!isPublicStatus && 
          userRole !== UserRole.ADMIN && 
          userRole !== UserRole.EDITOR) {
        throw new ForbiddenException('Access denied to this event');
      }

      return new EventResponseDto(event);
    } catch (error) {
      this.logger.error(`Error fetching event ${id}`, error);
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch event');
    }
  }

  async update(id: string, updateEventDto: UpdateEventDto, userId: string, userRole: UserRole): Promise<EventResponseDto> {
    try {
      const existingEvent = await this.prisma.event.findUnique({
        where: { id },
      });

      if (!existingEvent) {
        throw new NotFoundException('Event not found');
      }

      // Check permissions
      if (userRole !== UserRole.ADMIN && existingEvent.createdBy !== userId) {
        throw new ForbiddenException('You can only update your own events');
      }

      // Validate dates if provided
      const startDate = updateEventDto.startDate ? new Date(updateEventDto.startDate) : existingEvent.startDate;
      const endDate = updateEventDto.endDate ? new Date(updateEventDto.endDate) : existingEvent.endDate;
      
      if (startDate >= endDate) {
        throw new BadRequestException('Start date must be before end date');
      }

      if (updateEventDto.registrationDeadline) {
        const regDeadline = new Date(updateEventDto.registrationDeadline);
        if (regDeadline >= startDate) {
          throw new BadRequestException('Registration deadline must be before event start date');
        }
      }

      // Process content if provided
      let processedContent = null;
      if (updateEventDto.contentMarkdown) {
        try {
          processedContent = await this.contentService.processMarkdown(updateEventDto.contentMarkdown);
        } catch (error) {
          this.logger.warn(`Failed to process markdown for event ${id}, saving raw markdown instead`, error);
          // If markdown processing fails, still save the raw markdown
          // The frontend can handle rendering markdown if HTML is not available
        }
      } else if (updateEventDto.contentHtml) {
        try {
          processedContent = await this.contentService.processHtml(updateEventDto.contentHtml);
        } catch (error) {
          this.logger.warn(`Failed to process HTML for event ${id}, saving raw HTML instead`, error);
        }
      }

      const updateData: Prisma.EventUpdateInput = {
        ...updateEventDto,
        startDate: updateEventDto.startDate ? new Date(updateEventDto.startDate) : undefined,
        endDate: updateEventDto.endDate ? new Date(updateEventDto.endDate) : undefined,
        registrationDeadline: updateEventDto.registrationDeadline ? new Date(updateEventDto.registrationDeadline) : undefined,
      };

      if (processedContent) {
        updateData.contentMarkdown = processedContent.markdown;
        updateData.contentHtml = processedContent.html;
      } else if (updateEventDto.contentMarkdown) {
        // If processing failed but we have markdown, save it without HTML conversion
        updateData.contentMarkdown = updateEventDto.contentMarkdown;
        // Keep existing contentHtml or set to null if not available
        if (!updateEventDto.contentHtml) {
          updateData.contentHtml = null;
        }
      }

      // Extract featured image if content was updated
      if (updateEventDto.contentMarkdown || updateEventDto.contentHtml || processedContent) {
        const featuredImage = updateEventDto.featuredImage || 
          extractFeaturedImage(
            processedContent?.markdown || updateEventDto.contentMarkdown,
            processedContent?.html || updateEventDto.contentHtml
          );
        updateData.featuredImage = featuredImage;
      }

      const event = await this.prisma.event.update({
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
          _count: {
            select: {
              registrations: true,
              submissions: true,
            },
          },
        },
      });

      this.logger.log(`Event updated: ${event.id} by user ${userId}`);
      
      // Invalidate cache for this event and event lists since the event was updated
      try {
        await this.cacheService.invalidateEventCache(event.id);
        this.logger.debug(`Cache invalidated for event ${event.id}`);
      } catch (error) {
        this.logger.warn('Failed to invalidate cache after event update', error);
      }
      
      return new EventResponseDto(event);
    } catch (error) {
      this.logger.error(`Error updating event ${id}`, error);
      if (error instanceof NotFoundException || error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to update event');
    }
  }

  async remove(id: string, userId: string, userRole: UserRole): Promise<void> {
    try {
      const existingEvent = await this.prisma.event.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              registrations: true,
              submissions: true,
            },
          },
        },
      });

      if (!existingEvent) {
        throw new NotFoundException('Event not found');
      }

      // Check permissions
      if (userRole !== UserRole.ADMIN && existingEvent.createdBy !== userId) {
        throw new ForbiddenException('You can only delete your own events');
      }

      // Check if event has registrations or submissions
      if (existingEvent._count.registrations > 0 || existingEvent._count.submissions > 0) {
        throw new BadRequestException('Cannot delete event with existing registrations or submissions');
      }

      await this.prisma.event.delete({
        where: { id },
      });

      // Invalidate cache for this event and event lists since the event was deleted
      try {
        await this.cacheService.invalidateEventCache(id);
        this.logger.debug(`Cache invalidated for deleted event ${id}`);
      } catch (error) {
        this.logger.warn('Failed to invalidate cache after event deletion', error);
      }

      this.logger.log(`Event deleted: ${id} by user ${userId}`);
    } catch (error) {
      this.logger.error(`Error deleting event ${id}`, error);
      if (error instanceof NotFoundException || error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to delete event');
    }
  }

  async publish(id: string, userId: string, userRole: UserRole): Promise<EventResponseDto> {
    try {
      const existingEvent = await this.prisma.event.findUnique({
        where: { id },
      });

      if (!existingEvent) {
        throw new NotFoundException('Event not found');
      }

      // Check permissions
      if (userRole !== UserRole.ADMIN && userRole !== UserRole.EDITOR) {
        throw new ForbiddenException('Only admins and editors can publish events');
      }

      if (existingEvent.status === EventStatus.PUBLISHED) {
        throw new BadRequestException('Event is already published');
      }

      const event = await this.prisma.event.update({
        where: { id },
        data: { 
          status: EventStatus.PUBLISHED,
          // Set publishedAt if we add this field later
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
          _count: {
            select: {
              registrations: true,
              submissions: true,
            },
          },
        },
      });

      this.logger.log(`Event published: ${event.id} by user ${userId}`);
      
      // Invalidate cache for this event and event lists since the event status changed
      try {
        await this.cacheService.invalidateEventCache(event.id);
        this.logger.debug(`Cache invalidated for published event ${event.id}`);
      } catch (error) {
        this.logger.warn('Failed to invalidate cache after event publish', error);
      }
      
      return new EventResponseDto(event);
    } catch (error) {
      this.logger.error(`Error publishing event ${id}`, error);
      if (error instanceof NotFoundException || error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to publish event');
    }
  }

  async getEventTags(): Promise<string[]> {
    try {
      const events = await this.prisma.event.findMany({
        select: { tags: true },
        where: { status: EventStatus.PUBLISHED },
      });

      const allTags = events.flatMap(event => event.tags);
      const uniqueTags = [...new Set(allTags)].sort();
      
      return uniqueTags;
    } catch (error) {
      this.logger.error('Error fetching event tags', error);
      throw new BadRequestException('Failed to fetch event tags');
    }
  }
}
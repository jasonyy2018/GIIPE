import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ContentService } from '../../content/content.service';
import { AdminCreateEventDto, AdminUpdateEventDto, AdminEventFiltersDto, DuplicateEventDto, EventWorkflowDto, BulkEventActionDto } from '../dto/admin-event.dto';
import { EventResponseDto, PaginatedEventsDto } from '../../events/dto/event-response.dto';
import { EventStatus, UserRole, Prisma } from '@prisma/client';

@Injectable()
export class AdminEventsService {
  private readonly logger = new Logger(AdminEventsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly contentService: ContentService,
  ) {}

  async createEvent(createEventDto: AdminCreateEventDto, userId: string): Promise<EventResponseDto> {
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

      const eventData: Prisma.EventCreateInput = {
        title: createEventDto.title,
        description: createEventDto.description,
        contentMarkdown: processedContent?.markdown || createEventDto.contentMarkdown,
        contentHtml: processedContent?.html || createEventDto.contentHtml,
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
        creator: {
          connect: { id: userId }
        }
      };

      const event = await this.prisma.event.create({
        data: eventData,
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

      // If this is a template, save it separately
      if (createEventDto.isTemplate && createEventDto.templateName) {
        await this.saveEventTemplate(event.id, createEventDto.templateName, userId);
      }

      this.logger.log(`Event created: ${event.id} by admin ${userId}`);
      return new EventResponseDto(event);
    } catch (error) {
      this.logger.error('Error creating event', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create event');
    }
  }

  async updateEvent(id: string, updateEventDto: AdminUpdateEventDto, userId: string): Promise<EventResponseDto> {
    try {
      const existingEvent = await this.prisma.event.findUnique({
        where: { id },
      });

      if (!existingEvent) {
        throw new NotFoundException('Event not found');
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
        processedContent = await this.contentService.processMarkdown(updateEventDto.contentMarkdown);
      } else if (updateEventDto.contentHtml) {
        processedContent = await this.contentService.processHtml(updateEventDto.contentHtml);
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

      this.logger.log(`Event updated: ${event.id} by admin ${userId}`);
      return new EventResponseDto(event);
    } catch (error) {
      this.logger.error(`Error updating event ${id}`, error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to update event');
    }
  }

  async getAllEvents(filters: AdminEventFiltersDto): Promise<PaginatedEventsDto> {
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

      if (filters.status) {
        where.status = filters.status;
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
          where.startDate.gte = new Date(filters.startDateFrom);
        }
        if (filters.startDateTo) {
          where.startDate.lte = new Date(filters.startDateTo);
        }
      }

      if (filters.endDateFrom || filters.endDateTo) {
        where.endDate = {};
        if (filters.endDateFrom) {
          where.endDate.gte = new Date(filters.endDateFrom);
        }
        if (filters.endDateTo) {
          where.endDate.lte = new Date(filters.endDateTo);
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

      const eventDtos = events.map(event => new EventResponseDto(event));
      return new PaginatedEventsDto(eventDtos, total, filters.limit, filters.offset);
    } catch (error) {
      this.logger.error('Error fetching admin events', error);
      throw new BadRequestException('Failed to fetch events');
    }
  }

  async duplicateEvent(duplicateDto: DuplicateEventDto, userId: string): Promise<EventResponseDto> {
    try {
      const sourceEvent = await this.prisma.event.findUnique({
        where: { id: duplicateDto.sourceEventId },
        include: {
          registrations: duplicateDto.copyRegistrations,
          submissions: duplicateDto.copySubmissions,
        },
      });

      if (!sourceEvent) {
        throw new NotFoundException('Source event not found');
      }

      const startDate = duplicateDto.startDate ? new Date(duplicateDto.startDate) : sourceEvent.startDate;
      const endDate = duplicateDto.endDate ? new Date(duplicateDto.endDate) : sourceEvent.endDate;

      const duplicatedEvent = await this.prisma.event.create({
        data: {
          title: duplicateDto.title,
          description: sourceEvent.description,
          contentMarkdown: sourceEvent.contentMarkdown,
          contentHtml: sourceEvent.contentHtml,
          showPdfAttachment: sourceEvent.showPdfAttachment,
          startDate,
          endDate,
          location: sourceEvent.location,
          maxAttendees: sourceEvent.maxAttendees,
          registrationDeadline: sourceEvent.registrationDeadline,
          status: EventStatus.DRAFT, // Always start as draft
          tags: sourceEvent.tags,
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

      this.logger.log(`Event duplicated: ${sourceEvent.id} -> ${duplicatedEvent.id} by admin ${userId}`);
      return new EventResponseDto(duplicatedEvent);
    } catch (error) {
      this.logger.error('Error duplicating event', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to duplicate event');
    }
  }

  async updateEventWorkflow(id: string, workflowDto: EventWorkflowDto, userId: string): Promise<EventResponseDto> {
    try {
      const existingEvent = await this.prisma.event.findUnique({
        where: { id },
      });

      if (!existingEvent) {
        throw new NotFoundException('Event not found');
      }

      // Validate workflow transition
      if (!this.isValidStatusTransition(existingEvent.status, workflowDto.targetStatus)) {
        throw new BadRequestException(`Invalid status transition from ${existingEvent.status} to ${workflowDto.targetStatus}`);
      }

      const event = await this.prisma.event.update({
        where: { id },
        data: {
          status: workflowDto.targetStatus,
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

      // Log the workflow change
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'EVENT_STATUS_CHANGE',
          resource: 'Event',
          resourceId: id,
          details: {
            from: existingEvent.status,
            to: workflowDto.targetStatus,
            note: workflowDto.note,
          },
        },
      });

      this.logger.log(`Event workflow updated: ${event.id} from ${existingEvent.status} to ${workflowDto.targetStatus} by admin ${userId}`);
      return new EventResponseDto(event);
    } catch (error) {
      this.logger.error(`Error updating event workflow ${id}`, error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to update event workflow');
    }
  }

  async bulkEventAction(bulkActionDto: BulkEventActionDto, userId: string): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = { success: 0, failed: 0, errors: [] };

    for (const eventId of bulkActionDto.eventIds) {
      try {
        switch (bulkActionDto.action) {
          case 'publish':
            await this.updateEventWorkflow(eventId, { targetStatus: EventStatus.PUBLISHED, note: bulkActionDto.note }, userId);
            break;
          case 'unpublish':
            await this.updateEventWorkflow(eventId, { targetStatus: EventStatus.DRAFT, note: bulkActionDto.note }, userId);
            break;
          case 'cancel':
            await this.updateEventWorkflow(eventId, { targetStatus: EventStatus.CANCELLED, note: bulkActionDto.note }, userId);
            break;
          case 'delete':
            await this.deleteEvent(eventId, userId);
            break;
          default:
            throw new BadRequestException(`Unknown action: ${bulkActionDto.action}`);
        }
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Event ${eventId}: ${error.message}`);
      }
    }

    this.logger.log(`Bulk action ${bulkActionDto.action} completed: ${results.success} success, ${results.failed} failed by admin ${userId}`);
    return results;
  }

  async deleteEvent(id: string, userId: string): Promise<void> {
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

      // Check if event has registrations or submissions
      if (existingEvent._count.registrations > 0 || existingEvent._count.submissions > 0) {
        throw new BadRequestException('Cannot delete event with existing registrations or submissions');
      }

      await this.prisma.event.delete({
        where: { id },
      });

      this.logger.log(`Event deleted: ${id} by admin ${userId}`);
    } catch (error) {
      this.logger.error(`Error deleting event ${id}`, error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to delete event');
    }
  }

  async getEvent(id: string): Promise<EventResponseDto> {
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

      return new EventResponseDto(event);
    } catch (error) {
      this.logger.error(`Error fetching event ${id}`, error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch event');
    }
  }

  async getEventTemplates(): Promise<any[]> {
    // This would require a separate EventTemplate model in the future
    // For now, return empty array
    return [];
  }

  async getEventAnalytics(eventId: string): Promise<any> {
    try {
      const event = await this.prisma.event.findUnique({
        where: { id: eventId },
        include: {
          registrations: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  firstName: true,
                  lastName: true,
                  createdAt: true,
                },
              },
            },
          },
          submissions: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  firstName: true,
                  lastName: true,
                },
              },
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

      // Calculate registration trends (daily registrations over time)
      const registrationTrends = this.calculateRegistrationTrends(event.registrations);
      
      // Calculate capacity utilization
      const capacityUtilization = event.maxAttendees 
        ? (event._count.registrations / event.maxAttendees) * 100 
        : null;

      // Calculate attendance projections
      const attendanceProjections = this.calculateAttendanceProjections(event);

      // Registration status breakdown
      const registrationStatusBreakdown = event.registrations.reduce((acc, reg) => {
        acc[reg.status] = (acc[reg.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        eventId: event.id,
        eventTitle: event.title,
        totalRegistrations: event._count.registrations,
        totalSubmissions: event._count.submissions,
        maxAttendees: event.maxAttendees,
        capacityUtilization,
        registrationTrends,
        attendanceProjections,
        registrationStatusBreakdown,
        registrations: event.registrations,
        submissions: event.submissions,
      };
    } catch (error) {
      this.logger.error(`Error fetching event analytics for ${eventId}`, error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch event analytics');
    }
  }

  async getEventRegistrations(eventId: string, filters?: any): Promise<any> {
    try {
      const where: any = { eventId };

      if (filters?.status) {
        where.status = filters.status;
      }

      if (filters?.search) {
        where.user = {
          OR: [
            { username: { contains: filters.search, mode: 'insensitive' } },
            { firstName: { contains: filters.search, mode: 'insensitive' } },
            { lastName: { contains: filters.search, mode: 'insensitive' } },
            { email: { contains: filters.search, mode: 'insensitive' } },
          ],
        };
      }

      const [registrations, total] = await Promise.all([
        this.prisma.registration.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                firstName: true,
                lastName: true,
                createdAt: true,
              },
            },
          },
          orderBy: { registeredAt: 'desc' },
          take: filters?.limit || 50,
          skip: filters?.offset || 0,
        }),
        this.prisma.registration.count({ where }),
      ]);

      return {
        registrations,
        total,
        limit: filters?.limit || 50,
        offset: filters?.offset || 0,
      };
    } catch (error) {
      this.logger.error(`Error fetching event registrations for ${eventId}`, error);
      throw new BadRequestException('Failed to fetch event registrations');
    }
  }

  async exportEventRegistrations(eventId: string, format: 'csv' | 'excel' = 'csv'): Promise<Buffer> {
    try {
      const registrations = await this.prisma.registration.findMany({
        where: { eventId },
        include: {
          user: {
            select: {
              username: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { registeredAt: 'desc' },
      });

      // For now, return a simple CSV format
      // In a real implementation, you'd use a library like csv-writer or exceljs
      const csvHeader = 'Username,Email,First Name,Last Name,Status,Registration Date\n';
      const csvRows = registrations.map(reg => 
        `${reg.user.username},${reg.user.email},${reg.user.firstName || ''},${reg.user.lastName || ''},${reg.status},${reg.registeredAt.toISOString()}`
      ).join('\n');
      
      const csvContent = csvHeader + csvRows;
      return Buffer.from(csvContent, 'utf-8');
    } catch (error) {
      this.logger.error(`Error exporting event registrations for ${eventId}`, error);
      throw new BadRequestException('Failed to export event registrations');
    }
  }

  async getEventsComparison(eventIds: string[]): Promise<any> {
    try {
      const events = await this.prisma.event.findMany({
        where: { id: { in: eventIds } },
        include: {
          _count: {
            select: {
              registrations: true,
              submissions: true,
            },
          },
        },
      });

      const comparison = events.map(event => {
        const capacityUtilization = event.maxAttendees 
          ? (event._count.registrations / event.maxAttendees) * 100 
          : null;

        return {
          id: event.id,
          title: event.title,
          startDate: event.startDate,
          endDate: event.endDate,
          status: event.status,
          totalRegistrations: event._count.registrations,
          totalSubmissions: event._count.submissions,
          maxAttendees: event.maxAttendees,
          capacityUtilization,
          location: event.location,
        };
      });

      return { events: comparison };
    } catch (error) {
      this.logger.error('Error fetching events comparison', error);
      throw new BadRequestException('Failed to fetch events comparison');
    }
  }

  private calculateRegistrationTrends(registrations: any[]): any[] {
    const trends: Record<string, number> = {};
    
    registrations.forEach(reg => {
      const date = reg.registeredAt.toISOString().split('T')[0];
      trends[date] = (trends[date] || 0) + 1;
    });

    return Object.entries(trends)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private calculateAttendanceProjections(event: any): any {
    const now = new Date();
    const eventStart = new Date(event.startDate);
    const daysUntilEvent = Math.ceil((eventStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilEvent <= 0) {
      return {
        projectedAttendance: event._count.registrations,
        confidence: 'high',
        daysUntilEvent: 0,
      };
    }

    // Simple projection based on current registration rate
    const registrationRate = event._count.registrations / Math.max(1, daysUntilEvent);
    const projectedAttendance = Math.min(
      event._count.registrations + (registrationRate * daysUntilEvent * 0.5),
      event.maxAttendees || event._count.registrations * 1.5
    );

    const confidence = daysUntilEvent > 30 ? 'low' : daysUntilEvent > 7 ? 'medium' : 'high';

    return {
      projectedAttendance: Math.round(projectedAttendance),
      confidence,
      daysUntilEvent,
      registrationRate: Math.round(registrationRate * 100) / 100,
    };
  }

  private async saveEventTemplate(eventId: string, templateName: string, userId: string): Promise<void> {
    // This would save to an EventTemplate model in the future
    // For now, just log it
    this.logger.log(`Event template saved: ${templateName} from event ${eventId} by admin ${userId}`);
  }

  private isValidStatusTransition(currentStatus: EventStatus, targetStatus: EventStatus): boolean {
    const validTransitions: Record<EventStatus, EventStatus[]> = {
      [EventStatus.DRAFT]: [EventStatus.PUBLISHED, EventStatus.CANCELLED],
      [EventStatus.PUBLISHED]: [EventStatus.DRAFT, EventStatus.CANCELLED, EventStatus.COMPLETED],
      [EventStatus.CANCELLED]: [EventStatus.DRAFT],
      [EventStatus.COMPLETED]: [], // No transitions from completed
    };

    return validTransitions[currentStatus]?.includes(targetStatus) || false;
  }
}
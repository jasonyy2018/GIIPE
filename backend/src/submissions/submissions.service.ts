import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { UpdateSubmissionDto } from './dto/update-submission.dto';
import { SubmissionFiltersDto } from './dto/submission-filters.dto';
import { SubmissionResponseDto, PaginatedSubmissionsDto } from './dto/submission-response.dto';
import { SubmissionStatus, EventStatus, UserRole, Prisma } from '@prisma/client';
import { NotificationEventsService } from '../notifications/notification-events.service';

@Injectable()
export class SubmissionsService {
  private readonly logger = new Logger(SubmissionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationEvents: NotificationEventsService,
  ) {}

  async create(createSubmissionDto: CreateSubmissionDto, userId: string): Promise<SubmissionResponseDto> {
    try {
      // Check if event exists and is published
      const event = await this.prisma.event.findUnique({
        where: { id: createSubmissionDto.eventId },
      });

      if (!event) {
        throw new NotFoundException('Event not found');
      }

      if (event.status !== EventStatus.PUBLISHED) {
        throw new BadRequestException('Cannot submit to unpublished event');
      }

      // Check if event has already ended
      if (new Date() > event.endDate) {
        throw new BadRequestException('Cannot submit to event that has already ended');
      }

      // Check if user is registered for the event
      const registration = await this.prisma.registration.findUnique({
        where: {
          userId_eventId: {
            userId,
            eventId: createSubmissionDto.eventId
          }
        }
      });

      if (!registration) {
        throw new BadRequestException('You must be registered for the event to submit');
      }

      // Check if user already has a submission for this event
      const existingSubmission = await this.prisma.submission.findFirst({
        where: {
          userId,
          eventId: createSubmissionDto.eventId
        }
      });

      if (existingSubmission) {
        throw new BadRequestException('You already have a submission for this event');
      }

      const submission = await this.prisma.submission.create({
        data: {
          title: createSubmissionDto.title,
          description: createSubmissionDto.description,
          userId,
          eventId: createSubmissionDto.eventId,
          status: SubmissionStatus.DRAFT,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          event: {
            select: {
              id: true,
              title: true,
              startDate: true,
              endDate: true,
              location: true,
            },
          },
        },
      });

      this.logger.log(`Submission created: ${submission.id} for user ${userId} and event ${createSubmissionDto.eventId}`);
      return new SubmissionResponseDto(submission);
    } catch (error) {
      this.logger.error('Error creating submission', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create submission');
    }
  }

  async findAll(filters: SubmissionFiltersDto, userRole?: UserRole, currentUserId?: string): Promise<PaginatedSubmissionsDto> {
    try {
      const where: Prisma.SubmissionWhereInput = {};

      // Apply filters
      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.eventId) {
        where.eventId = filters.eventId;
      }

      if (filters.userId) {
        where.userId = filters.userId;
      }

      // Non-admin users can only see their own submissions unless they're viewing a specific event
      if (userRole !== UserRole.ADMIN && userRole !== UserRole.EDITOR && !filters.eventId) {
        where.userId = currentUserId;
      }

      if (filters.search) {
        where.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
          {
            user: {
              OR: [
                { username: { contains: filters.search, mode: 'insensitive' } },
                { firstName: { contains: filters.search, mode: 'insensitive' } },
                { lastName: { contains: filters.search, mode: 'insensitive' } },
              ]
            }
          },
          {
            event: {
              title: { contains: filters.search, mode: 'insensitive' }
            }
          }
        ];
      }

      if (filters.createdFrom || filters.createdTo) {
        where.createdAt = {};
        if (filters.createdFrom) {
          where.createdAt.gte = new Date(filters.createdFrom);
        }
        if (filters.createdTo) {
          where.createdAt.lte = new Date(filters.createdTo);
        }
      }

      // Build orderBy
      const orderBy: Prisma.SubmissionOrderByWithRelationInput = {};
      if (filters.sortBy === 'title') {
        orderBy.title = filters.sortOrder;
      } else if (filters.sortBy === 'status') {
        orderBy.status = filters.sortOrder;
      } else if (filters.sortBy === 'updatedAt') {
        orderBy.updatedAt = filters.sortOrder;
      } else if (filters.sortBy === 'eventTitle') {
        orderBy.event = { title: filters.sortOrder };
      } else if (filters.sortBy === 'userName') {
        orderBy.user = { username: filters.sortOrder };
      } else {
        orderBy.createdAt = filters.sortOrder;
      }

      const [submissions, total] = await Promise.all([
        this.prisma.submission.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            event: {
              select: {
                id: true,
                title: true,
                startDate: true,
                endDate: true,
                location: true,
              },
            },
          },
          orderBy,
          take: filters.limit,
          skip: filters.offset,
        }),
        this.prisma.submission.count({ where }),
      ]);

      const submissionDtos = submissions.map(submission => new SubmissionResponseDto(submission));
      return new PaginatedSubmissionsDto(submissionDtos, total, filters.limit, filters.offset);
    } catch (error) {
      this.logger.error('Error fetching submissions', error);
      throw new BadRequestException('Failed to fetch submissions');
    }
  }

  async findOne(id: string, userRole: UserRole, currentUserId: string): Promise<SubmissionResponseDto> {
    try {
      const submission = await this.prisma.submission.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          event: {
            select: {
              id: true,
              title: true,
              startDate: true,
              endDate: true,
              location: true,
            },
          },
        },
      });

      if (!submission) {
        throw new NotFoundException('Submission not found');
      }

      // Check permissions
      if (userRole !== UserRole.ADMIN && userRole !== UserRole.EDITOR && submission.userId !== currentUserId) {
        throw new ForbiddenException('You can only view your own submissions');
      }

      return new SubmissionResponseDto(submission);
    } catch (error) {
      this.logger.error(`Error fetching submission ${id}`, error);
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch submission');
    }
  }

  async update(id: string, updateSubmissionDto: UpdateSubmissionDto, userRole: UserRole, currentUserId: string): Promise<SubmissionResponseDto> {
    try {
      const existingSubmission = await this.prisma.submission.findUnique({
        where: { id },
        include: {
          event: true,
        },
      });

      if (!existingSubmission) {
        throw new NotFoundException('Submission not found');
      }

      // Check permissions
      if (userRole !== UserRole.ADMIN && userRole !== UserRole.EDITOR && existingSubmission.userId !== currentUserId) {
        throw new ForbiddenException('You can only update your own submissions');
      }

      // Only admin and editor can update status
      if (updateSubmissionDto.status && userRole !== UserRole.ADMIN && userRole !== UserRole.EDITOR) {
        throw new ForbiddenException('Only administrators and editors can update submission status');
      }

      // Users can't update submitted submissions (except status by admin/editor)
      if (existingSubmission.status === SubmissionStatus.SUBMITTED && 
          existingSubmission.userId === currentUserId && 
          (updateSubmissionDto.title || updateSubmissionDto.description)) {
        throw new BadRequestException('Cannot update submitted submissions');
      }

      // Prevent updates to accepted/rejected submissions by non-admin users
      if ((existingSubmission.status === SubmissionStatus.ACCEPTED || existingSubmission.status === SubmissionStatus.REJECTED) &&
          userRole !== UserRole.ADMIN && existingSubmission.userId === currentUserId) {
        throw new BadRequestException('Cannot update accepted or rejected submissions');
      }

      const submission = await this.prisma.submission.update({
        where: { id },
        data: updateSubmissionDto,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          event: {
            select: {
              id: true,
              title: true,
              startDate: true,
              endDate: true,
              location: true,
            },
          },
        },
      });

      this.logger.log(`Submission updated: ${submission.id} by user ${currentUserId}`);
      
      // Send notification if status changed
      if (updateSubmissionDto.status && updateSubmissionDto.status !== existingSubmission.status) {
        await this.notificationEvents.onSubmissionStatusChange(
          submission.user.email,
          submission.user.username,
          submission.title,
          submission.event.title,
          updateSubmissionDto.status,
          undefined, // reviewerComments - could be added to DTO later
          submission.userId,
        );
      }

      return new SubmissionResponseDto(submission);
    } catch (error) {
      this.logger.error(`Error updating submission ${id}`, error);
      if (error instanceof NotFoundException || error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to update submission');
    }
  }

  async remove(id: string, userRole: UserRole, currentUserId: string): Promise<void> {
    try {
      const existingSubmission = await this.prisma.submission.findUnique({
        where: { id },
        include: {
          event: true,
        },
      });

      if (!existingSubmission) {
        throw new NotFoundException('Submission not found');
      }

      // Check permissions
      if (userRole !== UserRole.ADMIN && existingSubmission.userId !== currentUserId) {
        throw new ForbiddenException('You can only delete your own submissions');
      }

      // Prevent deletion of submitted/reviewed submissions by non-admin users
      if ((existingSubmission.status === SubmissionStatus.SUBMITTED || 
           existingSubmission.status === SubmissionStatus.UNDER_REVIEW ||
           existingSubmission.status === SubmissionStatus.ACCEPTED ||
           existingSubmission.status === SubmissionStatus.REJECTED) &&
          userRole !== UserRole.ADMIN) {
        throw new BadRequestException('Cannot delete submissions that have been submitted or reviewed');
      }

      await this.prisma.submission.delete({
        where: { id },
      });

      this.logger.log(`Submission deleted: ${id} by user ${currentUserId}`);
    } catch (error) {
      this.logger.error(`Error deleting submission ${id}`, error);
      if (error instanceof NotFoundException || error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to delete submission');
    }
  }

  async submit(id: string, userId: string): Promise<SubmissionResponseDto> {
    try {
      const existingSubmission = await this.prisma.submission.findUnique({
        where: { id },
        include: {
          event: true,
        },
      });

      if (!existingSubmission) {
        throw new NotFoundException('Submission not found');
      }

      // Check permissions
      if (existingSubmission.userId !== userId) {
        throw new ForbiddenException('You can only submit your own submissions');
      }

      // Check if submission is in draft status
      if (existingSubmission.status !== SubmissionStatus.DRAFT) {
        throw new BadRequestException('Only draft submissions can be submitted');
      }

      // Check if event has ended
      if (new Date() > existingSubmission.event.endDate) {
        throw new BadRequestException('Cannot submit to event that has already ended');
      }

      // Check if submission has required content
      if (!existingSubmission.title || !existingSubmission.description) {
        throw new BadRequestException('Submission must have title and description before submitting');
      }

      const submission = await this.prisma.submission.update({
        where: { id },
        data: { 
          status: SubmissionStatus.SUBMITTED,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          event: {
            select: {
              id: true,
              title: true,
              startDate: true,
              endDate: true,
              location: true,
            },
          },
        },
      });

      this.logger.log(`Submission submitted: ${submission.id} by user ${userId}`);
      
      // Send notification
      await this.notificationEvents.onSubmissionReceived(
        submission.user.email,
        submission.user.username,
        submission.title,
        submission.event.title,
        userId,
      );

      return new SubmissionResponseDto(submission);
    } catch (error) {
      this.logger.error(`Error submitting submission ${id}`, error);
      if (error instanceof NotFoundException || error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to submit submission');
    }
  }

  async getEventSubmissions(eventId: string, userRole: UserRole): Promise<SubmissionResponseDto[]> {
    try {
      // Check if event exists
      const event = await this.prisma.event.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        throw new NotFoundException('Event not found');
      }

      // Only admin and editor can view event submissions
      if (userRole !== UserRole.ADMIN && userRole !== UserRole.EDITOR) {
        throw new ForbiddenException('Access denied to event submissions');
      }

      const submissions = await this.prisma.submission.findMany({
        where: { eventId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          event: {
            select: {
              id: true,
              title: true,
              startDate: true,
              endDate: true,
              location: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return submissions.map(submission => new SubmissionResponseDto(submission));
    } catch (error) {
      this.logger.error(`Error fetching submissions for event ${eventId}`, error);
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch event submissions');
    }
  }

  async getSubmissionStats(eventId?: string): Promise<any> {
    try {
      const where: Prisma.SubmissionWhereInput = eventId ? { eventId } : {};

      const stats = await this.prisma.submission.groupBy({
        by: ['status'],
        where,
        _count: {
          status: true,
        },
      });

      const result = {
        total: 0,
        draft: 0,
        submitted: 0,
        underReview: 0,
        accepted: 0,
        rejected: 0,
      };

      stats.forEach(stat => {
        result.total += stat._count.status;
        switch (stat.status) {
          case SubmissionStatus.DRAFT:
            result.draft = stat._count.status;
            break;
          case SubmissionStatus.SUBMITTED:
            result.submitted = stat._count.status;
            break;
          case SubmissionStatus.UNDER_REVIEW:
            result.underReview = stat._count.status;
            break;
          case SubmissionStatus.ACCEPTED:
            result.accepted = stat._count.status;
            break;
          case SubmissionStatus.REJECTED:
            result.rejected = stat._count.status;
            break;
        }
      });

      return result;
    } catch (error) {
      this.logger.error('Error fetching submission stats', error);
      throw new BadRequestException('Failed to fetch submission stats');
    }
  }

  async updateFileInfo(id: string, filePath: string, fileName: string, fileSize: number, userId: string): Promise<SubmissionResponseDto> {
    try {
      const existingSubmission = await this.prisma.submission.findUnique({
        where: { id },
      });

      if (!existingSubmission) {
        throw new NotFoundException('Submission not found');
      }

      // Check permissions
      if (existingSubmission.userId !== userId) {
        throw new ForbiddenException('You can only update your own submissions');
      }

      // Check if submission can be updated
      if (existingSubmission.status === SubmissionStatus.SUBMITTED ||
          existingSubmission.status === SubmissionStatus.UNDER_REVIEW ||
          existingSubmission.status === SubmissionStatus.ACCEPTED ||
          existingSubmission.status === SubmissionStatus.REJECTED) {
        throw new BadRequestException('Cannot update file for submissions that have been submitted or reviewed');
      }

      const submission = await this.prisma.submission.update({
        where: { id },
        data: {
          filePath,
          fileName,
          fileSize,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          event: {
            select: {
              id: true,
              title: true,
              startDate: true,
              endDate: true,
              location: true,
            },
          },
        },
      });

      this.logger.log(`Submission file updated: ${submission.id} by user ${userId}`);
      return new SubmissionResponseDto(submission);
    } catch (error) {
      this.logger.error(`Error updating submission file ${id}`, error);
      if (error instanceof NotFoundException || error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to update submission file');
    }
  }
}
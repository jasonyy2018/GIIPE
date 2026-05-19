import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { UpdateRegistrationDto } from './dto/update-registration.dto';
import { RegistrationFiltersDto } from './dto/registration-filters.dto';
import { RegistrationResponseDto, PaginatedRegistrationsDto } from './dto/registration-response.dto';
import { RegistrationStatus, EventStatus, UserRole, Prisma } from '@prisma/client';
import { NotificationEventsService } from '../notifications/notification-events.service';

@Injectable()
export class RegistrationsService {
  private readonly logger = new Logger(RegistrationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationEvents: NotificationEventsService,
  ) {}

  async create(createRegistrationDto: CreateRegistrationDto, userId: string): Promise<RegistrationResponseDto> {
    try {
      // Check if event exists and is published
      const event = await this.prisma.event.findUnique({
        where: { id: createRegistrationDto.eventId },
        include: {
          _count: {
            select: {
              registrations: {
                where: {
                  status: {
                    in: [RegistrationStatus.CONFIRMED, RegistrationStatus.PENDING]
                  }
                }
              }
            }
          }
        }
      });

      if (!event) {
        throw new NotFoundException('Event not found');
      }

      if (event.status !== EventStatus.PUBLISHED) {
        throw new BadRequestException('Cannot register for unpublished event');
      }

      // Check if registration deadline has passed
      if (event.registrationDeadline && new Date() > event.registrationDeadline) {
        throw new BadRequestException('Registration deadline has passed');
      }

      // Check if event has already started
      if (new Date() > event.startDate) {
        throw new BadRequestException('Cannot register for event that has already started');
      }

      // Check if user is already registered
      const existingRegistration = await this.prisma.registration.findUnique({
        where: {
          userId_eventId: {
            userId,
            eventId: createRegistrationDto.eventId
          }
        }
      });

      if (existingRegistration) {
        throw new BadRequestException('User is already registered for this event');
      }

      // Check capacity and determine status
      let status: RegistrationStatus = RegistrationStatus.CONFIRMED;
      if (event.maxAttendees && event._count.registrations >= event.maxAttendees) {
        status = RegistrationStatus.WAITLISTED;
      }

      const registration = await this.prisma.registration.create({
        data: {
          userId,
          eventId: createRegistrationDto.eventId,
          status,
          additionalInfo: createRegistrationDto.additionalInfo,
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
              maxAttendees: true,
            },
          },
        },
      });

      this.logger.log(`Registration created: ${registration.id} for user ${userId} and event ${createRegistrationDto.eventId}`);
      
      // Send notification
      await this.notificationEvents.onEventRegistration(
        registration.user.email,
        registration.user.username,
        registration.event.title,
        registration.event.startDate,
        registration.event.location || 'TBD',
        userId,
      );

      return new RegistrationResponseDto(registration);
    } catch (error) {
      this.logger.error('Error creating registration', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create registration');
    }
  }

  async findAll(filters: RegistrationFiltersDto, userRole?: UserRole, currentUserId?: string): Promise<PaginatedRegistrationsDto> {
    try {
      const where: Prisma.RegistrationWhereInput = {};

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

      // Non-admin users can only see their own registrations unless they're viewing a specific event
      if (userRole !== UserRole.ADMIN && !filters.eventId) {
        where.userId = currentUserId;
      }

      if (filters.search) {
        where.OR = [
          {
            user: {
              OR: [
                { username: { contains: filters.search, mode: 'insensitive' } },
                { firstName: { contains: filters.search, mode: 'insensitive' } },
                { lastName: { contains: filters.search, mode: 'insensitive' } },
                { email: { contains: filters.search, mode: 'insensitive' } },
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

      if (filters.registeredFrom || filters.registeredTo) {
        where.registeredAt = {};
        if (filters.registeredFrom) {
          where.registeredAt.gte = new Date(filters.registeredFrom);
        }
        if (filters.registeredTo) {
          where.registeredAt.lte = new Date(filters.registeredTo);
        }
      }

      // Build orderBy
      const orderBy: Prisma.RegistrationOrderByWithRelationInput = {};
      if (filters.sortBy === 'status') {
        orderBy.status = filters.sortOrder;
      } else if (filters.sortBy === 'eventTitle') {
        orderBy.event = { title: filters.sortOrder };
      } else if (filters.sortBy === 'userName') {
        orderBy.user = { username: filters.sortOrder };
      } else {
        orderBy.registeredAt = filters.sortOrder;
      }

      const [registrations, total] = await Promise.all([
        this.prisma.registration.findMany({
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
                maxAttendees: true,
              },
            },
          },
          orderBy,
          take: filters.limit,
          skip: filters.offset,
        }),
        this.prisma.registration.count({ where }),
      ]);

      const registrationDtos = registrations.map(registration => new RegistrationResponseDto(registration));
      return new PaginatedRegistrationsDto(registrationDtos, total, filters.limit, filters.offset);
    } catch (error) {
      this.logger.error('Error fetching registrations', error);
      throw new BadRequestException('Failed to fetch registrations');
    }
  }

  async findOne(id: string, userRole: UserRole, currentUserId: string): Promise<RegistrationResponseDto> {
    try {
      const registration = await this.prisma.registration.findUnique({
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
              maxAttendees: true,
            },
          },
        },
      });

      if (!registration) {
        throw new NotFoundException('Registration not found');
      }

      // Check permissions
      if (userRole !== UserRole.ADMIN && registration.userId !== currentUserId) {
        throw new ForbiddenException('You can only view your own registrations');
      }

      return new RegistrationResponseDto(registration);
    } catch (error) {
      this.logger.error(`Error fetching registration ${id}`, error);
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch registration');
    }
  }

  async update(id: string, updateRegistrationDto: UpdateRegistrationDto, userRole: UserRole, currentUserId: string): Promise<RegistrationResponseDto> {
    try {
      const existingRegistration = await this.prisma.registration.findUnique({
        where: { id },
        include: {
          event: true,
        },
      });

      if (!existingRegistration) {
        throw new NotFoundException('Registration not found');
      }

      // Check permissions - only admin can update status, users can update their own additional info
      if (userRole !== UserRole.ADMIN && existingRegistration.userId !== currentUserId) {
        throw new ForbiddenException('You can only update your own registrations');
      }

      if (updateRegistrationDto.status && userRole !== UserRole.ADMIN) {
        throw new ForbiddenException('Only administrators can update registration status');
      }

      // Prevent status changes for past events
      if (updateRegistrationDto.status && new Date() > existingRegistration.event.startDate) {
        throw new BadRequestException('Cannot update registration status for past events');
      }

      const registration = await this.prisma.registration.update({
        where: { id },
        data: updateRegistrationDto,
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
              maxAttendees: true,
            },
          },
        },
      });

      this.logger.log(`Registration updated: ${registration.id} by user ${currentUserId}`);
      
      // Send notification if status changed
      if (updateRegistrationDto.status && updateRegistrationDto.status !== existingRegistration.status) {
        await this.notificationEvents.onEventRegistrationStatusChange(
          registration.user.email,
          registration.user.username,
          registration.event.title,
          updateRegistrationDto.status,
          registration.event.startDate,
          registration.event.location || 'TBD',
          registration.userId,
        );
      }

      return new RegistrationResponseDto(registration);
    } catch (error) {
      this.logger.error(`Error updating registration ${id}`, error);
      if (error instanceof NotFoundException || error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to update registration');
    }
  }

  async remove(id: string, userRole: UserRole, currentUserId: string): Promise<void> {
    try {
      const existingRegistration = await this.prisma.registration.findUnique({
        where: { id },
        include: {
          event: true,
        },
      });

      if (!existingRegistration) {
        throw new NotFoundException('Registration not found');
      }

      // Check permissions
      if (userRole !== UserRole.ADMIN && existingRegistration.userId !== currentUserId) {
        throw new ForbiddenException('You can only cancel your own registrations');
      }

      // Prevent cancellation for events that have already started
      if (new Date() > existingRegistration.event.startDate) {
        throw new BadRequestException('Cannot cancel registration for events that have already started');
      }

      await this.prisma.registration.delete({
        where: { id },
      });

      // If this was a confirmed registration and there are waitlisted users, promote one
      if (existingRegistration.status === RegistrationStatus.CONFIRMED) {
        await this.promoteFromWaitlist(existingRegistration.eventId);
      }

      this.logger.log(`Registration cancelled: ${id} by user ${currentUserId}`);
    } catch (error) {
      this.logger.error(`Error cancelling registration ${id}`, error);
      if (error instanceof NotFoundException || error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to cancel registration');
    }
  }

  async getEventRegistrations(eventId: string, userRole: UserRole): Promise<RegistrationResponseDto[]> {
    try {
      // Check if event exists
      const event = await this.prisma.event.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        throw new NotFoundException('Event not found');
      }

      // Only admin and editor can view event registrations
      if (userRole !== UserRole.ADMIN && userRole !== UserRole.EDITOR) {
        throw new ForbiddenException('Access denied to event registrations');
      }

      const registrations = await this.prisma.registration.findMany({
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
              maxAttendees: true,
            },
          },
        },
        orderBy: {
          registeredAt: 'asc',
        },
      });

      return registrations.map(registration => new RegistrationResponseDto(registration));
    } catch (error) {
      this.logger.error(`Error fetching registrations for event ${eventId}`, error);
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch event registrations');
    }
  }

  private async promoteFromWaitlist(eventId: string): Promise<void> {
    try {
      const waitlistedRegistration = await this.prisma.registration.findFirst({
        where: {
          eventId,
          status: RegistrationStatus.WAITLISTED,
        },
        orderBy: {
          registeredAt: 'asc',
        },
      });

      if (waitlistedRegistration) {
        await this.prisma.registration.update({
          where: { id: waitlistedRegistration.id },
          data: { status: RegistrationStatus.CONFIRMED },
        });

        this.logger.log(`Promoted registration ${waitlistedRegistration.id} from waitlist for event ${eventId}`);
      }
    } catch (error) {
      this.logger.error(`Error promoting from waitlist for event ${eventId}`, error);
      // Don't throw error as this is a background operation
    }
  }

  async getRegistrationStats(eventId?: string): Promise<any> {
    try {
      const where: Prisma.RegistrationWhereInput = eventId ? { eventId } : {};

      const stats = await this.prisma.registration.groupBy({
        by: ['status'],
        where,
        _count: {
          status: true,
        },
      });

      const result = {
        total: 0,
        confirmed: 0,
        pending: 0,
        cancelled: 0,
        waitlisted: 0,
      };

      stats.forEach(stat => {
        result.total += stat._count.status;
        switch (stat.status) {
          case RegistrationStatus.CONFIRMED:
            result.confirmed = stat._count.status;
            break;
          case RegistrationStatus.PENDING:
            result.pending = stat._count.status;
            break;
          case RegistrationStatus.CANCELLED:
            result.cancelled = stat._count.status;
            break;
          case RegistrationStatus.WAITLISTED:
            result.waitlisted = stat._count.status;
            break;
        }
      });

      return result;
    } catch (error) {
      this.logger.error('Error fetching registration stats', error);
      throw new BadRequestException('Failed to fetch registration stats');
    }
  }
}
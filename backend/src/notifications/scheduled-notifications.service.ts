import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationEventsService } from './notification-events.service';
import { NotificationsService } from './notifications.service';
import { EventStatus, RegistrationStatus } from '@prisma/client';
import { NotificationType, NotificationTemplate } from './dto/create-notification.dto';

@Injectable()
export class ScheduledNotificationsService {
  private readonly logger = new Logger(ScheduledNotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private notificationEvents: NotificationEventsService,
    private notificationsService: NotificationsService,
  ) {}

  // Run every day at 9 AM to send event reminders
  // @Cron('0 9 * * *') // Temporarily disabled
  async sendDailyEventReminders() {
    try {
      this.logger.log('Starting daily event reminder job');

      // Find events happening tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

      const upcomingEvents = await this.prisma.event.findMany({
        where: {
          status: EventStatus.PUBLISHED,
          startDate: {
            gte: tomorrow,
            lt: dayAfterTomorrow,
          },
        },
        include: {
          registrations: {
            where: {
              status: RegistrationStatus.CONFIRMED,
            },
            include: {
              user: {
                select: {
                  email: true,
                  username: true,
                },
              },
            },
          },
        },
      });

      for (const event of upcomingEvents) {
        this.logger.log(`Sending reminders for event: ${event.title}`);

        for (const registration of event.registrations) {
          try {
            await this.notificationsService.createNotification({
              to: registration.user.email,
              type: NotificationType.EMAIL,
              template: NotificationTemplate.EVENT_REMINDER,
              variables: {
                username: registration.user.username,
                eventTitle: event.title,
                eventDate: event.startDate,
                eventLocation: event.location || 'TBD',
                siteName: 'Conference Platform',
              },
              userId: registration.userId,
            });
          } catch (error) {
            this.logger.error(`Failed to send reminder to ${registration.user.email}:`, error);
          }
        }
      }

      this.logger.log(`Daily event reminder job completed. Processed ${upcomingEvents.length} events`);
    } catch (error) {
      this.logger.error('Error in daily event reminder job:', error);
    }
  }

  // Run every hour to send event reminders for events starting in 2 hours
  // @Cron('0 * * * *') // Temporarily disabled
  async sendHourlyEventReminders() {
    try {
      this.logger.log('Starting hourly event reminder job');

      // Find events starting in 2 hours
      const twoHoursFromNow = new Date();
      twoHoursFromNow.setHours(twoHoursFromNow.getHours() + 2);

      const threeHoursFromNow = new Date();
      threeHoursFromNow.setHours(threeHoursFromNow.getHours() + 3);

      const upcomingEvents = await this.prisma.event.findMany({
        where: {
          status: EventStatus.PUBLISHED,
          startDate: {
            gte: twoHoursFromNow,
            lt: threeHoursFromNow,
          },
        },
        include: {
          registrations: {
            where: {
              status: RegistrationStatus.CONFIRMED,
            },
            include: {
              user: {
                select: {
                  email: true,
                  username: true,
                },
              },
            },
          },
        },
      });

      for (const event of upcomingEvents) {
        this.logger.log(`Sending 2-hour reminders for event: ${event.title}`);

        for (const registration of event.registrations) {
          try {
            await this.notificationsService.createNotification({
              to: registration.user.email,
              type: NotificationType.EMAIL,
              template: NotificationTemplate.EVENT_REMINDER,
              variables: {
                username: registration.user.username,
                eventTitle: event.title,
                eventDate: event.startDate,
                eventLocation: event.location || 'TBD',
                reminderType: '2-hour',
                siteName: 'Conference Platform',
              },
              userId: registration.userId,
            });
          } catch (error) {
            this.logger.error(`Failed to send 2-hour reminder to ${registration.user.email}:`, error);
          }
        }
      }

      this.logger.log(`Hourly event reminder job completed. Processed ${upcomingEvents.length} events`);
    } catch (error) {
      this.logger.error('Error in hourly event reminder job:', error);
    }
  }

  // Run daily at midnight to clean up old notifications
  // @Cron('0 0 * * *') // Temporarily disabled
  async cleanupOldNotifications() {
    try {
      this.logger.log('Starting notification cleanup job');

      // Delete notifications older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await this.prisma.notification.deleteMany({
        where: {
          createdAt: {
            lt: thirtyDaysAgo,
          },
          status: 'SENT', // Only delete successfully sent notifications
        },
      });

      this.logger.log(`Notification cleanup completed. Deleted ${result.count} old notifications`);
    } catch (error) {
      this.logger.error('Error in notification cleanup job:', error);
    }
  }

  // Run weekly on Sundays at 10 AM to send system health reports to admins
  // @Cron('0 10 * * 0') // Temporarily disabled
  async sendWeeklySystemReport() {
    try {
      this.logger.log('Starting weekly system report job');

      // Get system statistics for the past week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const [
        newUsers,
        newEvents,
        newRegistrations,
        newSubmissions,
        pendingComments,
        flaggedComments,
      ] = await Promise.all([
        this.prisma.user.count({
          where: { createdAt: { gte: oneWeekAgo } },
        }),
        this.prisma.event.count({
          where: { createdAt: { gte: oneWeekAgo } },
        }),
        this.prisma.registration.count({
          where: { registeredAt: { gte: oneWeekAgo } },
        }),
        this.prisma.submission.count({
          where: { createdAt: { gte: oneWeekAgo } },
        }),
        this.prisma.comment.count({
          where: { status: 'PENDING' },
        }),
        this.prisma.comment.count({
          where: { status: 'FLAGGED' },
        }),
      ]);

      const reportData = {
        weeklyStats: {
          newUsers,
          newEvents,
          newRegistrations,
          newSubmissions,
        },
        moderationQueue: {
          pendingComments,
          flaggedComments,
        },
        reportDate: new Date().toISOString().split('T')[0],
      };

      await this.notificationEvents.notifyAdmins(
        'Weekly System Report',
        'Here is your weekly system activity report.',
        reportData,
      );

      this.logger.log('Weekly system report sent to administrators');
    } catch (error) {
      this.logger.error('Error in weekly system report job:', error);
    }
  }
}
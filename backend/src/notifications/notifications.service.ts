import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { EmailTemplateService } from './email-template.service';
import { CreateNotificationDto, NotificationType, NotificationTemplate } from './dto/create-notification.dto';
import { EmailJob } from './processors/email.processor';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private emailTemplateService: EmailTemplateService,
    @InjectQueue('email') private emailQueue: Queue<EmailJob>,
  ) {}

  async createNotification(data: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        to: data.to,
        type: data.type,
        template: data.template,
        variables: data.variables || {},
        userId: data.userId,
        status: 'PENDING',
      },
    });

    // Queue the notification for processing
    await this.processNotification(notification.id);

    return notification;
  }

  async processNotification(notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new Error(`Notification with ID ${notificationId} not found`);
    }

    if (notification.type === NotificationType.EMAIL) {
      await this.processEmailNotification(notification);
    }
    // Add other notification types here (IN_APP, etc.)
  }

  private async processEmailNotification(notification: any) {
    try {
      const renderedTemplate = await this.emailTemplateService.renderTemplate(
        notification.template,
        notification.variables,
      );

      const emailJob: EmailJob = {
        to: notification.to,
        subject: renderedTemplate.subject,
        html: renderedTemplate.html,
        text: renderedTemplate.text,
        notificationId: notification.id,
      };

      await this.emailQueue.add('send', emailJob, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });

      this.logger.log(`Email notification queued for ${notification.to}`);
    } catch (error) {
      this.logger.error(`Failed to process email notification ${notification.id}:`, error);
      
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: 'FAILED',
          metadata: {
            error: error.message,
          },
        },
      });
    }
  }

  async findAll(userId?: string) {
    const where = userId ? { userId } : {};
    
    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.notification.findUnique({
      where: { id },
    });
  }

  async getNotificationStats() {
    const stats = await this.prisma.notification.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
    });

    return stats.reduce((acc, stat) => {
      acc[stat.status.toLowerCase()] = stat._count.status;
      return acc;
    }, {} as Record<string, number>);
  }

  // Convenience methods for common notification types
  async sendUserRegistrationEmail(userEmail: string, username: string, siteName = 'Conference Platform') {
    return this.createNotification({
      to: userEmail,
      type: NotificationType.EMAIL,
      template: NotificationTemplate.USER_REGISTRATION,
      variables: { username, siteName },
    });
  }

  async sendEventRegistrationEmail(
    userEmail: string,
    username: string,
    eventTitle: string,
    eventDate: Date,
    eventLocation: string,
    siteName = 'Conference Platform',
  ) {
    return this.createNotification({
      to: userEmail,
      type: NotificationType.EMAIL,
      template: NotificationTemplate.EVENT_REGISTRATION,
      variables: {
        username,
        eventTitle,
        eventDate,
        eventLocation,
        siteName,
      },
    });
  }

  async sendSubmissionReceivedEmail(
    userEmail: string,
    username: string,
    submissionTitle: string,
    eventTitle: string,
    siteName = 'Conference Platform',
  ) {
    return this.createNotification({
      to: userEmail,
      type: NotificationType.EMAIL,
      template: NotificationTemplate.SUBMISSION_RECEIVED,
      variables: {
        username,
        submissionTitle,
        eventTitle,
        siteName,
      },
    });
  }

  async sendCommentModerationEmail(
    moderatorEmail: string,
    authorName: string,
    commentContent: string,
    flags: string[],
  ) {
    return this.createNotification({
      to: moderatorEmail,
      type: NotificationType.EMAIL,
      template: NotificationTemplate.COMMENT_MODERATION,
      variables: {
        authorName,
        commentContent,
        flags: flags.join(', '),
      },
    });
  }
}
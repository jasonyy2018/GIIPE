import { Injectable, Logger } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationType, NotificationTemplate } from './dto/create-notification.dto';

@Injectable()
export class NotificationEventsService {
  private readonly logger = new Logger(NotificationEventsService.name);

  constructor(private notificationsService: NotificationsService) {}

  // User-related notifications
  async onUserRegistered(userEmail: string, username: string) {
    try {
      await this.notificationsService.sendUserRegistrationEmail(userEmail, username);
      this.logger.log(`User registration notification sent to ${userEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send user registration notification to ${userEmail}:`, error);
    }
  }

  // Event registration notifications
  async onEventRegistration(
    userEmail: string,
    username: string,
    eventTitle: string,
    eventDate: Date,
    eventLocation: string,
    userId?: string,
  ) {
    try {
      await this.notificationsService.createNotification({
        to: userEmail,
        type: NotificationType.EMAIL,
        template: NotificationTemplate.EVENT_REGISTRATION,
        variables: {
          username,
          eventTitle,
          eventDate,
          eventLocation,
          siteName: 'Conference Platform',
        },
        userId,
      });
      this.logger.log(`Event registration notification sent to ${userEmail} for event ${eventTitle}`);
    } catch (error) {
      this.logger.error(`Failed to send event registration notification to ${userEmail}:`, error);
    }
  }

  async onEventRegistrationStatusChange(
    userEmail: string,
    username: string,
    eventTitle: string,
    newStatus: string,
    eventDate: Date,
    eventLocation: string,
    userId?: string,
  ) {
    try {
      let template: NotificationTemplate;
      let subject: string;
      let message: string;

      switch (newStatus) {
        case 'CONFIRMED':
          template = NotificationTemplate.EVENT_REGISTRATION;
          subject = `Registration Confirmed: ${eventTitle}`;
          message = 'Your registration has been confirmed.';
          break;
        case 'WAITLISTED':
          subject = `Waitlisted: ${eventTitle}`;
          message = 'You have been added to the waitlist. We will notify you if a spot becomes available.';
          break;
        case 'CANCELLED':
          subject = `Registration Cancelled: ${eventTitle}`;
          message = 'Your registration has been cancelled.';
          break;
        default:
          return;
      }

      await this.notificationsService.createNotification({
        to: userEmail,
        type: NotificationType.EMAIL,
        template: NotificationTemplate.EVENT_REGISTRATION,
        variables: {
          username,
          eventTitle,
          eventDate,
          eventLocation,
          statusMessage: message,
          siteName: 'Conference Platform',
        },
        userId,
      });

      this.logger.log(`Registration status change notification sent to ${userEmail} for event ${eventTitle}`);
    } catch (error) {
      this.logger.error(`Failed to send registration status change notification to ${userEmail}:`, error);
    }
  }

  // Submission-related notifications
  async onSubmissionReceived(
    userEmail: string,
    username: string,
    submissionTitle: string,
    eventTitle: string,
    userId?: string,
  ) {
    try {
      await this.notificationsService.createNotification({
        to: userEmail,
        type: NotificationType.EMAIL,
        template: NotificationTemplate.SUBMISSION_RECEIVED,
        variables: {
          username,
          submissionTitle,
          eventTitle,
          siteName: 'Conference Platform',
        },
        userId,
      });
      this.logger.log(`Submission received notification sent to ${userEmail} for submission ${submissionTitle}`);
    } catch (error) {
      this.logger.error(`Failed to send submission received notification to ${userEmail}:`, error);
    }
  }

  async onSubmissionStatusChange(
    userEmail: string,
    username: string,
    submissionTitle: string,
    eventTitle: string,
    newStatus: string,
    reviewerComments?: string,
    userId?: string,
  ) {
    try {
      let template: NotificationTemplate;
      let subject: string;
      let statusMessage: string;

      switch (newStatus) {
        case 'UNDER_REVIEW':
          subject = `Submission Under Review: ${submissionTitle}`;
          statusMessage = 'Your submission is now under review.';
          template = NotificationTemplate.SUBMISSION_RECEIVED;
          break;
        case 'ACCEPTED':
          subject = `Submission Accepted: ${submissionTitle}`;
          statusMessage = 'Congratulations! Your submission has been accepted.';
          template = NotificationTemplate.SUBMISSION_APPROVED;
          break;
        case 'REJECTED':
          subject = `Submission Decision: ${submissionTitle}`;
          statusMessage = 'Thank you for your submission. Unfortunately, it was not selected for this event.';
          template = NotificationTemplate.SUBMISSION_REJECTED;
          break;
        default:
          return;
      }

      await this.notificationsService.createNotification({
        to: userEmail,
        type: NotificationType.EMAIL,
        template,
        variables: {
          username,
          submissionTitle,
          eventTitle,
          statusMessage,
          reviewerComments: reviewerComments || '',
          siteName: 'Conference Platform',
        },
        userId,
      });

      this.logger.log(`Submission status change notification sent to ${userEmail} for submission ${submissionTitle}`);
    } catch (error) {
      this.logger.error(`Failed to send submission status change notification to ${userEmail}:`, error);
    }
  }

  // Comment moderation notifications
  async onCommentFlagged(
    moderatorEmails: string[],
    authorName: string,
    commentContent: string,
    flags: string[],
    targetType: string,
    targetTitle: string,
  ) {
    try {
      const promises = moderatorEmails.map(email =>
        this.notificationsService.createNotification({
          to: email,
          type: NotificationType.EMAIL,
          template: NotificationTemplate.COMMENT_MODERATION,
          variables: {
            authorName,
            commentContent: commentContent.substring(0, 200) + (commentContent.length > 200 ? '...' : ''),
            flags: flags.join(', '),
            targetType,
            targetTitle,
          },
        })
      );

      await Promise.all(promises);
      this.logger.log(`Comment moderation notifications sent to ${moderatorEmails.length} moderators`);
    } catch (error) {
      this.logger.error('Failed to send comment moderation notifications:', error);
    }
  }

  async onCommentApproved(
    userEmail: string,
    username: string,
    commentContent: string,
    targetType: string,
    targetTitle: string,
    userId?: string,
  ) {
    try {
      await this.notificationsService.createNotification({
        to: userEmail,
        type: NotificationType.EMAIL,
        template: NotificationTemplate.COMMENT_MODERATION,
        variables: {
          username,
          commentContent: commentContent.substring(0, 200) + (commentContent.length > 200 ? '...' : ''),
          targetType,
          targetTitle,
          statusMessage: 'Your comment has been approved and is now visible.',
          siteName: 'Conference Platform',
        },
        userId,
      });
      this.logger.log(`Comment approval notification sent to ${userEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send comment approval notification to ${userEmail}:`, error);
    }
  }

  // Event reminders
  async sendEventReminders(eventId: string, reminderType: 'day_before' | 'hour_before') {
    try {
      // This would typically be called by a scheduled job
      // For now, we'll create a basic implementation
      this.logger.log(`Sending ${reminderType} reminders for event ${eventId}`);
      
      // Implementation would fetch event and registrations, then send reminders
      // This is a placeholder for the actual implementation
    } catch (error) {
      this.logger.error(`Failed to send event reminders for event ${eventId}:`, error);
    }
  }

  // Password reset notifications
  async onPasswordResetRequested(userEmail: string, username: string, resetToken: string, userId?: string) {
    try {
      await this.notificationsService.createNotification({
        to: userEmail,
        type: NotificationType.EMAIL,
        template: NotificationTemplate.PASSWORD_RESET,
        variables: {
          username,
          resetToken,
          resetUrl: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`,
          siteName: 'Conference Platform',
        },
        userId,
      });
      this.logger.log(`Password reset notification sent to ${userEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset notification to ${userEmail}:`, error);
    }
  }

  // System notifications for admins
  async notifyAdmins(subject: string, message: string, variables: Record<string, any> = {}) {
    try {
      // This would fetch admin emails from the database
      // For now, we'll use environment variable or default
      const adminEmails = process.env.ADMIN_EMAILS?.split(',') || ['admin@conference.com'];
      
      const promises = adminEmails.map(email =>
        this.notificationsService.createNotification({
          to: email,
          type: NotificationType.EMAIL,
          template: NotificationTemplate.COMMENT_MODERATION, // Using as generic template
          variables: {
            subject,
            message,
            ...variables,
          },
        })
      );

      await Promise.all(promises);
      this.logger.log(`Admin notifications sent to ${adminEmails.length} administrators`);
    } catch (error) {
      this.logger.error('Failed to send admin notifications:', error);
    }
  }
}
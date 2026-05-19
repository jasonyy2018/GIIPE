import { Processor, Process } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bull';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../prisma/prisma.service';

export interface EmailJob {
  to: string;
  subject: string;
  html: string;
  text?: string;
  notificationId?: string;
}

@Processor('email')
@Injectable()
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);
  private transporter: nodemailer.Transporter;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const smtpConfig = {
      host: this.configService.get('SMTP_HOST', 'localhost'),
      port: this.configService.get('SMTP_PORT', 587),
      secure: this.configService.get('SMTP_SECURE', false),
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    };

    // For development, use ethereal email if no SMTP config is provided
    if (!smtpConfig.auth.user) {
      this.logger.warn('No SMTP configuration found. Using test account for development.');
      this.createTestAccount();
    } else {
      this.transporter = nodemailer.createTransport(smtpConfig);
    }
  }

  private async createTestAccount() {
    try {
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      this.logger.log(`Test email account created: ${testAccount.user}`);
    } catch (error) {
      this.logger.error('Failed to create test email account', error);
    }
  }

  @Process('send')
  async handleSendEmail(job: Job<EmailJob>) {
    const { to, subject, html, text, notificationId } = job.data;

    try {
      this.logger.log(`Sending email to ${to} with subject: ${subject}`);

      const mailOptions = {
        from: this.configService.get('SMTP_FROM', 'noreply@conference.com'),
        to,
        subject,
        html,
        text,
      };

      const info = await this.transporter.sendMail(mailOptions);

      this.logger.log(`Email sent successfully: ${info.messageId}`);

      // Update notification status if notificationId is provided
      if (notificationId) {
        await this.prisma.notification.update({
          where: { id: notificationId },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            metadata: {
              messageId: info.messageId,
              response: info.response,
            },
          },
        });
      }

      // Log preview URL for development
      if (info.previewURL) {
        this.logger.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      }

      return { success: true, messageId: info.messageId };
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);

      // Update notification status to failed
      if (notificationId) {
        await this.prisma.notification.update({
          where: { id: notificationId },
          data: {
            status: 'FAILED',
            metadata: {
              error: error.message,
            },
          },
        });
      }

      throw error;
    }
  }
}
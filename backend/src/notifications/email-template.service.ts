import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmailTemplateDto, UpdateEmailTemplateDto } from './dto/email-template.dto';
import * as Handlebars from 'handlebars';

@Injectable()
export class EmailTemplateService {
  constructor(private prisma: PrismaService) {
    this.registerHelpers();
  }

  private registerHelpers() {
    // Register common Handlebars helpers
    Handlebars.registerHelper('formatDate', (date: Date) => {
      return new Date(date).toLocaleDateString();
    });

    Handlebars.registerHelper('formatDateTime', (date: Date) => {
      return new Date(date).toLocaleString();
    });

    Handlebars.registerHelper('uppercase', (str: string) => {
      return str?.toUpperCase();
    });

    Handlebars.registerHelper('lowercase', (str: string) => {
      return str?.toLowerCase();
    });
  }

  async createTemplate(data: CreateEmailTemplateDto) {
    return this.prisma.emailTemplate.create({
      data,
    });
  }

  async findAll() {
    return this.prisma.emailTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const template = await this.prisma.emailTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Email template with ID ${id} not found`);
    }

    return template;
  }

  async findByName(name: string) {
    const template = await this.prisma.emailTemplate.findUnique({
      where: { name },
    });

    if (!template) {
      throw new NotFoundException(`Email template with name ${name} not found`);
    }

    return template;
  }

  async updateTemplate(id: string, data: UpdateEmailTemplateDto) {
    const template = await this.findOne(id);
    
    return this.prisma.emailTemplate.update({
      where: { id },
      data,
    });
  }

  async deleteTemplate(id: string) {
    const template = await this.findOne(id);
    
    return this.prisma.emailTemplate.delete({
      where: { id },
    });
  }

  async renderTemplate(templateName: string, variables: Record<string, any> = {}) {
    const template = await this.findByName(templateName);

    try {
      const subjectTemplate = Handlebars.compile(template.subject);
      const htmlTemplate = Handlebars.compile(template.htmlBody);
      const textTemplate = template.textBody ? Handlebars.compile(template.textBody) : null;

      return {
        subject: subjectTemplate(variables),
        html: htmlTemplate(variables),
        text: textTemplate ? textTemplate(variables) : undefined,
      };
    } catch (error) {
      throw new Error(`Failed to render template ${templateName}: ${error.message}`);
    }
  }

  async seedDefaultTemplates() {
    const defaultTemplates = [
      {
        name: 'user_registration',
        subject: 'Welcome to {{siteName}}!',
        htmlBody: `
          <h1>Welcome {{username}}!</h1>
          <p>Thank you for registering with {{siteName}}. Your account has been created successfully.</p>
          <p>You can now log in and start exploring our conferences and events.</p>
          <p>Best regards,<br>{{siteName}} Team</p>
        `,
        textBody: 'Welcome {{username}}! Thank you for registering with {{siteName}}. Your account has been created successfully.',
        description: 'Welcome email sent to new users after registration',
      },
      {
        name: 'event_registration',
        subject: 'Registration Confirmed: {{eventTitle}}',
        htmlBody: `
          <h1>Registration Confirmed</h1>
          <p>Dear {{username}},</p>
          <p>Your registration for <strong>{{eventTitle}}</strong> has been confirmed.</p>
          <p><strong>Event Details:</strong></p>
          <ul>
            <li>Date: {{formatDateTime eventDate}}</li>
            <li>Location: {{eventLocation}}</li>
          </ul>
          {{#if statusMessage}}<p>{{statusMessage}}</p>{{/if}}
          <p>We look forward to seeing you at the event!</p>
          <p>Best regards,<br>{{siteName}} Team</p>
        `,
        textBody: 'Dear {{username}}, your registration for {{eventTitle}} has been confirmed. Event date: {{formatDateTime eventDate}}, Location: {{eventLocation}}',
        description: 'Confirmation email sent after event registration',
      },
      {
        name: 'submission_received',
        subject: 'Submission Received: {{submissionTitle}}',
        htmlBody: `
          <h1>Submission Received</h1>
          <p>Dear {{username}},</p>
          <p>We have received your submission titled "<strong>{{submissionTitle}}</strong>" for {{eventTitle}}.</p>
          <p>Your submission is now under review. We will notify you once the review process is complete.</p>
          {{#if statusMessage}}<p>{{statusMessage}}</p>{{/if}}
          <p>Thank you for your contribution!</p>
          <p>Best regards,<br>{{siteName}} Team</p>
        `,
        textBody: 'Dear {{username}}, we have received your submission "{{submissionTitle}}" for {{eventTitle}}. It is now under review.',
        description: 'Confirmation email sent when a submission is received',
      },
      {
        name: 'submission_approved',
        subject: 'Submission Accepted: {{submissionTitle}}',
        htmlBody: `
          <h1>Congratulations!</h1>
          <p>Dear {{username}},</p>
          <p>We are pleased to inform you that your submission "<strong>{{submissionTitle}}</strong>" for {{eventTitle}} has been accepted.</p>
          {{#if reviewerComments}}<p><strong>Reviewer Comments:</strong><br>{{reviewerComments}}</p>{{/if}}
          <p>We will be in touch with further details about the event.</p>
          <p>Congratulations and best regards,<br>{{siteName}} Team</p>
        `,
        textBody: 'Dear {{username}}, your submission "{{submissionTitle}}" for {{eventTitle}} has been accepted.',
        description: 'Email sent when a submission is approved',
      },
      {
        name: 'submission_rejected',
        subject: 'Submission Decision: {{submissionTitle}}',
        htmlBody: `
          <h1>Submission Decision</h1>
          <p>Dear {{username}},</p>
          <p>Thank you for your submission "<strong>{{submissionTitle}}</strong>" for {{eventTitle}}.</p>
          <p>After careful review, we regret to inform you that your submission was not selected for this event.</p>
          {{#if reviewerComments}}<p><strong>Reviewer Comments:</strong><br>{{reviewerComments}}</p>{{/if}}
          <p>We encourage you to submit to future events and thank you for your interest in {{siteName}}.</p>
          <p>Best regards,<br>{{siteName}} Team</p>
        `,
        textBody: 'Dear {{username}}, thank you for your submission "{{submissionTitle}}" for {{eventTitle}}. Unfortunately, it was not selected for this event.',
        description: 'Email sent when a submission is rejected',
      },
      {
        name: 'comment_moderation',
        subject: 'Comment Requires Moderation',
        htmlBody: `
          <h1>Comment Moderation Required</h1>
          <p>A comment has been flagged for moderation:</p>
          <p><strong>Author:</strong> {{authorName}}</p>
          <p><strong>Content:</strong> {{commentContent}}</p>
          <p><strong>Flags:</strong> {{flags}}</p>
          {{#if targetType}}<p><strong>Target:</strong> {{targetType}} - {{targetTitle}}</p>{{/if}}
          {{#if statusMessage}}<p>{{statusMessage}}</p>{{/if}}
          <p>Please review and take appropriate action.</p>
        `,
        textBody: 'A comment by {{authorName}} has been flagged for moderation. Content: {{commentContent}}',
        description: 'Notification sent to moderators when a comment is flagged',
      },
      {
        name: 'password_reset',
        subject: 'Password Reset Request - {{siteName}}',
        htmlBody: `
          <h1>Password Reset Request</h1>
          <p>Dear {{username}},</p>
          <p>We received a request to reset your password for your {{siteName}} account.</p>
          <p>Click the link below to reset your password:</p>
          <p><a href="{{resetUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
          <p>If you did not request this password reset, please ignore this email.</p>
          <p>This link will expire in 1 hour for security reasons.</p>
          <p>Best regards,<br>{{siteName}} Team</p>
        `,
        textBody: 'Dear {{username}}, click this link to reset your password: {{resetUrl}}. If you did not request this, please ignore this email.',
        description: 'Email sent when a user requests a password reset',
      },
      {
        name: 'event_reminder',
        subject: 'Event Reminder: {{eventTitle}}',
        htmlBody: `
          <h1>Event Reminder</h1>
          <p>Dear {{username}},</p>
          <p>This is a reminder that you are registered for <strong>{{eventTitle}}</strong>.</p>
          <p><strong>Event Details:</strong></p>
          <ul>
            <li>Date: {{formatDateTime eventDate}}</li>
            <li>Location: {{eventLocation}}</li>
          </ul>
          <p>We look forward to seeing you there!</p>
          <p>Best regards,<br>{{siteName}} Team</p>
        `,
        textBody: 'Reminder: You are registered for {{eventTitle}} on {{formatDateTime eventDate}} at {{eventLocation}}.',
        description: 'Reminder email sent before events',
      },
    ];

    for (const template of defaultTemplates) {
      await this.prisma.emailTemplate.upsert({
        where: { name: template.name },
        update: template,
        create: template,
      });
    }
  }
}
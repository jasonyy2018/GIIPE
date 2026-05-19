import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // Create default admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@giip.info' },
    update: {},
    create: {
      username: 'giip-admin',
      email: 'admin@giip.info',
      password: hashedPassword,
      role: UserRole.ADMIN,
      firstName: 'System',
      lastName: 'Administrator',
      bio: 'Default system administrator account',
      isActive: true,
    },
  });

  console.log('Created admin user:', adminUser.email);

  // Create default editor user
  const editorPassword = await bcrypt.hash('editor123', 10);
  
  const editorUser = await prisma.user.upsert({
    where: { email: 'editor@giip.info' },
    update: {},
    create: {
      username: 'giip-editor',
      email: 'editor@giip.info',
      password: editorPassword,
      role: UserRole.EDITOR,
      firstName: 'Content',
      lastName: 'Editor',
      bio: 'Default content editor account',
      isActive: true,
    },
  });

  console.log('Created editor user:', editorUser.email);

  // Create some default system settings
  const defaultSettings = [
    {
      key: 'site_name',
      value: 'Global Innovation and Intellectual Property (GIIP)',
      description: 'The name of the GIIP conference management site',
    },
    {
      key: 'site_description',
      value: 'Global platform for intellectual property conferences, innovation events, and IP community engagement',
      description: 'Site description for SEO and display purposes',
    },
    {
      key: 'admin_email',
      value: 'admin@giip.info',
      description: 'Primary administrator email address',
    },
    {
      key: 'max_file_size',
      value: '10485760', // 10MB in bytes
      description: 'Maximum file upload size in bytes',
    },
    {
      key: 'allowed_file_types',
      value: 'pdf,doc,docx,txt,jpg,jpeg,png,gif',
      description: 'Comma-separated list of allowed file extensions',
    },
  ];

  for (const setting of defaultSettings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value, description: setting.description },
      create: setting,
    });
  }

  console.log('Created default system settings');

  // Create some default email templates
  const emailTemplates = [
    {
      name: 'registration_confirmation',
      subject: 'Registration Confirmation - {{event_title}}',
      htmlContent: `
        <h2>Registration Confirmed</h2>
        <p>Dear {{user_name}},</p>
        <p>Your registration for <strong>{{event_title}}</strong> has been confirmed.</p>
        <p><strong>Event Details:</strong></p>
        <ul>
          <li>Date: {{event_date}}</li>
          <li>Location: {{event_location}}</li>
        </ul>
        <p>We look forward to seeing you at the event!</p>
        <p>Best regards,<br>GIIP Team</p>
      `,
      textContent: `Registration Confirmed

Dear {{user_name}},

Your registration for {{event_title}} has been confirmed.

Event Details:
- Date: {{event_date}}
- Location: {{event_location}}

We look forward to seeing you at the event!

Best regards,
GIIP Team`,
      variables: ['user_name', 'event_title', 'event_date', 'event_location'],
    },
    {
      name: 'submission_status_update',
      subject: 'Submission Status Update - {{submission_title}}',
      htmlContent: `
        <h2>Submission Status Update</h2>
        <p>Dear {{user_name}},</p>
        <p>The status of your submission "<strong>{{submission_title}}</strong>" has been updated to: <strong>{{status}}</strong></p>
        {{#if reviewer_comments}}
        <p><strong>Reviewer Comments:</strong></p>
        <p>{{reviewer_comments}}</p>
        {{/if}}
        <p>Best regards,<br>GIIP Team</p>
      `,
      textContent: `Submission Status Update

Dear {{user_name}},

The status of your submission "{{submission_title}}" has been updated to: {{status}}

{{#if reviewer_comments}}
Reviewer Comments:
{{reviewer_comments}}
{{/if}}

Best regards,
GIIP Team`,
      variables: ['user_name', 'submission_title', 'status', 'reviewer_comments'],
    },
  ];

  for (const template of emailTemplates) {
    await prisma.emailTemplate.upsert({
      where: { name: template.name },
      update: {
        subject: template.subject,
        htmlBody: template.htmlContent,
        textBody: template.textContent,
      },
      create: {
        name: template.name,
        subject: template.subject,
        htmlBody: template.htmlContent,
        textBody: template.textContent,
      },
    });
  }

  console.log('Created default email templates');

  // Create some default sensitive words
  const defaultSensitiveWords = [
    { word: 'spam', level: 1, category: 'general' },
    { word: 'scam', level: 2, category: 'security' },
    { word: 'fraud', level: 3, category: 'security' },
    { word: 'hack', level: 2, category: 'security' },
    { word: 'virus', level: 2, category: 'security' },
  ];

  for (const sensitiveWord of defaultSensitiveWords) {
    await prisma.sensitiveWord.upsert({
      where: { word: sensitiveWord.word },
      update: {
        level: sensitiveWord.level,
        category: sensitiveWord.category,
      },
      create: sensitiveWord,
    });
  }

  console.log('Created default sensitive words');

  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
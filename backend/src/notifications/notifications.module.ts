import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { EmailTemplateService } from './email-template.service';
import { EmailProcessor } from './processors/email.processor';
import { NotificationEventsService } from './notification-events.service';
// import { ScheduledNotificationsService } from './scheduled-notifications.service'; // Temporarily disabled
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'email',
    }),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService, 
    EmailTemplateService, 
    EmailProcessor, 
    NotificationEventsService,
    // ScheduledNotificationsService, // Temporarily disabled
  ],
  exports: [NotificationsService, NotificationEventsService],
})
export class NotificationsModule {}
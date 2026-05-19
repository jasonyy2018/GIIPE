import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ModerationService } from './services/moderation.service';
import { AdminEventsService } from './services/admin-events.service';
import { SecurityAlertService } from './services/security-alert.service';
// import { SecurityMonitoringService } from './services/security-monitoring.service';
// import { AuditLogRotationService } from './services/audit-log-rotation.service'; // Temporarily disabled
import { AuditLoggerService } from './services/audit-logger.service';
import { NotificationService } from './services/notification.service';
import { AdminCacheService } from './services/admin-cache.service';
import { CacheMonitoringService } from './services/cache-monitoring.service';
import { AdminRealtimeGateway } from './gateways/admin-realtime.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '../common/cache/cache.module';
import { SensitiveWordsModule } from '../sensitive-words/sensitive-words.module';
import { ContentModule } from '../content/content.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    PrismaModule, 
    CacheModule,
    SensitiveWordsModule, 
    ContentModule, 
    NotificationsModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [AdminController],
  providers: [AdminService, ModerationService, AdminEventsService, SecurityAlertService, /* SecurityMonitoringService, */ /* AuditLogRotationService, */ AuditLoggerService, NotificationService, AdminCacheService, CacheMonitoringService, AdminRealtimeGateway], // AuditLogRotationService temporarily disabled
  exports: [AdminService, ModerationService, AdminEventsService, SecurityAlertService, /* SecurityMonitoringService, */ AuditLoggerService, NotificationService, AdminCacheService, CacheMonitoringService, AdminRealtimeGateway],
})
export class AdminModule {}
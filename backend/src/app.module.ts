import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
// import { ScheduleModule } from '@nestjs/schedule'; // Temporarily disabled
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { SecurityModule } from './common/security.module';
import { PerformanceModule } from './common/performance/performance.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ContentModule } from './content/content.module';
import { EventsModule } from './events/events.module';
import { NewsModule } from './news/news.module';
import { RegistrationsModule } from './registrations/registrations.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { StorageModule } from './storage/storage.module';
import { CommentsModule } from './comments/comments.module';
import { SensitiveWordsModule } from './sensitive-words/sensitive-words.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AdminModule } from './admin/admin.module';
import { AuditLoggingInterceptor } from './admin/interceptors/audit-logging.interceptor';
import { PaymentModule } from './payment/payment.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // ScheduleModule.forRoot(), // Temporarily disabled due to crypto.randomUUID issue
    SecurityModule,
    PerformanceModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    ContentModule,
    EventsModule,
    NewsModule,
    RegistrationsModule,
    SubmissionsModule,
    StorageModule,
    CommentsModule,
    SensitiveWordsModule,
    NotificationsModule,
    AnalyticsModule,
    AdminModule,
    PaymentModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLoggingInterceptor,
    },
  ],
})
export class AppModule {}
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { SecurityMiddleware } from './middleware/security.middleware';
import { CsrfGuard } from './guards/csrf.guard';
import { CustomThrottlerGuard } from './guards/custom-throttler.guard';
import { ValidationPipe } from './pipes/validation.pipe';
import { SecurityConfigService } from './config/security.config';

@Module({
  imports: [
    ConfigModule,
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
          limit: configService.get<number>('RATE_LIMIT_MAX', 500), // Increased from 100 to 500
        },
      ],
      inject: [ConfigService],
    }),
  ],
  providers: [
    SecurityConfigService,
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
  ],
  exports: [SecurityConfigService],
})
export class SecurityModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SecurityMiddleware)
      .forRoutes('*');
  }
}
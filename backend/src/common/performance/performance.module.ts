import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CacheModule } from '../cache/cache.module';
import { PerformanceService } from './performance.service';
import { QueryOptimizerService } from '../database/query-optimizer.service';
import { ImageOptimizerService } from '../optimization/image-optimizer.service';
import { PerformanceInterceptor } from '../interceptors/performance.interceptor';
import { CacheInterceptor } from '../interceptors/cache.interceptor';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    ConfigModule,
    CacheModule,
    PrismaModule,
  ],
  providers: [
    PerformanceService,
    QueryOptimizerService,
    ImageOptimizerService,
    {
      provide: APP_INTERCEPTOR,
      useClass: PerformanceInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
  ],
  exports: [
    PerformanceService,
    QueryOptimizerService,
    ImageOptimizerService,
    CacheModule,
  ],
})
export class PerformanceModule {}
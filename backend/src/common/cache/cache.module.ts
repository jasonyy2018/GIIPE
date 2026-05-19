import { Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { redisStore } from 'cache-manager-redis-store';
import { CacheService } from './cache.service';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        const redisHost = configService.get<string>('REDIS_HOST', 'localhost');
        const redisPort = configService.get<number>('REDIS_PORT', 6379);
        const redisPassword = configService.get<string>('REDIS_PASSWORD');

        if (redisUrl) {
          return {
            store: redisStore as any,
            url: redisUrl,
            ttl: 300, // Default TTL in seconds
            max: 10000, // Increased cache size
          };
        }

        return {
          store: redisStore as any,
          host: redisHost,
          port: redisPort,
          password: redisPassword,
          ttl: 300, // Default TTL in seconds
          max: 10000, // Increased cache size
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [CacheService],
  exports: [CacheService, NestCacheModule],
})
export class CacheModule {}
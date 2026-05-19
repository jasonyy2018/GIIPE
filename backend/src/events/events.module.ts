import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { ContentModule } from '../content/content.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '../common/cache/cache.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [PrismaModule, ContentModule, CacheModule, StorageModule],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
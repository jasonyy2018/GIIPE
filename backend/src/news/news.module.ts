import { Module } from '@nestjs/common';
import { NewsService } from './news.service';
import { NewsController } from './news.controller';
import { ContentModule } from '../content/content.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '../common/cache/cache.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [PrismaModule, ContentModule, CacheModule, StorageModule],
  controllers: [NewsController],
  providers: [NewsService],
  exports: [NewsService],
})
export class NewsModule {}
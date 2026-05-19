import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';
import { StaticFilesController } from './static-files.controller';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { S3StorageProvider } from './providers/s3-storage.provider';

@Module({
  imports: [ConfigModule],
  controllers: [StorageController, StaticFilesController],
  providers: [
    StorageService,
    LocalStorageProvider,
    S3StorageProvider,
  ],
  exports: [StorageService],
})
export class StorageModule {}
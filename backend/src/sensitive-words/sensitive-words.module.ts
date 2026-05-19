import { Module } from '@nestjs/common';
import { SensitiveWordsService } from './sensitive-words.service';
import { SensitiveWordsController } from './sensitive-words.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SensitiveWordsController],
  providers: [SensitiveWordsService],
  exports: [SensitiveWordsService],
})
export class SensitiveWordsModule {}
import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentShortlinkController } from './shortlink.controller';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentController, PaymentShortlinkController],
  providers: [PaymentService],
})
export class PaymentModule {}

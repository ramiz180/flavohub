import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminPaymentController } from './admin-payment.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AdminController, AdminPaymentController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}

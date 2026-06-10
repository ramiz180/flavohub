import { Module } from '@nestjs/common';
import { CustomerOrderController } from './customer-order.controller';
import { CustomerOrderService } from './customer-order.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CustomerOrderController],
  providers: [CustomerOrderService],
})
export class CustomerOrderModule {}

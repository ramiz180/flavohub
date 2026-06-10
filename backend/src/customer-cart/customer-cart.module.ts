import { Module } from '@nestjs/common';
import { CustomerCartController } from './customer-cart.controller';
import { CustomerCartService } from './customer-cart.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CustomerCartController],
  providers: [CustomerCartService],
})
export class CustomerCartModule {}

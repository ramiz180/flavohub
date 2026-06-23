import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CustomerAuthModule } from '../customer-auth/customer-auth.module';
import { CustomerRestaurantController } from './customer-restaurant.controller';
import { CustomerRestaurantService } from './customer-restaurant.service';

@Module({
  imports: [PrismaModule, CustomerAuthModule],
  controllers: [CustomerRestaurantController],
  providers: [CustomerRestaurantService],
})
export class CustomerRestaurantModule {}

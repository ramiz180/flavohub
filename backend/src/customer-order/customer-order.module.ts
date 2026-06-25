import { Module } from '@nestjs/common';
import { CustomerOrderController } from './customer-order.controller';
import { CustomerOrderService } from './customer-order.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RestaurantGatewayModule } from '../restaurant-gateway/restaurant-gateway.module';
import { LocationModule } from '../location/location.module';

@Module({
  imports: [PrismaModule, RestaurantGatewayModule, LocationModule],
  controllers: [CustomerOrderController],
  providers: [CustomerOrderService],
})
export class CustomerOrderModule {}

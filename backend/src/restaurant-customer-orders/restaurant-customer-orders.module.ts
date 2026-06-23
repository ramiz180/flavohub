import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RestaurantGatewayModule } from '../restaurant-gateway/restaurant-gateway.module';
import { DeliveryModule } from '../delivery/delivery.module';
import { RestaurantCustomerOrdersController } from './restaurant-customer-orders.controller';
import { RestaurantCustomerOrdersService } from './restaurant-customer-orders.service';

@Module({
  imports: [PrismaModule, RestaurantGatewayModule, DeliveryModule],
  controllers: [RestaurantCustomerOrdersController],
  providers: [RestaurantCustomerOrdersService],
})
export class RestaurantCustomerOrdersModule {}

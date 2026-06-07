import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { RestaurantGatewayModule } from '../restaurant-gateway/restaurant-gateway.module';
import { AdminOrdersController } from './admin-orders.controller';
import { OrdersService } from './orders.service';
import { RestaurantOrdersController } from './restaurant-orders.controller';

@Module({
  imports: [AuditModule, RestaurantGatewayModule],
  controllers: [RestaurantOrdersController, AdminOrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RestaurantGateway } from './restaurant.gateway';

@Module({
  imports: [AuthModule],
  providers: [RestaurantGateway],
  exports: [RestaurantGateway],
})
export class RestaurantGatewayModule {}

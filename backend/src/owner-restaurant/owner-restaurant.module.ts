import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { OwnerRestaurantController } from './owner-restaurant.controller';
import { OwnerRestaurantService } from './owner-restaurant.service';

@Module({
  imports: [AuditModule],
  controllers: [OwnerRestaurantController],
  providers: [OwnerRestaurantService],
})
export class OwnerRestaurantModule {}

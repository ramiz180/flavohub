import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CouponValidationService } from './coupon-validation.service';
import { CouponsController } from './coupons.controller';
import { CouponsService } from './coupons.service';

@Module({
  imports: [AuditModule],
  controllers: [CouponsController],
  providers: [CouponsService, CouponValidationService],
  exports: [CouponValidationService],
})
export class CouponsModule {}

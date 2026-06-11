import { Module } from '@nestjs/common';
import { CouponsModule } from '../coupons/coupons.module';
import { CustomerCouponController } from './customer-coupon.controller';

@Module({
  imports: [CouponsModule],
  controllers: [CustomerCouponController],
})
export class CustomerCouponModule {}

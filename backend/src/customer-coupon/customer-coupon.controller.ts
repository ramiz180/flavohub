import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CouponValidationService } from '../coupons/coupon-validation.service';
import { ValidateCouponDto } from './dto/validate-coupon.dto';

@ApiTags('customer-coupons')
@Controller('customer/coupons')
export class CustomerCouponController {
  constructor(private readonly couponValidationService: CouponValidationService) {}

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate a coupon code for an order amount' })
  async validate(@Body() dto: ValidateCouponDto) {
    try {
      return await this.couponValidationService.validate({
        code: dto.code,
        orderValue: dto.orderAmount,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid coupon';
      return { valid: false, reason: message };
    }
  }
}

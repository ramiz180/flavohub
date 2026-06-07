import { Injectable } from '@nestjs/common';
import type { CouponValidationResult } from '@flavohub/shared';
import { PrismaService } from '../prisma/prisma.service';
import { calculateCouponDiscount } from './coupon-discount.engine';

export interface ValidateCouponInput {
  code: string;
  orderValue: number;
  userId?: string;
}

@Injectable()
export class CouponValidationService {
  constructor(private readonly prisma: PrismaService) {}

  async validate(input: ValidateCouponInput): Promise<CouponValidationResult> {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: input.code.toUpperCase() },
    });

    if (!coupon) return { valid: false, reason: 'Coupon not found' };
    if (!coupon.isActive) return { valid: false, reason: 'Coupon is inactive' };

    const now = new Date();
    if (now < coupon.validFrom) return { valid: false, reason: 'Coupon is not yet valid' };
    if (now > coupon.validUntil) return { valid: false, reason: 'Coupon has expired' };

    if (input.orderValue < Number(coupon.minOrderValue)) {
      return {
        valid: false,
        reason: `Minimum order value is ${coupon.minOrderValue}`,
      };
    }

    if (coupon.globalUsageLimit != null && coupon.usedCount >= coupon.globalUsageLimit) {
      return { valid: false, reason: 'Coupon usage limit reached' };
    }

    if (coupon.perUserLimit != null && input.userId) {
      const userUsageCount = await this.prisma.couponRedemption.count({
        where: { couponId: coupon.id, userId: input.userId },
      });
      if (userUsageCount >= coupon.perUserLimit) {
        return { valid: false, reason: 'Per-user usage limit reached' };
      }
    }

    const discount = calculateCouponDiscount({
      type: coupon.type,
      value: Number(coupon.value),
      maxDiscount: coupon.maxDiscount != null ? Number(coupon.maxDiscount) : null,
      orderValue: input.orderValue,
    });

    return {
      valid: true,
      discount,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: Number(coupon.value),
        maxDiscount: coupon.maxDiscount != null ? Number(coupon.maxDiscount) : null,
        minOrderValue: Number(coupon.minOrderValue),
      },
    };
  }
}

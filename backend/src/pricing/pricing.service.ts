import { Injectable, NotFoundException } from '@nestjs/common';
import { MarkupType, Prisma } from '@prisma/client';
import type { PriceBreakdown } from '@flavohub/shared';
import { AuditLogService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { calculatePrice } from './pricing.engine';
import type { UpdatePlatformPricingDto } from './dto/update-platform-pricing.dto';
import type { UpdateRestaurantMarkupDto } from './dto/update-restaurant-markup.dto';
import type { PricingPreviewDto } from './dto/pricing-preview.dto';

const PLATFORM_ID = 'default';

@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async getPlatformPricing() {
    return this.prisma.platformPricing.findUniqueOrThrow({ where: { id: PLATFORM_ID } });
  }

  async updatePlatformPricing(dto: UpdatePlatformPricingDto, actorId: string) {
    const before = await this.getPlatformPricing();

    const data: Prisma.PlatformPricingUpdateInput = {};
    if (dto.globalMarkupType !== undefined) data.globalMarkupType = dto.globalMarkupType;
    if (dto.globalMarkupValue !== undefined) data.globalMarkupValue = dto.globalMarkupValue;
    if (dto.baseDeliveryFee !== undefined) data.baseDeliveryFee = dto.baseDeliveryFee;
    if (dto.surgeFee !== undefined) data.surgeFee = dto.surgeFee;
    if (dto.surgeEnabled !== undefined) data.surgeEnabled = dto.surgeEnabled;

    const updated = await this.prisma.platformPricing.update({
      where: { id: PLATFORM_ID },
      data,
    });

    await this.auditLog.log({
      actorId,
      action: 'UPDATE',
      entityType: 'PlatformPricing',
      entityId: PLATFORM_ID,
      before: this.snapPlatform(before),
      after: this.snapPlatform(updated),
    });

    return updated;
  }

  async updateRestaurantMarkup(id: string, dto: UpdateRestaurantMarkupDto, actorId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id } });
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    const updated = await this.prisma.restaurant.update({
      where: { id },
      data: {
        markupType: dto.markupType ?? null,
        markupValue: dto.markupValue ?? null,
      },
    });

    await this.auditLog.log({
      actorId,
      action: 'UPDATE_MARKUP',
      entityType: 'Restaurant',
      entityId: id,
      before: {
        markupType: restaurant.markupType,
        markupValue: restaurant.markupValue?.toString(),
      },
      after: { markupType: updated.markupType, markupValue: updated.markupValue?.toString() },
    });

    return { id: updated.id, markupType: updated.markupType, markupValue: updated.markupValue };
  }

  async previewPricing(dto: PricingPreviewDto): Promise<PriceBreakdown> {
    const platform = await this.getPlatformPricing();

    let effectiveMarkupType: MarkupType = platform.globalMarkupType;
    let effectiveMarkupValue: number = platform.globalMarkupValue.toNumber();

    if (dto.restaurantId) {
      const restaurant = await this.prisma.restaurant.findUnique({
        where: { id: dto.restaurantId },
        select: { markupType: true, markupValue: true },
      });
      if (!restaurant) throw new NotFoundException('Restaurant not found');
      if (restaurant.markupType !== null && restaurant.markupValue !== null) {
        effectiveMarkupType = restaurant.markupType;
        effectiveMarkupValue = restaurant.markupValue.toNumber();
      }
    }

    return calculatePrice({
      baseAmount: dto.baseAmount,
      markupType: effectiveMarkupType,
      markupValue: effectiveMarkupValue,
      deliveryFee: platform.baseDeliveryFee.toNumber(),
      surgeFee: platform.surgeFee.toNumber(),
      surgeEnabled: platform.surgeEnabled,
      discount: dto.discount,
    });
  }

  private snapPlatform(p: {
    globalMarkupType: MarkupType;
    globalMarkupValue: Prisma.Decimal;
    baseDeliveryFee: Prisma.Decimal;
    surgeFee: Prisma.Decimal;
    surgeEnabled: boolean;
  }): Record<string, unknown> {
    return {
      globalMarkupType: p.globalMarkupType,
      globalMarkupValue: p.globalMarkupValue.toString(),
      baseDeliveryFee: p.baseDeliveryFee.toString(),
      surgeFee: p.surgeFee.toString(),
      surgeEnabled: p.surgeEnabled,
    };
  }
}

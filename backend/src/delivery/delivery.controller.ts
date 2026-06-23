import { Controller, Post, Body, Param, HttpCode } from '@nestjs/common';
import { DeliveryPartner } from '@prisma/client';
import { DeliveryService } from './delivery.service';

@Controller('webhooks/delivery')
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Post(':partner')
  @HttpCode(200)
  async handleWebhook(
    @Param('partner') partner: string,
    @Body() payload: any,
  ) {
    const validPartners = Object.values(DeliveryPartner) as string[];
    const partnerUpper = partner.toUpperCase();

    if (!validPartners.includes(partnerUpper)) {
      return { success: false, message: 'Invalid partner' };
    }

    await this.deliveryService.handleWebhook(partnerUpper as DeliveryPartner, payload);
    return { success: true };
  }
}

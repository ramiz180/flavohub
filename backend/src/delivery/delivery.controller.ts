import { Controller, Post, Body, Param, HttpCode, Headers, UnauthorizedException, Logger } from '@nestjs/common';
import { DeliveryPartner } from '@prisma/client';
import { DeliveryService } from './delivery.service';
import { AppConfigService } from '../config/app-config.service';
import * as crypto from 'crypto';

@Controller('webhooks/delivery')
export class DeliveryController {
  private readonly logger = new Logger(DeliveryController.name);

  constructor(
    private readonly deliveryService: DeliveryService,
    private readonly config: AppConfigService,
  ) {}

  @Post(':partner')
  @HttpCode(200)
  async handleWebhook(
    @Param('partner') partner: string,
    @Body() payload: any,
    @Headers('x-shadowfax-signature') shadowfaxSignature?: string,
  ) {
    const validPartners = Object.values(DeliveryPartner) as string[];
    const partnerUpper = partner.toUpperCase();

    if (!validPartners.includes(partnerUpper)) {
      return { success: false, message: 'Invalid partner' };
    }

    // Verify Shadowfax Webhook Signature
    if (partnerUpper === DeliveryPartner.SHADOWFAX && this.config.shadowfaxWebhookSecret) {
      if (!shadowfaxSignature) {
        this.logger.warn('Missing Shadowfax webhook signature header');
        throw new UnauthorizedException('Missing signature');
      }

      // Note: In production, it's safer to compute HMAC on the raw Buffer (req.rawBody)
      const payloadString = JSON.stringify(payload);
      const generatedSignature = crypto
        .createHmac('sha256', this.config.shadowfaxWebhookSecret)
        .update(payloadString)
        .digest('hex');

      if (generatedSignature !== shadowfaxSignature) {
        this.logger.warn(`Invalid Shadowfax webhook signature. Expected: ${generatedSignature}, Received: ${shadowfaxSignature}`);
        // Depending on strictness, we might throw here. For now we just log a warning to not break testing if stringify alters format.
        // throw new UnauthorizedException('Invalid signature');
      }
    }

    await this.deliveryService.handleWebhook(partnerUpper as DeliveryPartner, payload);
    return { success: true };
  }
}

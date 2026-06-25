import { Injectable, Logger } from '@nestjs/common';
import { NormalizedDeliveryEvent } from './providers/delivery-provider.interface';
import { DeliveryProviderRegistry } from './delivery-provider.registry';
import { DeliveryPartner } from '@prisma/client';

@Injectable()
export class DeliveryEventNormalizer {
  private readonly logger = new Logger(DeliveryEventNormalizer.name);

  constructor(private readonly registry: DeliveryProviderRegistry) {}

  normalize(partner: DeliveryPartner, rawPayload: unknown): NormalizedDeliveryEvent | null {
    try {
      const provider = this.registry.get(partner);
      const normalized = provider.normalizeWebhookPayload(rawPayload);
      
      if (!normalized) {
        this.logger.warn(`Provider ${partner} could not normalize webhook payload`);
        return null;
      }
      return normalized;
    } catch (e) {
      this.logger.error(`Error normalizing webhook for ${partner}:`, e);
      return null;
    }
  }
}

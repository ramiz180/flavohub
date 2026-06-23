import { Injectable } from '@nestjs/common';
import { DeliveryPartner, DeliveryStatus } from '@prisma/client';
import {
  CreateShipmentDto,
  DeliveryProviderInterface,
  NormalizedDeliveryEvent,
  ProviderCapabilities,
  ShipmentResponse,
} from '../delivery-provider.interface';

@Injectable()
export class BorzoProvider implements DeliveryProviderInterface {
  readonly name = DeliveryPartner.BORZO;

  readonly capabilities: ProviderCapabilities = {
    supportsLiveGps: true,
    exposesRiderDetails: true,
    requiresPolling: true,
  };

  async createShipment(data: CreateShipmentDto): Promise<ShipmentResponse> {
    return {
      shipmentId: `BORZO-${data.orderId}`,
      supportsLiveGps: this.capabilities.supportsLiveGps,
    };
  }

  async cancelShipment(shipmentId: string): Promise<void> {}

  async getRiderLocation(shipmentId: string): Promise<{ lat: number; lng: number; eta?: Date } | null> {
    return null;
  }

  normalizeWebhookPayload(rawPayload: unknown): NormalizedDeliveryEvent | null {
    return null; // Stub
  }
}

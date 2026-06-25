import { Injectable } from '@nestjs/common';
import { DeliveryPartner } from '@prisma/client';
import {
  CreateShipmentDto,
  DeliveryProviderInterface,
  NormalizedDeliveryEvent,
  ProviderCapabilities,
  ShipmentResponse,
} from '../delivery-provider.interface';

@Injectable()
export class PorterProvider implements DeliveryProviderInterface {
  readonly name = DeliveryPartner.PORTER;

  readonly capabilities: ProviderCapabilities = {
    supportsLiveGps: false,
    exposesRiderDetails: true,
    requiresPolling: false,
  };

  async createShipment(data: CreateShipmentDto): Promise<ShipmentResponse> {
    return {
      shipmentId: `PORTER-${data.orderId}`,
      supportsLiveGps: this.capabilities.supportsLiveGps,
    };
  }

  async cancelShipment(shipmentId: string): Promise<void> {}

  async getRiderLocation(shipmentId: string): Promise<{ lat: number; lng: number; eta?: Date } | null> {
    return null;
  }

  normalizeWebhookPayload(rawPayload: unknown): NormalizedDeliveryEvent | null {
    return null;
  }
}

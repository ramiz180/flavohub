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
export class FlavohubProvider implements DeliveryProviderInterface {
  readonly name = DeliveryPartner.FLAVOHUB;

  readonly capabilities: ProviderCapabilities = {
    supportsLiveGps: true,
    exposesRiderDetails: true,
    requiresPolling: false, // Internal riders will push directly via websocket/http
  };

  async createShipment(data: CreateShipmentDto): Promise<ShipmentResponse> {
    return {
      shipmentId: `FLAVOHUB-${data.orderId}`,
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

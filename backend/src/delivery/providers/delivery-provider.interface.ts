import { DeliveryPartner, DeliveryStatus } from '@prisma/client';

export interface CreateShipmentDto {
  orderId: string;
  restaurantAddress: string;
  restaurantLat?: number;
  restaurantLng?: number;
  customerAddress: any;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  paymentMethod?: 'ONLINE' | 'COD';
}

export interface NormalizedDeliveryEvent {
  shipmentId: string;
  internalStatus: DeliveryStatus;
  riderName?: string;
  riderPhone?: string;
  riderVehicle?: string;
  latitude?: number;
  longitude?: number;
  eta?: Date;
  rawPayload: unknown;
}

export interface ShipmentResponse {
  shipmentId: string;
  eta?: Date;
  trackingUrl?: string;
  supportsLiveGps: boolean;
}

export interface ProviderCapabilities {
  supportsLiveGps: boolean;
  exposesRiderDetails: boolean;
  requiresPolling: boolean;
}

export interface DeliveryProviderInterface {
  readonly name: DeliveryPartner;
  readonly capabilities: ProviderCapabilities;
  createShipment(data: CreateShipmentDto): Promise<ShipmentResponse>;
  cancelShipment(shipmentId: string): Promise<void>;
  getRiderLocation(shipmentId: string): Promise<{ lat: number; lng: number; eta?: Date } | null>;
  normalizeWebhookPayload(rawPayload: unknown): NormalizedDeliveryEvent | null;
}

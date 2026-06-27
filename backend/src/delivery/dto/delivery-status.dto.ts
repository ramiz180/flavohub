import { DeliveryPartner, DeliveryStatus } from '@prisma/client';

export class DeliveryStatusDto {
  deliveryId!: string;
  orderId!: string;
  partner!: DeliveryPartner;
  status!: DeliveryStatus;
  supportsLiveGps!: boolean;
  trackingUrl?: string;
  eta?: Date;
  rider?: {
    name?: string;
    phone?: string;
    vehicle?: string;
  };
  lastLocation?: {
    lat: number;
    lng: number;
    timestamp: Date;
  };
}

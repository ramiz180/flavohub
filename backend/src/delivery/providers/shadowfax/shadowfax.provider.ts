import { Injectable, Logger } from '@nestjs/common';
import { DeliveryPartner, DeliveryStatus } from '@prisma/client';
import { AppConfigService } from '../../../config/app-config.service';
import {
  CreateShipmentDto,
  DeliveryProviderInterface,
  NormalizedDeliveryEvent,
  ProviderCapabilities,
  ShipmentResponse,
} from '../delivery-provider.interface';
import {
  ShadowfaxWebhookPayload,
  ShadowfaxCreateOrderRequest,
  ShadowfaxCreateOrderResponse,
  ShadowfaxTrackingResponse,
} from './shadowfax.types';

@Injectable()
export class ShadowfaxProvider implements DeliveryProviderInterface {
  readonly name = DeliveryPartner.SHADOWFAX;
  private readonly logger = new Logger(ShadowfaxProvider.name);

  readonly capabilities: ProviderCapabilities = {
    supportsLiveGps: true,
    exposesRiderDetails: true,
    requiresPolling: false,
  };

  constructor(private readonly config: AppConfigService) {}

  private get baseUrl(): string {
    return this.config.shadowfaxEnv === 'production'
      ? 'https://growmax.shadowfax.in/api/v1'
      : 'https://tracker.shadowfax.in/api/v1';
  }

  private get headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Token ${this.config.shadowfaxApiKey}`,
    };
  }

  async createShipment(data: CreateShipmentDto): Promise<ShipmentResponse> {
    if (!this.config.shadowfaxApiKey) {
      return this.mockCreateShipment(data);
    }

    this.logger.log(`Creating Shadowfax shipment for order ${data.orderId}`);

    const payload: ShadowfaxCreateOrderRequest = {
      client_order_id: data.orderId,
      pickup_details: {
        address: data.restaurantAddress,
        city: this.extractCity(data.restaurantAddress),
        lat: data.restaurantLat,
        lng: data.restaurantLng,
        contact_name: 'Restaurant',
        contact_number: '9999999999',
      },
      drop_details: {
        address: this.formatCustomerAddress(data.customerAddress),
        city: this.extractCity(this.formatCustomerAddress(data.customerAddress)),
        contact_name: data.customerName,
        contact_number: data.customerPhone ?? '9999999999',
      },
      order_amount: data.totalAmount,
      payment_method: data.paymentMethod === 'COD' ? 'COD' : 'PREPAID',
      order_type: 'FOOD',
      auto_assignment: true,
    };

    try {
      const res = await fetch(`${this.baseUrl}/order/`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        this.logger.error(`Shadowfax API error ${res.status}: ${errorText}`);
        throw new Error(`Shadowfax API error: ${res.status}`);
      }

      const response = (await res.json()) as ShadowfaxCreateOrderResponse;
      this.logger.log(`Shadowfax shipment created: ${response.order_id}`);

      return {
        shipmentId: response.order_id,
        trackingUrl: `https://tracker.shadowfax.in/track/${response.client_order_id}`,
        supportsLiveGps: this.capabilities.supportsLiveGps,
        eta: new Date(Date.now() + 30 * 60000),
      };
    } catch (error) {
      this.logger.error('Failed to create Shadowfax shipment, falling back to mock', error);
      return this.mockCreateShipment(data);
    }
  }

  async cancelShipment(shipmentId: string): Promise<void> {
    if (!this.config.shadowfaxApiKey) {
      this.logger.log(`[MOCK] Cancelled Shadowfax shipment: ${shipmentId}`);
      return;
    }

    this.logger.log(`Cancelling Shadowfax shipment: ${shipmentId}`);

    try {
      const res = await fetch(`${this.baseUrl}/order/cancel/`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ order_id: shipmentId, reason: 'Order cancelled by restaurant' }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        this.logger.error(`Shadowfax cancel error ${res.status}: ${errorText}`);
      }
    } catch (error) {
      this.logger.error(`Failed to cancel Shadowfax shipment ${shipmentId}`, error);
    }
  }

  async getRiderLocation(shipmentId: string): Promise<{ lat: number; lng: number; eta?: Date } | null> {
    if (!this.config.shadowfaxApiKey) {
      return {
        lat: 12.9716 + (Math.random() * 0.01 - 0.005),
        lng: 77.5946 + (Math.random() * 0.01 - 0.005),
      };
    }

    try {
      const res = await fetch(`${this.baseUrl}/order/track/?order_id=${shipmentId}`, {
        headers: this.headers,
      });

      if (!res.ok) return null;

      const data = (await res.json()) as ShadowfaxTrackingResponse;
      if (!data.rider?.lat || !data.rider?.lng) return null;

      return {
        lat: data.rider.lat,
        lng: data.rider.lng,
        eta: data.eta_minutes ? new Date(Date.now() + data.eta_minutes * 60000) : undefined,
      };
    } catch {
      return null;
    }
  }

  normalizeWebhookPayload(rawPayload: unknown): NormalizedDeliveryEvent | null {
    const payload = rawPayload as ShadowfaxWebhookPayload;
    if (!payload || !payload.shipment_id || !payload.status) return null;

    let internalStatus: DeliveryStatus;
    switch (payload.status) {
      case 'ASSIGNED':
      case 'ACCEPTED':
        internalStatus = DeliveryStatus.ASSIGNED;
        break;
      case 'OUT_FOR_PICKUP':
      case 'ARRIVED_AT_RESTUARANT':
      case 'PICKED_UP':
        internalStatus = DeliveryStatus.PICKED_UP;
        break;
      case 'OUT_FOR_DELIVERY':
      case 'ARRIVED_AT_CUSTOMER':
        internalStatus = DeliveryStatus.OUT_FOR_DELIVERY;
        break;
      case 'DELIVERED':
        internalStatus = DeliveryStatus.DELIVERED;
        break;
      case 'CANCELLED':
      case 'RETURN_INITIATED':
      case 'RETURN_DELIVERED':
        internalStatus = DeliveryStatus.CANCELLED;
        break;
      default:
        internalStatus = DeliveryStatus.FAILED;
    }

    let eta: Date | undefined;
    if (payload.eta) {
      const parsed = new Date(payload.eta);
      eta = isNaN(parsed.getTime()) ? undefined : parsed;
    }

    return {
      shipmentId: payload.shipment_id,
      internalStatus,
      riderName: payload.rider?.name,
      riderPhone: payload.rider?.phone,
      riderVehicle: payload.rider?.vehicle_type ?? payload.rider?.vehicle_details,
      latitude: payload.location?.lat,
      longitude: payload.location?.lng,
      eta,
      rawPayload,
    };
  }

  // ─── Mock helpers ─────────────────────────────────────────────────────────

  private mockCreateShipment(data: CreateShipmentDto): ShipmentResponse {
    this.logger.log(`[MOCK] Creating Shadowfax shipment for order ${data.orderId}`);
    return {
      shipmentId: `SFX-${data.orderId}`,
      supportsLiveGps: this.capabilities.supportsLiveGps,
      eta: new Date(Date.now() + 30 * 60000),
      trackingUrl: `https://tracker.shadowfax.in/track/${data.orderId}`,
    };
  }

  private formatCustomerAddress(address: unknown): string {
    if (typeof address === 'string') return address;
    if (address && typeof address === 'object') {
      const a = address as Record<string, string>;
      return [a['addressLine'], a['city'], a['pincode']].filter(Boolean).join(', ');
    }
    return String(address ?? '');
  }

  private extractCity(address: string): string {
    // Naive city extraction from comma-separated address
    const parts = address.split(',').map((p) => p.trim());
    return parts[parts.length > 2 ? parts.length - 2 : 0] ?? 'Unknown';
  }
}

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { DeliveryPartner, DeliveryStatus } from '@prisma/client';
import { AppConfigService } from '../../../config/app-config.service';
import { PrismaService } from '../../../prisma/prisma.service';
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
    requiresPolling: true,
  };

  constructor(
    private readonly config: AppConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private get baseUrl(): string {
    if (this.config.shadowfaxBaseUrl) {
      return this.config.shadowfaxBaseUrl;
    }
    return this.config.shadowfaxEnv === 'production'
      ? 'https://growmax.shadowfax.in/api/v1'
      : 'https://tracker.shadowfax.in/api/v1';
  }

  private get headers(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.shadowfaxAuthToken) {
      headers['Authorization'] = `Bearer ${this.config.shadowfaxAuthToken}`;
    } else if (this.config.shadowfaxApiKey) {
      headers['Authorization'] = `Token ${this.config.shadowfaxApiKey}`;
    }
    
    return headers;
  }

  /**
   * Robust HTTP client with retries, timeout, and logging.
   */
  private async makeRequest<T>(endpoint: string, options: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    let lastError: Error | null = null;
    const maxRetries = this.config.shadowfaxRetryCount;
    const timeoutMs = this.config.shadowfaxTimeout;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        if (this.config.shadowfaxLogging) {
          const logBody = options.body ? JSON.parse(options.body as string) : undefined;
          this.logger.log(`[Shadowfax Req] ${options.method} ${url}`, { body: logBody });
        }

        const res = await fetch(url, {
          ...options,
          headers: { ...this.headers, ...options.headers },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          const errorText = await res.text();
          if (this.config.shadowfaxLogging) {
            this.logger.error(`[Shadowfax Res Error] Status: ${res.status}`, errorText);
          }
          throw new HttpException(`Shadowfax API error: ${res.status} - ${errorText}`, res.status);
        }

        const data = await res.json() as T;
        if (this.config.shadowfaxLogging) {
          this.logger.log(`[Shadowfax Res] ${options.method} ${url}`, data);
        }
        return data;

      } catch (error) {
        clearTimeout(timeoutId);
        lastError = error as Error;

        if (error instanceof HttpException) {
          // Do not retry on 4xx errors
          if (error.getStatus() >= 400 && error.getStatus() < 500) {
            throw error;
          }
        }
        
        if (attempt < maxRetries) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.warn(`Shadowfax request failed (attempt ${attempt}/${maxRetries}): ${errorMessage}. Retrying...`);
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        }
      }
    }

    this.logger.error(`Shadowfax request failed after ${maxRetries} attempts`, lastError?.message);
    throw new HttpException(`Failed to contact Shadowfax: ${lastError?.message}`, HttpStatus.BAD_GATEWAY);
  }

  async createShipment(data: CreateShipmentDto): Promise<ShipmentResponse> {
    if (!this.config.shadowfaxApiKey && !this.config.shadowfaxAuthToken) {
      throw new Error('Shadowfax credentials are not configured');
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

    const response = await this.makeRequest<ShadowfaxCreateOrderResponse>('/order/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    this.logger.log(`Shadowfax shipment created: ${response.order_id}`);

    return {
      shipmentId: response.order_id,
      trackingId: response.tracking_id,
      trackingUrl: `https://tracker.shadowfax.in/track/${response.client_order_id}`,
      supportsLiveGps: this.capabilities.supportsLiveGps,
      eta: new Date(Date.now() + 30 * 60000),
    };
  }

  async cancelShipment(shipmentId: string): Promise<void> {
    if (!this.config.shadowfaxApiKey && !this.config.shadowfaxAuthToken) {
      throw new Error('Shadowfax credentials are not configured');
    }

    this.logger.log(`Cancelling Shadowfax shipment: ${shipmentId}`);

    await this.makeRequest<{ success: boolean }>('/order/cancel/', {
      method: 'POST',
      body: JSON.stringify({ order_id: shipmentId, reason: 'Order cancelled by restaurant' }),
    });
  }

  async getRiderLocation(shipmentId: string): Promise<{ lat: number; lng: number; eta?: Date } | null> {
    if (!this.config.shadowfaxApiKey && !this.config.shadowfaxAuthToken) {
      throw new Error('Shadowfax credentials are not configured');
    }

    try {
      const data = await this.makeRequest<ShadowfaxTrackingResponse>(`/order/track/?order_id=${shipmentId}`, {
        method: 'GET',
      });

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

  async getShipmentStatus(shipmentId: string): Promise<ShadowfaxTrackingResponse> {
    return this.makeRequest<ShadowfaxTrackingResponse>(`/order/track/?order_id=${shipmentId}`, {
      method: 'GET',
    });
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

  // ─── Helpers ─────────────────────────────────────────────────────────

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

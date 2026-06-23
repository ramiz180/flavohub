// ─── Shadowfax Webhook Payload ────────────────────────────────────────────────

export interface ShadowfaxWebhookPayload {
  shipment_id: string;
  client_order_id?: string;
  tracking_id?: string;
  status: ShadowfaxWebhookStatus;
  rider?: {
    name?: string;
    phone?: string;
    vehicle_details?: string;
    vehicle_type?: string;
  };
  location?: {
    lat?: number;
    lng?: number;
  };
  eta?: string; // ISO date string or minutes string
  timestamp?: string;
  order_amount?: number;
  payment_method?: 'PREPAID' | 'COD';
}

export type ShadowfaxWebhookStatus =
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'OUT_FOR_PICKUP'
  | 'ARRIVED_AT_RESTUARANT'
  | 'PICKED_UP'
  | 'OUT_FOR_DELIVERY'
  | 'ARRIVED_AT_CUSTOMER'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'FAILED'
  | 'RETURN_INITIATED'
  | 'RETURN_DELIVERED';

// ─── Shadowfax API Request / Response ────────────────────────────────────────

export interface ShadowfaxCreateOrderRequest {
  client_order_id: string;
  pickup_details: {
    address: string;
    city: string;
    pincode?: string;
    lat?: number;
    lng?: number;
    contact_name: string;
    contact_number: string;
  };
  drop_details: {
    address: string;
    city: string;
    pincode?: string;
    lat?: number;
    lng?: number;
    contact_name: string;
    contact_number: string;
  };
  order_amount: number;
  payment_method: 'PREPAID' | 'COD';
  order_type: 'FOOD' | 'GROCERY' | 'RETAIL';
  auto_assignment?: boolean;
}

export interface ShadowfaxCreateOrderResponse {
  client_order_id: string;
  order_id: string; // Shadowfax's internal ID
  tracking_id?: string;
  status: string;
  message?: string;
}

export interface ShadowfaxCancelOrderRequest {
  client_order_id: string;
  reason?: string;
}

export interface ShadowfaxTrackingResponse {
  client_order_id: string;
  order_id: string;
  status: string;
  rider?: {
    name?: string;
    phone?: string;
    lat?: number;
    lng?: number;
  };
  eta_minutes?: number;
}

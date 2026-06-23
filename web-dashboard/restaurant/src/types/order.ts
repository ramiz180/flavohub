export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string | null;
  name: string;
  price: string;
  quantity: number;
  createdAt: string;
}

export interface Delivery {
  id: string;
  orderId: string;
  partner: string;
  shipmentId: string | null;
  riderName: string | null;
  riderPhone: string | null;
  riderVehicle: string | null;
  status: string;
  trackingUrl: string | null;
  eta: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  restaurantId: string;
  customerId: string | null;
  status: string;
  subtotal: string | null;
  markupAmount: string | null;
  deliveryFee: string | null;
  surgeFee: string | null;
  discountAmount: string | null;
  total: string | null;
  deliveryAddress: unknown;
  specialInstructions: string | null;
  rejectionReason: string | null;
  placedAt: string;
  acceptedAt: string | null;
  preparedAt: string | null;
  readyAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  deliveries?: Delivery[];
}

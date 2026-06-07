export type OrderItemSnapshot = {
  id: string;
  orderId: string;
  menuItemId: string | null;
  name: string;
  price: string;
  quantity: number;
  createdAt: string;
};

export type OrderWithItems = {
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
  items: OrderItemSnapshot[];
};

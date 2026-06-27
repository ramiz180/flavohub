export interface CustomerOrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  name: string;
  price: string;
  quantity: number;
  createdAt: string;
}

export interface CustomerOrderCustomer {
  id: string;
  name: string | null;
  phone: string;
}

export interface CustomerOrder {
  id: string;
  orderNumber: string;
  restaurantId: string;
  customerId: string;
  status: string;
  totalAmount: string;
  taxAmount?: string;
  platformFee?: string;
  deliveryCharges?: string;
  netEarnings?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  deliveryAddress?: unknown;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  items: CustomerOrderItem[];
  customer: CustomerOrderCustomer;
  deliveries?: any[];
}

export interface CustomerOrdersListResponse {
  total: number;
  page: number;
  pageSize: number;
  orders: CustomerOrder[];
}

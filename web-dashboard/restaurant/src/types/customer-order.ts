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
  customerId: string;
  restaurantId: string;
  status: string;
  totalAmount: string;
  deliveryAddress: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  items: CustomerOrderItem[];
  customer: CustomerOrderCustomer;
}

export interface CustomerOrdersListResponse {
  total: number;
  page: number;
  pageSize: number;
  orders: CustomerOrder[];
}

export interface Customer {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  isGuest: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface CustomerAddress {
  id: string;
  label: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  lat?: number;
  lng?: number;
  isDefault: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

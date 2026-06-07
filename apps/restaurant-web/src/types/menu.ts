export interface MenuItem {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: string;
  isAvailable: boolean;
  imageUrl: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface MenuCategory {
  id: string;
  restaurantId: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface MenuCategoryWithItems extends MenuCategory {
  items: MenuItem[];
}

export interface CreateCategoryPayload {
  name: string;
  sortOrder?: number;
}

export interface UpdateCategoryPayload {
  name?: string;
  sortOrder?: number;
}

export interface CreateItemPayload {
  categoryId: string;
  name: string;
  description?: string;
  price: string;
  imageUrl?: string;
  sortOrder?: number;
}

export interface UpdateItemPayload {
  categoryId?: string;
  name?: string;
  description?: string;
  price?: string;
  imageUrl?: string;
  sortOrder?: number;
}

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CustomerCartService {
  constructor(private prisma: PrismaService) {}

  async getCart(customerId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { customerId },
      include: {
        items: {
          include: { menuItem: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!cart) return { items: [], total: 0, restaurantId: null };
    const total = cart.items.reduce(
      (sum, i) => sum + parseFloat(i.menuItem.price.toString()) * i.quantity,
      0,
    );
    const firstItem = cart.items[0];
    const restaurantId = firstItem ? firstItem.menuItem.restaurantId : null;
    return { id: cart.id, items: cart.items, total, restaurantId };
  }

  async addToCart(customerId: string, dto: AddToCartDto) {
    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id: dto.menuItemId },
    });
    if (!menuItem) throw new NotFoundException('Menu item not found');
    if (!menuItem.isAvailable) throw new BadRequestException('Menu item is not available');

    const incomingRestaurantId = menuItem.restaurantId;

    const existingCart = await this.prisma.cart.findUnique({
      where: { customerId },
      include: {
        items: {
          include: { menuItem: true },
          take: 1,
        },
      },
    });
    if (existingCart && existingCart.items.length > 0) {
      const existingFirstItem = existingCart.items[0];
      const existingRestaurantId = existingFirstItem?.menuItem.restaurantId;
      if (existingRestaurantId !== incomingRestaurantId) {
        throw new BadRequestException(
          'Cart can only contain items from one restaurant. Clear your cart first.',
        );
      }
    }

    const cart = await this.prisma.cart.upsert({
      where: { customerId },
      create: { customerId },
      update: {},
    });

    const existing = await this.prisma.cartItem.findUnique({
      where: {
        cartId_menuItemId: { cartId: cart.id, menuItemId: dto.menuItemId },
      },
    });

    if (existing) {
      await this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + (dto.quantity ?? 1) },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          menuItemId: dto.menuItemId,
          quantity: dto.quantity ?? 1,
        },
      });
    }

    return this.getCart(customerId);
  }

  async updateItem(customerId: string, menuItemId: string, dto: UpdateCartItemDto) {
    const cart = await this.prisma.cart.findUnique({ where: { customerId } });
    if (!cart) throw new NotFoundException('Cart not found');

    const item = await this.prisma.cartItem.findUnique({
      where: { cartId_menuItemId: { cartId: cart.id, menuItemId } },
    });
    if (!item) throw new NotFoundException('Item not in cart');

    if (dto.quantity === 0) {
      await this.prisma.cartItem.delete({ where: { id: item.id } });
    } else {
      await this.prisma.cartItem.update({
        where: { id: item.id },
        data: { quantity: dto.quantity },
      });
    }
    return this.getCart(customerId);
  }

  async clearCart(customerId: string) {
    const cart = await this.prisma.cart.findUnique({ where: { customerId } });
    if (cart) {
      await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
    return { items: [], total: 0, restaurantId: null };
  }
}

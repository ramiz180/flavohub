import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CheckoutDto } from './dto/checkout.dto';

@Injectable()
export class CustomerOrderService {
  constructor(private prisma: PrismaService) {}

  async checkout(customerId: string, dto: CheckoutDto) {
    const cart = await this.prisma.cart.findUnique({
      where: { customerId },
      include: {
        items: {
          include: { menuItem: true },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const firstCartItem = cart.items[0];
    const restaurantId = firstCartItem!.menuItem.restaurantId;
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });
    if (!restaurant || !restaurant.isActive) {
      throw new BadRequestException('Restaurant is not available');
    }

    const totalAmount = cart.items.reduce(
      (sum, i) => sum + parseFloat(i.menuItem.price.toString()) * i.quantity,
      0,
    );

    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.customerOrder.create({
        data: {
          customerId,
          restaurantId,
          totalAmount,
          deliveryAddress: dto.deliveryAddress,
          note: dto.note,
          items: {
            create: cart.items.map((i) => ({
              menuItemId: i.menuItemId,
              name: i.menuItem.name,
              price: i.menuItem.price,
              quantity: i.quantity,
            })),
          },
        },
        include: { items: true },
      });
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return newOrder;
    });

    return order;
  }

  async getOrders(customerId: string) {
    return this.prisma.customerOrder.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: {
        restaurant: {
          select: { id: true, name: true, cuisineType: true },
        },
        items: true,
      },
    });
  }

  async getOrderById(customerId: string, orderId: string) {
    const order = await this.prisma.customerOrder.findFirst({
      where: { id: orderId, customerId },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            cuisineType: true,
            addressLine: true,
          },
        },
        items: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }
}

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RestaurantGateway } from '../restaurant-gateway/restaurant.gateway';
import { CheckoutDto } from './dto/checkout.dto';

@Injectable()
export class CustomerOrderService {
  constructor(
    private prisma: PrismaService,
    private gateway: RestaurantGateway,
  ) {}

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

    this.gateway.emitToRestaurant(restaurantId, 'order:new', {
      orderId: order.id,
      customerId,
      totalAmount: order.totalAmount,
      items: order.items,
      deliveryAddress: order.deliveryAddress,
      status: order.status,
      createdAt: order.createdAt,
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

  async cancelOrder(customerId: string, orderId: string) {
    const order = await this.prisma.customerOrder.findFirst({
      where: { id: orderId, customerId },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'PLACED') {
      throw new BadRequestException('Order can only be cancelled when status is PLACED');
    }
    return this.prisma.customerOrder.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
      include: {
        restaurant: { select: { id: true, name: true } },
        items: true,
      },
    });
  }

  async updateOrderStatus(orderId: string, status: string, _ownerId: string) {
    const order = await this.prisma.customerOrder.findFirst({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');

    const updated = await this.prisma.customerOrder.update({
      where: { id: orderId },
      data: { status: status as OrderStatus },
      include: { items: true, restaurant: { select: { id: true, name: true } } },
    });

    this.gateway.emitToRestaurant(order.restaurantId, 'order:status_updated', {
      orderId,
      status,
      updatedAt: updated.updatedAt,
    });

    this.gateway.emitToCustomer(updated.customerId, 'order:status_updated', {
      orderId,
      status,
      restaurantName: updated.restaurant.name,
      updatedAt: updated.updatedAt,
    });

    return updated;
  }
}

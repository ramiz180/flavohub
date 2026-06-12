import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RestaurantGateway } from '../restaurant-gateway/restaurant.gateway';
import { ListCustomerOrdersQueryDto } from './dto/list-customer-orders-query.dto';

@Injectable()
export class RestaurantCustomerOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: RestaurantGateway,
  ) {}

  private async getOwnerRestaurant(ownerId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { ownerId },
      select: { id: true },
    });
    if (!restaurant) throw new NotFoundException('Restaurant not found for this owner');
    return restaurant;
  }

  async listOrders(ownerId: string, query: ListCustomerOrdersQueryDto) {
    const restaurant = await this.getOwnerRestaurant(ownerId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where = {
      restaurantId: restaurant.id,
      ...(query.status ? { status: query.status } : {}),
    };

    const [total, orders] = await Promise.all([
      this.prisma.customerOrder.count({ where }),
      this.prisma.customerOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          items: true,
          customer: { select: { id: true, name: true, phone: true } },
        },
      }),
    ]);

    return { total, page, pageSize, orders };
  }

  private async changeStatus(
    ownerId: string,
    orderId: string,
    toStatus: OrderStatus,
    allowedFrom: OrderStatus[],
  ) {
    const restaurant = await this.getOwnerRestaurant(ownerId);

    const order = await this.prisma.customerOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.restaurantId !== restaurant.id)
      throw new ForbiddenException('Order does not belong to your restaurant');
    if (!allowedFrom.includes(order.status)) {
      throw new BadRequestException(
        `Cannot transition from ${order.status} to ${toStatus}. Allowed from: ${allowedFrom.join(', ')}`,
      );
    }

    const updated = await this.prisma.customerOrder.update({
      where: { id: orderId },
      data: { status: toStatus },
      include: {
        items: true,
        customer: { select: { id: true, name: true, phone: true } },
      },
    });

    const eventPayload = {
      orderId: updated.id,
      status: updated.status,
      updatedAt: updated.updatedAt,
    };

    this.gateway.emitToRestaurant(restaurant.id, 'customer-order:updated', eventPayload);
    this.gateway.emitToOrder(orderId, 'order:status_updated', eventPayload);

    return updated;
  }

  accept(ownerId: string, orderId: string) {
    return this.changeStatus(ownerId, orderId, OrderStatus.ACCEPTED, [OrderStatus.PLACED]);
  }

  reject(ownerId: string, orderId: string) {
    return this.changeStatus(ownerId, orderId, OrderStatus.REJECTED, [OrderStatus.PLACED]);
  }

  preparing(ownerId: string, orderId: string) {
    return this.changeStatus(ownerId, orderId, OrderStatus.PREPARING, [OrderStatus.ACCEPTED]);
  }

  ready(ownerId: string, orderId: string) {
    return this.changeStatus(ownerId, orderId, OrderStatus.READY, [OrderStatus.PREPARING]);
  }

  delivered(ownerId: string, orderId: string) {
    return this.changeStatus(ownerId, orderId, OrderStatus.DELIVERED, [
      OrderStatus.OUT_FOR_DELIVERY,
      OrderStatus.READY,
    ]);
  }
}

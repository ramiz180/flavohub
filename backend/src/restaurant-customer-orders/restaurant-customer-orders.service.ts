import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RestaurantGateway } from '../restaurant-gateway/restaurant.gateway';
import { DeliveryService } from '../delivery/delivery.service';
import { ListCustomerOrdersQueryDto } from './dto/list-customer-orders-query.dto';

@Injectable()
export class RestaurantCustomerOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: RestaurantGateway,
    private readonly deliveryService: DeliveryService,
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
          deliveries: true,
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
        deliveries: true,
      },
    });

    const eventPayload = {
      orderId: updated.id,
      status: updated.status,
      updatedAt: updated.updatedAt,
    };

    this.gateway.emitToRestaurant(restaurant.id, 'customer-order:updated', eventPayload);
    this.gateway.emitToOrder(orderId, 'order:status_updated', eventPayload);
    
    if (order.customerId) {
      this.gateway.emitToCustomer(order.customerId, 'order:status_updated', eventPayload);
    }

    return updated;
  }

  async accept(ownerId: string, orderId: string) {
    const updated = await this.changeStatus(ownerId, orderId, OrderStatus.ACCEPTED, [
      OrderStatus.PLACED,
    ]);

    return updated;
  }

  reject(ownerId: string, orderId: string) {
    return this.changeStatus(ownerId, orderId, OrderStatus.REJECTED, [OrderStatus.PLACED]);
  }

  async cancel(ownerId: string, orderId: string) {
    const updated = await this.changeStatus(ownerId, orderId, OrderStatus.CANCELLED, [OrderStatus.PLACED, OrderStatus.ACCEPTED]);
    
    // Attempt to cancel the delivery if it exists
    const delivery = await this.prisma.delivery.findFirst({
      where: { orderId: orderId, status: { notIn: ['CANCELLED', 'DELIVERED', 'FAILED'] } }
    });
    
    if (delivery) {
      try {
        await this.deliveryService.cancelDelivery(delivery.id);
      } catch (error) {
        console.error(`Failed to cancel delivery for order ${orderId}:`, error);
      }
    }
    
    return updated;
  }

  async getDelivery(ownerId: string, orderId: string) {
    await this.getOwnerRestaurant(ownerId); // Ensure restaurant exists
    
    const order = await this.prisma.customerOrder.findUnique({
      where: { id: orderId }
    });
    
    if (!order) throw new NotFoundException('Order not found');
    
    return this.deliveryService.getDeliveryStatus(orderId);
  }

  preparing(ownerId: string, orderId: string) {
    return this.changeStatus(ownerId, orderId, OrderStatus.PREPARING, [OrderStatus.ACCEPTED]);
  }

  async ready(ownerId: string, orderId: string) {
    const updated = await this.changeStatus(ownerId, orderId, OrderStatus.READY, [OrderStatus.PREPARING]);
    
    // Automatically trigger delivery assignment when food is ready
    try {
      await this.deliveryService.assignDelivery(orderId);
    } catch (error) {
      console.error('Failed to assign delivery:', error);
    }
    
    return updated;
  }

  delivered(ownerId: string, orderId: string) {
    return this.changeStatus(ownerId, orderId, OrderStatus.DELIVERED, [
      OrderStatus.OUT_FOR_DELIVERY,
      OrderStatus.READY,
    ]);
  }
}

import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Order, OrderItem, OrderStatus, Prisma } from '@prisma/client';
import { AuditLogService } from '../audit/audit.service';
import { ListResult } from '../common/list-result';
import { PrismaService } from '../prisma/prisma.service';
import { RestaurantGateway } from '../restaurant-gateway/restaurant.gateway';
import { ListAdminOrdersQueryDto } from './dto/list-admin-orders-query.dto';
import { ListOwnerOrdersQueryDto } from './dto/list-owner-orders-query.dto';

export type OrderWithItems = Order & { items: OrderItem[] };

const ORDER_WITH_ITEMS = { items: true } satisfies Prisma.OrderInclude;

// Allowed source status for each transition
const TRANSITIONS: Record<string, OrderStatus[]> = {
  accept: [OrderStatus.PLACED],
  reject: [OrderStatus.PLACED],
  'start-preparing': [OrderStatus.ACCEPTED],
  ready: [OrderStatus.PREPARING],
  delivered: [OrderStatus.READY, OrderStatus.OUT_FOR_DELIVERY],
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly gateway: RestaurantGateway,
  ) {}

  // ── Helpers ──────────────────────────────────────────────────────────────

  private async resolveRestaurant(ownerId: string): Promise<{ id: string }> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { ownerId },
      select: { id: true },
    });
    if (!restaurant) throw new NotFoundException('No restaurant linked to this account');
    return restaurant;
  }

  private async findOrder(orderId: string, restaurantId: string): Promise<OrderWithItems> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, restaurantId },
      include: ORDER_WITH_ITEMS,
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  private assertTransition(order: Order, action: string): void {
    const allowed = TRANSITIONS[action] ?? [];
    if (!allowed.includes(order.status)) {
      throw new ConflictException(
        `Cannot ${action} order with status ${order.status}. Expected: ${allowed.join(' or ')}.`,
      );
    }
  }

  // ── Restaurant-owner reads ────────────────────────────────────────────────

  async listOwnerOrders(
    ownerId: string,
    query: ListOwnerOrdersQueryDto,
  ): Promise<ListResult<OrderWithItems>> {
    const restaurant = await this.resolveRestaurant(ownerId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.OrderWhereInput = {
      restaurantId: restaurant.id,
      ...(query.status !== undefined && { status: query.status }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: ORDER_WITH_ITEMS,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { placedAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return new ListResult(items, total, page, pageSize);
  }

  async getOwnerOrder(ownerId: string, orderId: string): Promise<OrderWithItems> {
    const restaurant = await this.resolveRestaurant(ownerId);
    return this.findOrder(orderId, restaurant.id);
  }

  // ── Lifecycle transitions ─────────────────────────────────────────────────

  async acceptOrder(ownerId: string, orderId: string, actorId: string): Promise<OrderWithItems> {
    const restaurant = await this.resolveRestaurant(ownerId);
    const order = await this.findOrder(orderId, restaurant.id);
    this.assertTransition(order, 'accept');

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.ACCEPTED, acceptedAt: new Date() },
      include: ORDER_WITH_ITEMS,
    });

    await this.auditLog.log({
      actorId,
      action: 'ORDER_ACCEPT',
      entityType: 'Order',
      entityId: orderId,
      before: { status: order.status },
      after: { status: updated.status, acceptedAt: updated.acceptedAt },
    });

    this.gateway.emitToRestaurant(restaurant.id, 'order:updated', updated);
    return updated;
  }

  async rejectOrder(
    ownerId: string,
    orderId: string,
    reason: string,
    actorId: string,
  ): Promise<OrderWithItems> {
    const restaurant = await this.resolveRestaurant(ownerId);
    const order = await this.findOrder(orderId, restaurant.id);
    this.assertTransition(order, 'reject');

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.REJECTED, rejectionReason: reason },
      include: ORDER_WITH_ITEMS,
    });

    await this.auditLog.log({
      actorId,
      action: 'ORDER_REJECT',
      entityType: 'Order',
      entityId: orderId,
      before: { status: order.status },
      after: { status: updated.status, rejectionReason: reason },
    });

    this.gateway.emitToRestaurant(restaurant.id, 'order:updated', updated);
    return updated;
  }

  async startPreparing(ownerId: string, orderId: string, actorId: string): Promise<OrderWithItems> {
    const restaurant = await this.resolveRestaurant(ownerId);
    const order = await this.findOrder(orderId, restaurant.id);
    this.assertTransition(order, 'start-preparing');

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.PREPARING, preparedAt: new Date() },
      include: ORDER_WITH_ITEMS,
    });

    await this.auditLog.log({
      actorId,
      action: 'ORDER_START_PREPARING',
      entityType: 'Order',
      entityId: orderId,
      before: { status: order.status },
      after: { status: updated.status, preparedAt: updated.preparedAt },
    });

    this.gateway.emitToRestaurant(restaurant.id, 'order:updated', updated);
    return updated;
  }

  async markReady(ownerId: string, orderId: string, actorId: string): Promise<OrderWithItems> {
    const restaurant = await this.resolveRestaurant(ownerId);
    const order = await this.findOrder(orderId, restaurant.id);
    this.assertTransition(order, 'ready');

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.READY, readyAt: new Date() },
      include: ORDER_WITH_ITEMS,
    });

    await this.auditLog.log({
      actorId,
      action: 'ORDER_READY',
      entityType: 'Order',
      entityId: orderId,
      before: { status: order.status },
      after: { status: updated.status, readyAt: updated.readyAt },
    });

    this.gateway.emitToRestaurant(restaurant.id, 'order:updated', updated);
    return updated;
  }

  async markDelivered(ownerId: string, orderId: string, actorId: string): Promise<OrderWithItems> {
    const restaurant = await this.resolveRestaurant(ownerId);
    const order = await this.findOrder(orderId, restaurant.id);
    this.assertTransition(order, 'delivered');

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.DELIVERED, deliveredAt: new Date() },
      include: ORDER_WITH_ITEMS,
    });

    await this.auditLog.log({
      actorId,
      action: 'ORDER_DELIVERED',
      entityType: 'Order',
      entityId: orderId,
      before: { status: order.status },
      after: { status: updated.status, deliveredAt: updated.deliveredAt },
    });

    this.gateway.emitToRestaurant(restaurant.id, 'order:updated', updated);
    return updated;
  }

  // ── Admin reads ───────────────────────────────────────────────────────────

  async listAdminOrders(query: ListAdminOrdersQueryDto): Promise<ListResult<OrderWithItems>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.OrderWhereInput = {
      ...(query.status !== undefined && { status: query.status }),
      ...(query.restaurantId !== undefined && { restaurantId: query.restaurantId }),
      ...(query.placedAfter !== undefined || query.placedBefore !== undefined
        ? {
            placedAt: {
              ...(query.placedAfter !== undefined && { gte: new Date(query.placedAfter) }),
              ...(query.placedBefore !== undefined && { lte: new Date(query.placedBefore) }),
            },
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: ORDER_WITH_ITEMS,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { placedAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return new ListResult(items, total, page, pageSize);
  }

  async getAdminOrder(orderId: string): Promise<OrderWithItems> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: ORDER_WITH_ITEMS,
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }
}

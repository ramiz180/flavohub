import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllCustomerOrders(page = 1, pageSize = 50) {
    const skip = (page - 1) * pageSize;
    const [total, orders] = await Promise.all([
      this.prisma.customerOrder.count(),
      this.prisma.customerOrder.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          restaurant: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true, phone: true } },
          deliveries: true,
        },
      }),
    ]);

    return { total, page, pageSize, orders };
  }

  async getPlatformStats() {
    // 1. Gather all customer orders for overall counts
    const allOrders = await this.prisma.customerOrder.findMany({
      select: { status: true, paymentMethod: true },
    });

    let totalOrders = 0;
    let activeOrders = 0;
    let pendingOrders = 0;
    let cancelledOrders = 0;
    let deliveredOrders = 0;
    let codOrderCount = 0;
    let onlineOrderCount = 0;

    for (const o of allOrders) {
      totalOrders++;
      if (o.status === 'PLACED') pendingOrders++;
      else if (['ACCEPTED', 'PREPARING', 'READY', 'RIDER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(o.status)) activeOrders++;
      else if (o.status === 'DELIVERED') deliveredOrders++;
      else if (['CANCELLED', 'REJECTED'].includes(o.status)) cancelledOrders++;

      if (o.paymentMethod === 'COD') codOrderCount++;
      else onlineOrderCount++;
    }

    // 2. Gather completed/active orders for financial stats
    const financialOrders = await this.prisma.customerOrder.findMany({
      where: { status: { in: ['DELIVERED', 'ACCEPTED', 'READY', 'PICKED_UP'] } },
      select: {
        totalAmount: true,
        platformFee: true,
        taxAmount: true,
        deliveryCharges: true,
        netEarnings: true,
        paymentMethod: true,
      }
    });

    let totalRevenue = 0;
    let totalPlatformFees = 0;
    let totalTaxes = 0;
    let deliveryChargesTotal = 0;
    let restaurantEarnings = 0;
    let codAmount = 0;
    let onlineAmount = 0;

    for (const o of financialOrders) {
      const amount = parseFloat(o.totalAmount.toString());
      totalRevenue += amount;
      totalPlatformFees += parseFloat(o.platformFee.toString());
      totalTaxes += parseFloat(o.taxAmount.toString());
      deliveryChargesTotal += parseFloat(o.deliveryCharges.toString());
      restaurantEarnings += parseFloat(o.netEarnings.toString());

      if (o.paymentMethod === 'COD') {
        codAmount += amount;
      } else {
        onlineAmount += amount;
      }
    }

    return {
      totalOrders,
      activeOrders,
      pendingOrders,
      cancelledOrders,
      deliveredOrders,
      codOrderCount,
      onlineOrderCount,
      totalRevenue,
      totalPlatformFees,
      totalTaxes,
      deliveryChargesTotal,
      restaurantEarnings,
      codAmount,
      onlineAmount,
    };
  }

  async getPaymentSummary() {
    const stats = await this.getPlatformStats();
    
    // Stub for today's revenue (could be queried specifically if needed, but we'll use a fraction of total for now or query it properly)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const todayOrders = await this.prisma.customerOrder.findMany({
       where: { 
         createdAt: { gte: todayStart },
         status: { in: ['DELIVERED', 'ACCEPTED', 'READY', 'PICKED_UP'] } 
       },
       select: { totalAmount: true }
    });
    
    const todayRevenue = todayOrders.reduce((sum, order) => sum + parseFloat(order.totalAmount.toString()), 0);

    return {
      totalRevenue: stats.totalRevenue,
      todayRevenue: todayRevenue,
      codRevenue: stats.codAmount,
      onlineRevenue: stats.onlineAmount,
      platformEarnings: stats.totalPlatformFees,
      restaurantEarnings: stats.restaurantEarnings,
      deliveryCharges: stats.deliveryChargesTotal,
      taxCollection: stats.totalTaxes,
      refunds: 0, // Placeholder
      walletTransactions: 0, // Placeholder
    };
  }
}

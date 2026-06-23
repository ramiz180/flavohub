import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@flavohub/shared';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { DeliveryService } from './delivery.service';
import { PrismaService } from '../prisma/prisma.service';
import { AdminService } from '../admin/admin.service';

@ApiTags('admin-deliveries')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/deliveries')
export class AdminDeliveryController {
  constructor(
    private readonly deliveryService: DeliveryService,
    private readonly prisma: PrismaService,
    private readonly adminService: AdminService,
  ) {}

  @Get()
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all deliveries with pagination and filtering' })
  async listDeliveries(
    @Query('page') pageStr?: string,
    @Query('pageSize') pageSizeStr?: string,
    @Query('status') status?: string,
    @Query('partner') partner?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const pageSize = pageSizeStr ? parseInt(pageSizeStr, 10) : 20;

    const where: any = {};
    if (status) where.status = status;
    if (partner) where.partner = partner;

    const [total, deliveries] = await Promise.all([
      this.prisma.delivery.count({ where }),
      this.prisma.delivery.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          customerOrder: {
            include: {
              restaurant: { select: { id: true, name: true } },
              customer: { select: { id: true, name: true, phone: true } },
            },
          },
        },
      }),
    ]);

    return { total, page, pageSize, deliveries };
  }

  @Get('analytics')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get delivery analytics' })
  async getAnalytics() {
    // Also gets overall platform stats via AdminService for the dashboard
    const stats = await this.adminService.getPlatformStats();

    const partnerDistribution = await this.prisma.delivery.groupBy({
      by: ['partner'],
      _count: { _all: true },
    });

    return {
      totalDeliveries: stats.totalOrders,
      activeDeliveries: stats.activeOrders,
      failedDeliveries: stats.cancelledOrders,
      delivered: stats.deliveredOrders,
      pendingOrders: stats.pendingOrders,
      cancelledOrders: stats.cancelledOrders,
      codOrders: stats.codOrderCount,
      onlineOrders: stats.onlineOrderCount,
      totalRevenue: stats.totalRevenue,
      totalDeliveryCharges: stats.deliveryChargesTotal,
      platformCommission: stats.totalPlatformFees,
      partnerDistribution: partnerDistribution.map(p => ({
        partner: p.partner,
        count: p._count._all,
      }))
    };
  }

  @Get(':id/tracking')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get full tracking history for a delivery' })
  async getTracking(@Param('id') id: string) {
    return this.prisma.deliveryTracking.findMany({
      where: { deliveryId: id },
      orderBy: { timestamp: 'desc' },
    });
  }

  @Post(':id/cancel')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Cancel a delivery via provider' })
  async cancelDelivery(@Param('id') id: string) {
    await this.deliveryService.cancelDelivery(id);
    return { success: true };
  }
}

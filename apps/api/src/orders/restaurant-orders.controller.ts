import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@flavohub/shared';
import type { JwtUser } from '../auth/interfaces/jwt-user.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ListOwnerOrdersQueryDto } from './dto/list-owner-orders-query.dto';
import { RejectOrderDto } from './dto/reject-order.dto';
import { OrdersService } from './orders.service';

@ApiTags('restaurant-orders')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.RESTAURANT_OWNER)
@Controller('restaurant/orders')
export class RestaurantOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  @ApiOperation({ summary: "List orders for the caller's restaurant" })
  @ApiOkResponse({ description: 'Paginated order list' })
  list(@CurrentUser() user: JwtUser, @Query() query: ListOwnerOrdersQueryDto) {
    return this.orders.listOwnerOrders(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single order with items' })
  detail(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.orders.getOwnerOrder(user.id, id);
  }

  @Post(':id/accept')
  @ApiOperation({ summary: 'Accept a PLACED order' })
  accept(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.orders.acceptOrder(user.id, id, user.id);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a PLACED order' })
  reject(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() dto: RejectOrderDto) {
    return this.orders.rejectOrder(user.id, id, dto.reason, user.id);
  }

  @Post(':id/start-preparing')
  @ApiOperation({ summary: 'Move an ACCEPTED order to PREPARING' })
  startPreparing(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.orders.startPreparing(user.id, id, user.id);
  }

  @Post(':id/ready')
  @ApiOperation({ summary: 'Mark a PREPARING order as READY' })
  ready(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.orders.markReady(user.id, id, user.id);
  }

  @Post(':id/delivered')
  @ApiOperation({ summary: 'Mark a READY or OUT_FOR_DELIVERY order as DELIVERED' })
  delivered(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.orders.markDelivered(user.id, id, user.id);
  }
}

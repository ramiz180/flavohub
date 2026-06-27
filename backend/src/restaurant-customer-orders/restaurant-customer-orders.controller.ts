import { Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@flavohub/shared';
import type { JwtUser } from '../auth/interfaces/jwt-user.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ListCustomerOrdersQueryDto } from './dto/list-customer-orders-query.dto';
import { RestaurantCustomerOrdersService } from './restaurant-customer-orders.service';

@ApiTags('restaurant - customer orders')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.RESTAURANT_OWNER)
@Controller('restaurant/customer-orders')
export class RestaurantCustomerOrdersController {
  constructor(private readonly service: RestaurantCustomerOrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List customer orders for this restaurant with optional status filter' })
  listOrders(@CurrentUser() user: JwtUser, @Query() query: ListCustomerOrdersQueryDto) {
    return this.service.listOrders(user.id, query);
  }

  @Get(':id/delivery')
  @ApiOperation({ summary: 'Get delivery info for a specific customer order' })
  getDelivery(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.service.getDelivery(user.id, id);
  }

  @Patch(':id/accept')
  @ApiOperation({ summary: 'Accept a PLACED customer order' })
  accept(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.service.accept(user.id, id);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject a PLACED customer order' })
  reject(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.service.reject(user.id, id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a PLACED or ACCEPTED customer order and cancel Shadowfax delivery' })
  cancel(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.service.cancel(user.id, id);
  }

  @Patch(':id/preparing')
  @ApiOperation({ summary: 'Mark an ACCEPTED customer order as PREPARING' })
  preparing(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.service.preparing(user.id, id);
  }

  @Patch(':id/ready')
  @ApiOperation({ summary: 'Mark a PREPARING customer order as READY — automatically creates Shadowfax shipment' })
  ready(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.service.ready(user.id, id);
  }

  @Patch(':id/delivered')
  @ApiOperation({ summary: 'Mark a READY or OUT_FOR_DELIVERY customer order as DELIVERED' })
  delivered(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.service.delivered(user.id, id);
  }
}

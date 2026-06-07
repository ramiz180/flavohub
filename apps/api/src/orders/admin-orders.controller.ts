import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@flavohub/shared';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ListAdminOrdersQueryDto } from './dto/list-admin-orders-query.dto';
import { OrdersService } from './orders.service';

@ApiTags('admin')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List all orders with optional filters' })
  @ApiOkResponse({ description: 'Paginated order list' })
  list(@Query() query: ListAdminOrdersQueryDto) {
    return this.orders.listAdminOrders(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single order with items' })
  detail(@Param('id') id: string) {
    return this.orders.getAdminOrder(id);
  }
}

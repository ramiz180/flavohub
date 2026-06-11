import { Controller, Get, Post, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { CustomerOrderService } from './customer-order.service';
import { CheckoutDto } from './dto/checkout.dto';
import { CustomerJwtAuthGuard } from '../customer-auth/guards/customer-jwt-auth.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('customer-orders')
@ApiBearerAuth()
@UseGuards(CustomerJwtAuthGuard)
@Controller('customer/orders')
export class CustomerOrderController {
  constructor(private readonly service: CustomerOrderService) {}

  @Post('checkout')
  @ApiOperation({ summary: 'Place order from cart' })
  checkout(@Request() req: { user: { customerId: string } }, @Body() dto: CheckoutDto) {
    return this.service.checkout(req.user.customerId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get order history' })
  getOrders(@Request() req: { user: { customerId: string } }) {
    return this.service.getOrders(req.user.customerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order detail' })
  getOrderById(@Request() req: { user: { customerId: string } }, @Param('id') id: string) {
    return this.service.getOrderById(req.user.customerId, id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a PLACED order' })
  cancelOrder(@Request() req: { user: { customerId: string } }, @Param('id') id: string) {
    return this.service.cancelOrder(req.user.customerId, id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update customer order status (restaurant use)' })
  @UseGuards(JwtAuthGuard)
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
    @Request() req: { user: { id: string } },
  ) {
    return this.service.updateOrderStatus(id, body.status, req.user.id);
  }
}

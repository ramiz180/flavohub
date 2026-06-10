import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { CustomerOrderService } from './customer-order.service';
import { CheckoutDto } from './dto/checkout.dto';
import { CustomerJwtAuthGuard } from '../customer-auth/guards/customer-jwt-auth.guard';

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
}

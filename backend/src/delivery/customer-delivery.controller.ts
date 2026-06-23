import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('customer/deliveries')
@UseGuards(JwtAuthGuard)
export class CustomerDeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Get(':orderId')
  async getDeliveryStatus(@Param('orderId') orderId: string, @Req() req: any) {
    // Ideally ensure the order belongs to req.user.id
    return this.deliveryService.getDeliveryStatus(orderId);
  }
}

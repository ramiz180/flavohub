import {
  Controller,
  Post,
  Body,
  Headers,
  Req,
  UseGuards,
  Request,
  RawBodyRequest,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CustomerPaymentService } from './customer-payment.service';
import { CreatePaymentOrderDto } from './dto/create-payment-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { CustomerJwtAuthGuard } from '../customer-auth/guards/customer-jwt-auth.guard';

@ApiTags('customer-payments')
@Controller('customer/payments')
export class CustomerPaymentController {
  constructor(private readonly service: CustomerPaymentService) {}

  @Post('create-order')
  @UseGuards(CustomerJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Razorpay order for a customer order' })
  createOrder(@Request() req: { user: { sub: string } }, @Body() dto: CreatePaymentOrderDto) {
    return this.service.createOrder(req.user.sub, dto);
  }

  @Post('verify')
  @UseGuards(CustomerJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify Razorpay payment signature' })
  verifyPayment(@Body() dto: VerifyPaymentDto) {
    return this.service.verifyPayment(dto);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Razorpay webhook handler' })
  handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    return this.service.handleWebhook(req.rawBody!, signature);
  }
}

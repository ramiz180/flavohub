import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentOrderDto } from './dto/create-payment-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import * as crypto from 'crypto';
import Razorpay from 'razorpay';

@Injectable()
export class CustomerPaymentService {
  private readonly razorpay: Razorpay;
  private readonly logger = new Logger(CustomerPaymentService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.razorpay = new Razorpay({
      key_id: this.config.get<string>('RAZORPAY_KEY_ID')!,
      key_secret: this.config.get<string>('RAZORPAY_KEY_SECRET')!,
    });
  }

  async createOrder(customerId: string, dto: CreatePaymentOrderDto) {
    const order = await this.prisma.customerOrder.findFirst({
      where: { id: dto.orderId, customerId },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'PLACED') {
      throw new BadRequestException('Order is not in PLACED status');
    }

    const amountInPaise = Math.round(parseFloat(order.totalAmount.toString()) * 100);

    const razorpayOrder = await this.razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: order.id,
      notes: {
        orderId: order.id,
        customerId,
      },
    });

    return {
      razorpayOrderId: razorpayOrder.id,
      amount: amountInPaise,
      currency: 'INR',
      keyId: this.config.get<string>('RAZORPAY_KEY_ID'),
      orderId: order.id,
    };
  }

  async verifyPayment(dto: VerifyPaymentDto) {
    const body = dto.razorpayOrderId + '|' + dto.razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', this.config.get<string>('RAZORPAY_KEY_SECRET')!)
      .update(body)
      .digest('hex');

    if (expectedSignature !== dto.razorpaySignature) {
      throw new BadRequestException('Invalid payment signature');
    }

    const order = await this.prisma.customerOrder.update({
      where: { id: dto.orderId },
      data: {
        status: 'ACCEPTED',
        paymentStatus: 'PAID',
        note: `PAID:${dto.razorpayPaymentId}`,
      },
      include: {
        restaurant: { select: { id: true, name: true } },
        items: true,
      },
    });

    this.logger.log(`Payment verified for order ${dto.orderId}: ${dto.razorpayPaymentId}`);

    return {
      success: true,
      orderId: order.id,
      paymentId: dto.razorpayPaymentId,
      status: order.status,
    };
  }

  async handleWebhook(payload: Buffer, signature: string) {
    const webhookSecret = this.config.get<string>('RAZORPAY_WEBHOOK_SECRET')!;
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    if (expectedSignature !== signature) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = JSON.parse(payload.toString()) as {
      event: string;
      payload: {
        payment: {
          entity: {
            id: string;
            order_id: string;
            notes: { orderId?: string };
          };
        };
      };
    };

    this.logger.log(`Razorpay webhook: ${event.event}`);

    if (event.event === 'payment.captured') {
      const orderId = event.payload.payment.entity.notes?.orderId;
      const paymentId = event.payload.payment.entity.id;

      if (orderId) {
        const order = await this.prisma.customerOrder.findUnique({
          where: { id: orderId },
        });
        if (order && order.status === 'PLACED') {
          await this.prisma.customerOrder.update({
            where: { id: orderId },
            data: {
              status: 'ACCEPTED',
              paymentStatus: 'PAID',
              note: `PAID:${paymentId}`,
            },
          });
          this.logger.log(`Webhook: order ${orderId} marked ACCEPTED`);
        }
      }
    }

    return { received: true };
  }
}

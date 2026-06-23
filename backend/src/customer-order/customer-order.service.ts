import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RestaurantGateway } from '../restaurant-gateway/restaurant.gateway';
import { CheckoutDto } from './dto/checkout.dto';
import { LocationService } from '../location/location.service';

@Injectable()
export class CustomerOrderService {
  constructor(
    private prisma: PrismaService,
    private gateway: RestaurantGateway,
    private locationService: LocationService,
  ) {}

  async checkout(customerId: string, dto: CheckoutDto) {
    if (customerId !== dto.customerId) {
      throw new BadRequestException('Customer ID mismatch');
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Order must contain items');
    }

    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: dto.restaurantId },
    });
    if (!restaurant || !restaurant.isActive) {
      throw new BadRequestException('Restaurant is not available or does not exist');
    }

    const address = await this.prisma.customerAddress.findFirst({
      where: { id: dto.addressId, customerId },
    });
    if (!address) {
      throw new BadRequestException('Invalid delivery address or address not found');
    }

    // Geocode fallback check
    if (process.env['GOOGLE_GEOCODING_API_KEY'] || process.env['GOOGLE_MAPS_API_KEY']) {
      const customerLoc = await this.locationService.geocode(address.addressLine);
      if (!customerLoc) {
        throw new BadRequestException('Invalid delivery address. Could not locate coordinates.');
      }

      if (restaurant.latitude && restaurant.longitude) {
        const distance = await this.locationService.getDistanceAndDuration(
          restaurant.latitude,
          restaurant.longitude,
          customerLoc.lat,
          customerLoc.lng
        );

        if (distance && distance.distanceMeters > 10000) {
          throw new BadRequestException('Delivery address is too far from this restaurant (max 10km).');
        }
      }
    }

    // Validate Items and Calculate Subtotal
    let calculatedSubtotal = 0;
    const validatedItems: any[] = [];
    for (const item of dto.items) {
      const menuItem = await this.prisma.menuItem.findFirst({
        where: { id: item.menuItemId, restaurantId: dto.restaurantId },
      });
      if (!menuItem || !menuItem.isAvailable) {
        throw new BadRequestException(`Menu item ${item.menuItemId} is not available`);
      }
      calculatedSubtotal += parseFloat(menuItem.price.toString()) * item.quantity;
      validatedItems.push({
        menuItemId: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: item.quantity,
      });
    }

    if (Math.abs(calculatedSubtotal - dto.subtotal) > 1) {
      throw new BadRequestException('Subtotal mismatch. Please refresh your cart.');
    }

    const platformPricing = await this.prisma.platformPricing.findUnique({ where: { id: 'default' } });
    const deliveryCharges = platformPricing?.baseDeliveryFee ? parseFloat(platformPricing.baseDeliveryFee.toString()) : 40;
    
    // Platform fee calculation
    let platformFee = 0;
    if (restaurant.markupType === 'PERCENT' && restaurant.markupValue) {
      platformFee = (calculatedSubtotal * parseFloat(restaurant.markupValue.toString())) / 100;
    } else if (restaurant.markupType === 'FLAT' && restaurant.markupValue) {
      platformFee = parseFloat(restaurant.markupValue.toString());
    } else if (platformPricing?.globalMarkupType === 'PERCENT') {
      platformFee = (calculatedSubtotal * parseFloat(platformPricing.globalMarkupValue.toString())) / 100;
    } else if (platformPricing?.globalMarkupType === 'FLAT') {
      platformFee = parseFloat(platformPricing.globalMarkupValue.toString());
    } else {
      platformFee = (calculatedSubtotal * 10) / 100; // 10% default
    }

    const taxAmount = (calculatedSubtotal * 5) / 100; // 5% GST
    const totalAmount = calculatedSubtotal + taxAmount + deliveryCharges;
    const netEarnings = calculatedSubtotal - platformFee;

    if (Math.abs(totalAmount - dto.total) > 1) {
      throw new BadRequestException('Total mismatch. Please refresh your cart.');
    }

    const paymentMethod = dto.paymentMethod || PaymentMethod.ONLINE;

    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.customerOrder.create({
        data: {
          customerId,
          restaurantId: dto.restaurantId,
          totalAmount,
          deliveryAddress: address.addressLine,
          note: dto.note,
          paymentMethod,
          paymentStatus: paymentMethod === PaymentMethod.COD ? PaymentStatus.PENDING : PaymentStatus.PENDING,
          deliveryCharges,
          platformFee,
          taxAmount,
          netEarnings,
          items: {
            create: validatedItems,
          },
        },
        include: { items: true },
      });
      // Clear cart
      await tx.cart.update({
        where: { customerId },
        data: { items: { deleteMany: {} } }
      }).catch(() => null);
      return newOrder;
    });

    this.gateway.emitToRestaurant(dto.restaurantId, 'customer-order:new', {
      orderId: order.id,
      status: order.status,
      createdAt: order.createdAt,
      itemCount: order.items.length,
      totalAmount: order.totalAmount,
    });

    return order;
  }

  async getOrders(customerId: string) {
    return this.prisma.customerOrder.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: {
        restaurant: {
          select: { id: true, name: true, cuisineType: true },
        },
        items: true,
      },
    });
  }

  async getOrderById(customerId: string, orderId: string) {
    const order = await this.prisma.customerOrder.findFirst({
      where: { id: orderId, customerId },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            cuisineType: true,
            addressLine: true,
          },
        },
        items: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async cancelOrder(customerId: string, orderId: string) {
    const order = await this.prisma.customerOrder.findFirst({
      where: { id: orderId, customerId },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'PLACED') {
      throw new BadRequestException('Order can only be cancelled when status is PLACED');
    }
    return this.prisma.customerOrder.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
      include: {
        restaurant: { select: { id: true, name: true } },
        items: true,
      },
    });
  }

  async updateOrderStatus(orderId: string, status: string, _ownerId: string) {
    const order = await this.prisma.customerOrder.findFirst({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');

    const updated = await this.prisma.customerOrder.update({
      where: { id: orderId },
      data: { status: status as OrderStatus },
      include: { items: true, restaurant: { select: { id: true, name: true } } },
    });

    this.gateway.emitToRestaurant(order.restaurantId, 'order:status_updated', {
      orderId,
      status,
      updatedAt: updated.updatedAt,
    });

    this.gateway.emitToCustomer(updated.customerId, 'order:status_updated', {
      orderId,
      status,
      restaurantName: updated.restaurant.name,
      updatedAt: updated.updatedAt,
    });

    return updated;
  }
}

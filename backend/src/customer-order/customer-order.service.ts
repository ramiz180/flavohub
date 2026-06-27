import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RestaurantGateway } from '../restaurant-gateway/restaurant.gateway';
import { CheckoutDto } from './dto/checkout.dto';
import { LocationService } from '../location/location.service';

@Injectable()
export class CustomerOrderService {
  private readonly logger = new Logger(CustomerOrderService.name);

  constructor(
    private prisma: PrismaService,
    private gateway: RestaurantGateway,
    private locationService: LocationService,
  ) {}

  async checkout(customerId: string, dto: CheckoutDto) {
    // ── 1. Basic sanity ──────────────────────────────────────────────────────
    if (customerId !== dto.customerId) {
      throw new BadRequestException('Customer ID mismatch');
    }
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    // ── 2. Customer exists ───────────────────────────────────────────────────
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      throw new BadRequestException('Customer not found');
    }

    // ── 3. Restaurant validations ────────────────────────────────────────────
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: dto.restaurantId },
    });
    if (!restaurant) {
      throw new BadRequestException('Restaurant does not exist');
    }
    if (restaurant.status !== 'APPROVED') {
      throw new BadRequestException(`Restaurant is not approved (status: ${restaurant.status})`);
    }
    if (!restaurant.isActive) {
      throw new BadRequestException('Restaurant is currently not active');
    }

    this.logger.log(`[CHECKOUT] Restaurant: ${restaurant.name} | lat=${restaurant.latitude} lng=${restaurant.longitude}`);

    // ── 4. Address validation ────────────────────────────────────────────────
    const address = await this.prisma.customerAddress.findFirst({
      where: { id: dto.addressId, customerId },
    });
    if (!address) {
      throw new BadRequestException('Delivery address not found or does not belong to this customer');
    }

    this.logger.log(`[CHECKOUT] Customer Address: ${JSON.stringify({
      id: address.id,
      addressLine: address.addressLine,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      lat: address.lat,
      lng: address.lng,
    })}`);

    // ── 4a. Resolve lat/lng for delivery address ─────────────────────────────
    let customerLat: number | null = address.lat ?? null;
    let customerLng: number | null = address.lng ?? null;

    this.logger.log(`[CHECKOUT] Stored coordinates: lat=${customerLat} lng=${customerLng}`);

    // If coordinates are missing, try geocoding
    if (customerLat === null || customerLng === null) {
      this.logger.warn(`[CHECKOUT] Address has no stored coordinates – attempting geocode for: "${address.addressLine}, ${address.city}, ${address.state} ${address.pincode}"`);

      const fullAddress = `${address.addressLine}, ${address.city}, ${address.state} ${address.pincode}`;
      const geocoded = await this.locationService.geocode(fullAddress);

      this.logger.log(`[CHECKOUT] Geocode result: ${JSON.stringify(geocoded)}`);

      if (!geocoded) {
        throw new BadRequestException(
          'Invalid delivery address. Could not locate coordinates. ' +
          'Please update your address with a precise location or enable location access.'
        );
      }

      customerLat = geocoded.lat;
      customerLng = geocoded.lng;

      // Persist resolved coordinates back to the address record
      try {
        await this.prisma.customerAddress.update({
          where: { id: address.id },
          data: { lat: customerLat, lng: customerLng },
        });
        this.logger.log(`[CHECKOUT] Persisted geocoded coordinates to address ${address.id}`);
      } catch (e) {
        this.logger.warn(`[CHECKOUT] Failed to persist geocoded coordinates: ${String(e)}`);
      }
    }

    this.logger.log(`[CHECKOUT] Final customer coordinates: lat=${customerLat} lng=${customerLng}`);

    // ── 4b. Delivery radius check ────────────────────────────────────────────
    if (restaurant.latitude && restaurant.longitude) {
      this.logger.log(`[CHECKOUT] Restaurant coordinates: lat=${restaurant.latitude} lng=${restaurant.longitude}`);

      const distanceResult = await this.locationService.getDistanceAndDuration(
        Number(restaurant.latitude),
        Number(restaurant.longitude),
        customerLat,
        customerLng,
      );

      if (distanceResult) {
        const distKm = (distanceResult.distanceMeters / 1000).toFixed(2);
        this.logger.log(`[CHECKOUT] Calculated distance: ${distKm} km | duration: ${distanceResult.durationSeconds}s`);

        if (distanceResult.distanceMeters > 15000) {
          throw new BadRequestException(
            `Delivery address is too far from this restaurant (${distKm} km). Maximum delivery radius is 15 km.`
          );
        }
      } else {
        this.logger.warn('[CHECKOUT] Could not calculate distance (Distance Matrix API not available) – skipping radius check');
      }
    }

    // ── 5. Validate menu items & calculate subtotal (server-side, ignore frontend values) ──
    let calculatedSubtotal = 0;
    const validatedItems: {
      menuItemId: string;
      name: string;
      price: any;
      quantity: number;
    }[] = [];

    for (const item of dto.items) {
      const menuItem = await this.prisma.menuItem.findFirst({
        where: { id: item.menuItemId, restaurantId: dto.restaurantId },
      });
      if (!menuItem) {
        throw new BadRequestException(
          `Menu item "${item.menuItemId}" does not belong to this restaurant or does not exist`
        );
      }
      if (!menuItem.isAvailable) {
        throw new BadRequestException(`Menu item "${menuItem.name}" is currently unavailable`);
      }

      const itemPrice = parseFloat(menuItem.price.toString());
      calculatedSubtotal += itemPrice * item.quantity;
      validatedItems.push({
        menuItemId: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: item.quantity,
      });

      this.logger.debug(`[CHECKOUT] Item: ${menuItem.name} x${item.quantity} @ ₹${itemPrice}`);
    }

    this.logger.log(`[CHECKOUT] Server-calculated Subtotal: ₹${calculatedSubtotal.toFixed(2)}`);

    // ── 6. Server-side fee calculations ────────────────────────────────────
    const platformPricing = await this.prisma.platformPricing.findUnique({ where: { id: 'default' } });
    const deliveryFee = platformPricing?.baseDeliveryFee
      ? parseFloat(platformPricing.baseDeliveryFee.toString())
      : 40;

    // Platform fee (restaurant override → global → default 10%)
    let platformFee = 0;
    if (restaurant.markupType === 'PERCENT' && restaurant.markupValue) {
      platformFee = (calculatedSubtotal * parseFloat(restaurant.markupValue.toString())) / 100;
    } else if (restaurant.markupType === 'FLAT' && restaurant.markupValue) {
      platformFee = parseFloat(restaurant.markupValue.toString());
    } else if (platformPricing?.globalMarkupType === 'PERCENT' && platformPricing.globalMarkupValue) {
      platformFee = (calculatedSubtotal * parseFloat(platformPricing.globalMarkupValue.toString())) / 100;
    } else if (platformPricing?.globalMarkupType === 'FLAT' && platformPricing.globalMarkupValue) {
      platformFee = parseFloat(platformPricing.globalMarkupValue.toString());
    } else {
      platformFee = (calculatedSubtotal * 10) / 100; // 10% default
    }

    const taxAmount = (calculatedSubtotal * 5) / 100; // 5% GST
    const totalAmount = calculatedSubtotal + taxAmount + deliveryFee + platformFee;
    const netEarnings = calculatedSubtotal - platformFee;

    this.logger.log(
      `[CHECKOUT] Fee breakdown | subtotal=₹${calculatedSubtotal.toFixed(2)} | tax=₹${taxAmount.toFixed(2)} | delivery=₹${deliveryFee.toFixed(2)} | platformFee=₹${platformFee.toFixed(2)} | TOTAL=₹${totalAmount.toFixed(2)}`
    );

    // ── 7. Frontend total cross-check (informational – never reject) ─────────
    if (dto.total !== undefined) {
      const diff = Math.abs(totalAmount - dto.total);
      if (diff > 2) {
        this.logger.warn(
          `[CHECKOUT] Frontend total (₹${dto.total}) differs from server total (₹${totalAmount.toFixed(2)}) by ₹${diff.toFixed(2)} – using server total`
        );
      }
    }

    const paymentMethod = dto.paymentMethod ?? PaymentMethod.ONLINE;

    // ── 8. Create order in transaction ──────────────────────────────────────
    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.customerOrder.create({
        data: {
          customerId,
          restaurantId: dto.restaurantId,
          totalAmount,
          deliveryAddress: address.addressLine,
          note: dto.note,
          paymentMethod,
          paymentStatus: PaymentStatus.PENDING,
          deliveryCharges: deliveryFee,
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
      await tx.cart
        .update({
          where: { customerId },
          data: { items: { deleteMany: {} } },
        })
        .catch(() => null);

      return newOrder;
    });

    this.logger.log(`[CHECKOUT] Order created: ${order.id} | total=₹${totalAmount.toFixed(2)}`);

    // Notify restaurant via WebSocket
    this.gateway.emitToRestaurant(dto.restaurantId, 'customer-order:new', {
      orderId: order.id,
      status: order.status,
      createdAt: order.createdAt,
      itemCount: order.items.length,
      totalAmount: order.totalAmount,
    });

    return {
      ...order,
      // Return server-calculated breakdown so the app can show correct totals
      breakdown: {
        subtotal: calculatedSubtotal,
        tax: taxAmount,
        deliveryFee,
        platformFee,
        total: totalAmount,
      },
    };
  }

  async getOrders(customerId: string) {
    return this.prisma.customerOrder.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: {
        restaurant: {
          select: { id: true, name: true, cuisineType: true, logoUrl: true },
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
            logoUrl: true,
            phone: true,
            latitude: true,
            longitude: true,
          },
        },
        items: true,
        deliveries: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            trackingUpdates: {
              orderBy: { timestamp: 'desc' },
              take: 1,
            },
          },
        },
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
      throw new BadRequestException('Order can only be cancelled when its status is PLACED');
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
    const order = await this.prisma.customerOrder.findFirst({ where: { id: orderId } });
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

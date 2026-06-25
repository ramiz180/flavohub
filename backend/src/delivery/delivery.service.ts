import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DeliveryPartner, DeliveryStatus, OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RestaurantGateway } from '../restaurant-gateway/restaurant.gateway';
import { DeliveryProviderRegistry } from './delivery-provider.registry';
import { DeliveryEventNormalizer } from './delivery-event.normalizer';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { GPS_POLL_QUEUE_NAME } from './queues/gps-poll.processor';
import { GpsPollJobData } from './queues/gps-poll.types';
import { CreateShipmentDto } from './providers/delivery-provider.interface';
import { AppConfigService } from '../config/app-config.service';
import { DeliveryStatusDto } from './dto/delivery-status.dto';

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: RestaurantGateway,
    private readonly registry: DeliveryProviderRegistry,
    private readonly normalizer: DeliveryEventNormalizer,
    private readonly config: AppConfigService,
    @InjectQueue(GPS_POLL_QUEUE_NAME) private readonly gpsPollQueue: Queue<GpsPollJobData>,
  ) {}

  async assignDelivery(orderId: string) {
    this.logger.log(`Assigning delivery for order ${orderId}`);

    const order = await this.prisma.customerOrder.findUnique({
      where: { id: orderId },
      include: {
        restaurant: true,
        customer: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Smart Routing Logic using Registry
    const selectedPartner = this.registry.selectBestProvider();
    const provider = this.registry.get(selectedPartner);

    this.logger.log(`Selected provider ${selectedPartner} for order ${orderId}`);

    const shipmentDto: CreateShipmentDto = {
      orderId: order.id,
      restaurantAddress: order.restaurant.addressLine,
      restaurantLat: order.restaurant.latitude ?? undefined,
      restaurantLng: order.restaurant.longitude ?? undefined,
      customerAddress: order.deliveryAddress,
      customerName: order.customer?.name || 'Guest',
      customerPhone: order.customer?.phone,
      totalAmount: order.totalAmount.toNumber(),
      paymentMethod: order.paymentMethod as 'ONLINE' | 'COD',
    };

    try {
      const response = await provider.createShipment(shipmentDto);

      // Create Delivery record in DB
      const delivery = await this.prisma.delivery.create({
        data: {
          orderId: order.id,
          partner: selectedPartner,
          shipmentId: response.shipmentId,
          status: DeliveryStatus.ASSIGNED,
          trackingUrl: response.trackingUrl,
          eta: response.eta,
          supportsLiveGps: response.supportsLiveGps,
          riderName: 'Assigning Rider...',
        },
      });
      
      // Track Assignment Event for Analytics
      await this.prisma.deliveryEvent.create({
        data: {
          deliveryId: delivery.id,
          status: DeliveryStatus.ASSIGNED,
          rawPayload: { source: 'system_assignment' },
        }
      });
      
      await this.prisma.deliveryAnalytics.create({
        data: {
          deliveryId: delivery.id,
          partner: selectedPartner,
          assignmentTime: new Date(),
        }
      });

      // Start GPS polling if needed by provider
      if (provider.capabilities.requiresPolling && provider.capabilities.supportsLiveGps) {
        await this.gpsPollQueue.add(
          'poll',
          { deliveryId: delivery.id },
          {
            repeat: {
              every: this.config.gpsPollIntervalMs,
            },
            jobId: `gps-poll-${delivery.id}`,
          },
        );
        this.logger.log(`Started GPS polling job for delivery ${delivery.id}`);
      }

      const statusDto = await this.getDeliveryStatus(orderId);

      this.gateway.emitToRestaurant(order.restaurantId, 'delivery:assigned', statusDto);
      this.gateway.emitToCustomer(order.customerId, 'delivery:assigned', statusDto);

      return delivery;
    } catch (error) {
      this.logger.error(`Failed to assign delivery for order ${orderId}:`, error);
      throw error;
    }
  }

  async handleWebhook(partner: DeliveryPartner, rawPayload: any) {
    this.logger.log(`Received webhook from ${partner}`, rawPayload);

    const normalizedEvent = this.normalizer.normalize(partner, rawPayload);
    if (!normalizedEvent) {
      return { success: false, message: 'Unrecognized webhook payload' };
    }

    const { shipmentId, internalStatus, latitude, longitude, riderName, riderPhone, riderVehicle, eta } = normalizedEvent;

    const delivery = await this.prisma.delivery.findFirst({
      where: { shipmentId, partner },
      include: { customerOrder: true },
    });

    if (!delivery) {
      this.logger.warn(`Delivery not found for shipment ${shipmentId} from ${partner}`);
      return { success: false, message: 'Delivery not found' };
    }

    // Save event
    await this.prisma.deliveryEvent.create({
      data: {
        deliveryId: delivery.id,
        status: internalStatus,
        rawPayload: rawPayload as any,
      }
    });

    const updateData: any = {};
    let shouldUpdateStatus = false;

    if (internalStatus && internalStatus !== delivery.status) {
      updateData.status = internalStatus;
      shouldUpdateStatus = true;
    }
    
    if (riderName) updateData.riderName = riderName;
    if (riderPhone) updateData.riderPhone = riderPhone;
    if (riderVehicle) updateData.riderVehicle = riderVehicle;
    if (eta) updateData.eta = eta;

    const updatedDelivery = await this.prisma.delivery.update({
      where: { id: delivery.id },
      data: updateData,
    });
    
    // Map DeliveryStatus to OrderStatus
    let targetOrderStatus: OrderStatus | null = null;
    switch (internalStatus) {
      case DeliveryStatus.ASSIGNED:
        targetOrderStatus = OrderStatus.RIDER_ASSIGNED;
        break;
      case DeliveryStatus.PICKED_UP:
        targetOrderStatus = OrderStatus.PICKED_UP;
        break;
      case DeliveryStatus.OUT_FOR_DELIVERY:
        targetOrderStatus = OrderStatus.OUT_FOR_DELIVERY;
        break;
      case DeliveryStatus.DELIVERED:
        targetOrderStatus = OrderStatus.DELIVERED;
        break;
      case DeliveryStatus.CANCELLED:
      case DeliveryStatus.FAILED:
        // We do not auto-cancel the order if delivery fails, maybe it requires restaurant action,
        // but for now, we leave the status as is or map it. The instructions say Cancelled.
        break;
    }

    if (shouldUpdateStatus && targetOrderStatus) {
      // Auto-update COD payment status to RECEIVED on delivery
      const isCodDelivered =
        internalStatus === DeliveryStatus.DELIVERED &&
        delivery.customerOrder.paymentMethod === 'COD';

      await this.prisma.customerOrder.update({
        where: { id: delivery.orderId },
        data: {
          status: targetOrderStatus,
          ...(isCodDelivered ? { paymentStatus: 'RECEIVED' } : {}),
        },
      });

      const eventPayload = {
        orderId: delivery.orderId,
        status: targetOrderStatus,
        updatedAt: new Date(),
      };
      this.gateway.emitToRestaurant(delivery.customerOrder.restaurantId, 'customer-order:updated', eventPayload);
      this.gateway.emitToOrder(delivery.orderId, 'order:status_updated', eventPayload);

      // Notify restaurant + customer of COD payment received
      if (isCodDelivered) {
        const paymentPayload = {
          orderId: delivery.orderId,
          paymentStatus: 'RECEIVED',
          paymentMethod: 'COD',
          updatedAt: new Date(),
        };
        this.gateway.emitToRestaurant(delivery.customerOrder.restaurantId, 'payment:status_updated', paymentPayload);
        this.gateway.emitToCustomer(delivery.customerOrder.customerId, 'payment:status_updated', paymentPayload);
      }
    }
    
    // Update Analytics table on terminal/milestone events
    if (internalStatus === DeliveryStatus.PICKED_UP) {
       await this.prisma.deliveryAnalytics.update({
         where: { deliveryId: delivery.id },
         data: { pickupTime: new Date() }
       });
    } else if (internalStatus === DeliveryStatus.DELIVERED) {
       const analytics = await this.prisma.deliveryAnalytics.findUnique({ where: { deliveryId: delivery.id } });
       let durationMin = null;
       if (analytics?.assignmentTime) {
         durationMin = Math.round((new Date().getTime() - analytics.assignmentTime.getTime()) / 60000);
       }
       await this.prisma.deliveryAnalytics.update({
         where: { deliveryId: delivery.id },
         data: { 
           deliveryTime: new Date(), 
           isSuccess: true,
           deliveryDuration: durationMin,
         }
       });
    } else if (internalStatus === DeliveryStatus.FAILED || internalStatus === DeliveryStatus.CANCELLED) {
       await this.prisma.deliveryAnalytics.update({
         where: { deliveryId: delivery.id },
         data: { isFailed: true }
       });
    }

    const statusDto = await this.getDeliveryStatus(delivery.orderId);

    if (shouldUpdateStatus) {
      this.gateway.emitToCustomer(delivery.customerOrder.customerId, 'delivery:status_updated', statusDto);
      this.gateway.emitToRestaurant(delivery.customerOrder.restaurantId, 'delivery:status_updated', statusDto);
    }

    if (latitude && longitude) {
      const tracking = await this.prisma.deliveryTracking.create({
        data: { deliveryId: delivery.id, latitude, longitude },
      });

      const updatePayload = {
        deliveryId: delivery.id,
        latitude,
        longitude,
        timestamp: tracking.timestamp,
      };

      this.gateway.emitToCustomer(delivery.customerOrder.customerId, 'delivery:location_updated', updatePayload);
      this.gateway.emitToRestaurant(delivery.customerOrder.restaurantId, 'delivery:location_updated', updatePayload);
    }

    return { success: true };
  }

  async getDeliveryStatus(orderId: string): Promise<DeliveryStatusDto | null> {
    const delivery = await this.prisma.delivery.findFirst({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
      include: { trackingUpdates: { orderBy: { timestamp: 'desc' }, take: 1 } },
    });

    if (!delivery) return null;

    return {
      deliveryId: delivery.id,
      orderId: delivery.orderId,
      partner: delivery.partner,
      status: delivery.status,
      supportsLiveGps: delivery.supportsLiveGps,
      trackingUrl: delivery.trackingUrl ?? undefined,
      eta: delivery.eta ?? undefined,
      rider: {
        name: delivery.riderName ?? undefined,
        phone: delivery.riderPhone ?? undefined,
        vehicle: delivery.riderVehicle ?? undefined,
      },
      lastLocation: delivery.trackingUpdates[0] ? {
        lat: delivery.trackingUpdates[0].latitude,
        lng: delivery.trackingUpdates[0].longitude,
        timestamp: delivery.trackingUpdates[0].timestamp,
      } : undefined,
    };
  }

  async cancelDelivery(deliveryId: string) {
    const delivery = await this.prisma.delivery.findUnique({ where: { id: deliveryId } });
    if (!delivery || !delivery.shipmentId) return;

    try {
      const provider = this.registry.get(delivery.partner);
      await provider.cancelShipment(delivery.shipmentId);
    } catch (e) {
      this.logger.error(`Failed to cancel delivery ${deliveryId} at provider`, e);
    }

    await this.prisma.delivery.update({
      where: { id: deliveryId },
      data: { status: DeliveryStatus.CANCELLED },
    });
    
    await this.prisma.deliveryAnalytics.update({
         where: { deliveryId: delivery.id },
         data: { isFailed: true }
    });
  }
}

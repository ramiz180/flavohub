import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { DeliveryStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DeliveryProviderRegistry } from '../delivery-provider.registry';
import { RestaurantGateway } from '../../restaurant-gateway/restaurant.gateway';
import { GpsPollJobData } from './gps-poll.types';

export const GPS_POLL_QUEUE_NAME = 'delivery-gps-poll';

@Processor(GPS_POLL_QUEUE_NAME)
export class GpsPollProcessor extends WorkerHost {
  private readonly logger = new Logger(GpsPollProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: DeliveryProviderRegistry,
    private readonly gateway: RestaurantGateway,
  ) {
    super();
  }

  async process(job: Job<GpsPollJobData>): Promise<void> {
    const { deliveryId } = job.data;

    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { customerOrder: true },
    });

    if (!delivery || !delivery.shipmentId) {
      this.logger.warn(`Skipping poll for delivery ${deliveryId}: Not found or no shipmentId`);
      return;
    }

    const terminalStatuses: DeliveryStatus[] = [
      DeliveryStatus.DELIVERED,
      DeliveryStatus.FAILED,
      DeliveryStatus.CANCELLED,
    ];

    if (terminalStatuses.includes(delivery.status)) {
      this.logger.log(`Delivery ${deliveryId} is in terminal status ${delivery.status}, ignoring poll request.`);
      return;
    }

    try {
      const provider = this.registry.get(delivery.partner);
      
      if (!provider.capabilities.requiresPolling) {
        return;
      }

      const location = await provider.getRiderLocation(delivery.shipmentId);

      if (location) {
        const tracking = await this.prisma.deliveryTracking.create({
          data: {
            deliveryId: delivery.id,
            latitude: location.lat,
            longitude: location.lng,
          },
        });

        const updatePayload = {
          deliveryId: delivery.id,
          latitude: location.lat,
          longitude: location.lng,
          timestamp: tracking.timestamp,
        };

        this.gateway.emitToCustomer(delivery.customerOrder.customerId, 'delivery:location_updated', updatePayload);
        this.gateway.emitToRestaurant(delivery.customerOrder.restaurantId, 'delivery:location_updated', updatePayload);
      }
    } catch (error) {
      this.logger.error(`Failed to poll GPS for delivery ${deliveryId}:`, error);
    }
  }
}

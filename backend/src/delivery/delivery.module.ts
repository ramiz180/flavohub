import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DeliveryService } from './delivery.service';
import { DeliveryController } from './delivery.controller';
import { CustomerDeliveryController } from './customer-delivery.controller';
import { AdminDeliveryController } from './admin-delivery.controller';
import { RestaurantGatewayModule } from '../restaurant-gateway/restaurant-gateway.module';
import { DeliveryProviderRegistry } from './delivery-provider.registry';
import { DeliveryEventNormalizer } from './delivery-event.normalizer';
import { GPS_POLL_QUEUE_NAME, GpsPollProcessor } from './queues/gps-poll.processor';

import { ShadowfaxProvider } from './providers/shadowfax/shadowfax.provider';
import { BorzoProvider } from './providers/borzo/borzo.provider';
import { PorterProvider } from './providers/porter/porter.provider';
import { DelhiveryProvider } from './providers/delhivery/delhivery.provider';
import { FlavohubProvider } from './providers/flavohub/flavohub.provider';
import { AppConfigModule } from '../config/app-config.module';
import { AdminModule } from '../admin/admin.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    RestaurantGatewayModule,
    AppConfigModule,
    AdminModule,
    PrismaModule,
    BullModule.registerQueue({
      name: GPS_POLL_QUEUE_NAME,
    }),
  ],
  controllers: [
    DeliveryController,
    CustomerDeliveryController,
    AdminDeliveryController,
  ],
  providers: [
    DeliveryService,
    DeliveryProviderRegistry,
    DeliveryEventNormalizer,
    GpsPollProcessor,
    ShadowfaxProvider,
    BorzoProvider,
    PorterProvider,
    DelhiveryProvider,
    FlavohubProvider,
  ],
  exports: [DeliveryService],
})
export class DeliveryModule {}

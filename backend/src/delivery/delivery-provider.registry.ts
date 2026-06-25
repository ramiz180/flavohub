import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DeliveryPartner } from '@prisma/client';
import { DeliveryProviderInterface } from './providers/delivery-provider.interface';
import { ShadowfaxProvider } from './providers/shadowfax/shadowfax.provider';
import { BorzoProvider } from './providers/borzo/borzo.provider';
import { PorterProvider } from './providers/porter/porter.provider';
import { DelhiveryProvider } from './providers/delhivery/delhivery.provider';
import { FlavohubProvider } from './providers/flavohub/flavohub.provider';

@Injectable()
export class DeliveryProviderRegistry {
  private readonly map = new Map<DeliveryPartner, DeliveryProviderInterface>();
  private readonly logger = new Logger(DeliveryProviderRegistry.name);

  constructor(
    shadowfax: ShadowfaxProvider,
    borzo: BorzoProvider,
    porter: PorterProvider,
    delhivery: DelhiveryProvider,
    flavohub: FlavohubProvider,
  ) {
    this.map.set(shadowfax.name, shadowfax);
    this.map.set(borzo.name, borzo);
    this.map.set(porter.name, porter);
    this.map.set(delhivery.name, delhivery);
    this.map.set(flavohub.name, flavohub);
  }

  get(partner: DeliveryPartner): DeliveryProviderInterface {
    const provider = this.map.get(partner);
    if (!provider) {
      throw new NotFoundException(`Delivery provider ${partner} not configured`);
    }
    return provider;
  }

  getAll(): DeliveryProviderInterface[] {
    return Array.from(this.map.values());
  }

  // Hardcoded to Shadowfax per the primary provider decision
  selectBestProvider(): DeliveryPartner {
    return DeliveryPartner.SHADOWFAX;
  }
}

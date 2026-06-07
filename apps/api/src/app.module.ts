import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module';
import { AppConfigModule } from './config/app-config.module';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { CouponsModule } from './coupons/coupons.module';
import { HealthModule } from './health/health.module';
import { MenuModule } from './menu/menu.module';
import { OwnerRestaurantModule } from './owner-restaurant/owner-restaurant.module';
import { PricingModule } from './pricing/pricing.module';
import { PrismaModule } from './prisma/prisma.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    AuditModule,
    AuthModule,
    AdminModule,
    RestaurantsModule,
    OwnerRestaurantModule,
    MenuModule,
    PricingModule,
    CouponsModule,
    SettingsModule,
    HealthModule,
  ],
})
export class AppModule {}

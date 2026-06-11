import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AdminModule } from './admin/admin.module';
import { AppConfigModule } from './config/app-config.module';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { KeepaliveService } from './common/keepalive.service';
import { CouponsModule } from './coupons/coupons.module';
import { CustomerAddressModule } from './customer-address/customer-address.module';
import { CustomerAuthModule } from './customer-auth/customer-auth.module';
import { CustomerProfileModule } from './customer-profile/customer-profile.module';
import { CustomerCartModule } from './customer-cart/customer-cart.module';
import { CustomerCouponModule } from './customer-coupon/customer-coupon.module';
import { CustomerOrderModule } from './customer-order/customer-order.module';
import { CustomerRestaurantModule } from './customer-restaurant/customer-restaurant.module';
import { HealthModule } from './health/health.module';
import { MenuModule } from './menu/menu.module';
import { OrdersModule } from './orders/orders.module';
import { OwnerRestaurantModule } from './owner-restaurant/owner-restaurant.module';
import { PricingModule } from './pricing/pricing.module';
import { PrismaModule } from './prisma/prisma.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
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
    OrdersModule,
    CustomerAuthModule,
    CustomerProfileModule,
    CustomerAddressModule,
    CustomerRestaurantModule,
    CustomerCartModule,
    CustomerOrderModule,
    CustomerCouponModule,
  ],
  providers: [KeepaliveService],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AdminModule } from './admin/admin.module';
import { BullModule } from '@nestjs/bullmq';
import { AppConfigModule } from './config/app-config.module';
import { AppConfigService } from './config/app-config.service';
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
import { CustomerPaymentModule } from './customer-payment/customer-payment.module';
import { CustomerRestaurantModule } from './customer-restaurant/customer-restaurant.module';
import { HealthModule } from './health/health.module';
import { RestaurantCustomerOrdersModule } from './restaurant-customer-orders/restaurant-customer-orders.module';
import { MenuModule } from './menu/menu.module';
import { OrdersModule } from './orders/orders.module';
import { OwnerRestaurantModule } from './owner-restaurant/owner-restaurant.module';
import { PricingModule } from './pricing/pricing.module';
import { PrismaModule } from './prisma/prisma.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { SettingsModule } from './settings/settings.module';
import { DeliveryModule } from './delivery/delivery.module';

import { UploadModule } from './upload/upload.module';
import { LocationModule } from './location/location.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      imports: [AppConfigModule],
      useFactory: async (configService: AppConfigService) => ({
        connection: {
          url: configService.redisUrl,
          maxRetriesPerRequest: 3,
          retryStrategy: (times: number) => {
            if (times > 3) {
              console.error('====================================================');
              console.error('Application startup is failing because Redis is not available.');
              console.error('Please verify:');
              console.error('1. Redis server is running.');
              console.error('2. REDIS_URL is configured correctly.');
              console.error('3. BullMQ connection settings are correct.');
              console.error('====================================================');
              process.exit(1);
            }
            return Math.min(times * 50, 2000);
          },
        },
      }),
      inject: [AppConfigService],
    }),
    AppConfigModule,
    UploadModule,
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
    CustomerPaymentModule,
    RestaurantCustomerOrdersModule,
    DeliveryModule,
    LocationModule,
  ],
  providers: [KeepaliveService],
})
export class AppModule {}

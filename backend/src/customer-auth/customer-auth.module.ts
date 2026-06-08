import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AppConfigModule } from '../config/app-config.module';
import { AppConfigService } from '../config/app-config.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CustomerAuthController } from './customer-auth.controller';
import { CustomerAuthService } from './customer-auth.service';
import { CustomerJwtAuthGuard } from './guards/customer-jwt-auth.guard';
import { CustomerJwtStrategy } from './strategies/customer-jwt.strategy';

@Module({
  imports: [
    PassportModule,
    AppConfigModule,
    PrismaModule,
    JwtModule.registerAsync({
      imports: [AppConfigModule],
      useFactory: (config: AppConfigService) => ({
        secret: config.jwtAccessSecret,
        signOptions: { expiresIn: config.jwtAccessTtl },
      }),
      inject: [AppConfigService],
    }),
  ],
  controllers: [CustomerAuthController],
  providers: [CustomerAuthService, CustomerJwtStrategy, CustomerJwtAuthGuard],
  exports: [CustomerJwtAuthGuard, CustomerJwtStrategy],
})
export class CustomerAuthModule {}

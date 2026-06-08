import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CustomerAuthModule } from '../customer-auth/customer-auth.module';
import { CustomerAddressController } from './customer-address.controller';
import { CustomerAddressService } from './customer-address.service';

@Module({
  imports: [PrismaModule, CustomerAuthModule],
  controllers: [CustomerAddressController],
  providers: [CustomerAddressService],
})
export class CustomerAddressModule {}

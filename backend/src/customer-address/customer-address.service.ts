import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerAddressDto } from './dto/create-customer-address.dto';
import { UpdateCustomerAddressDto } from './dto/update-customer-address.dto';

@Injectable()
export class CustomerAddressService {
  constructor(private readonly prisma: PrismaService) {}

  async listAddresses(customerId: string) {
    return this.prisma.customerAddress.findMany({
      where: { customerId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async createAddress(customerId: string, dto: CreateCustomerAddressDto) {
    const existing = await this.prisma.customerAddress.count({ where: { customerId } });
    const isDefault = existing === 0;

    return this.prisma.customerAddress.create({
      data: {
        customerId,
        label: dto.label ?? 'Home',
        addressLine: dto.addressLine,
        city: dto.city,
        state: dto.state,
        pincode: dto.pincode,
        lat: dto.lat,
        lng: dto.lng,
        isDefault,
      },
    });
  }

  async updateAddress(customerId: string, addressId: string, dto: UpdateCustomerAddressDto) {
    const address = await this.prisma.customerAddress.findUnique({ where: { id: addressId } });
    if (!address || address.customerId !== customerId) {
      throw new NotFoundException('Address not found');
    }

    return this.prisma.customerAddress.update({
      where: { id: addressId },
      data: dto,
    });
  }

  async deleteAddress(customerId: string, addressId: string) {
    const address = await this.prisma.customerAddress.findUnique({ where: { id: addressId } });
    if (!address || address.customerId !== customerId) {
      throw new NotFoundException('Address not found');
    }

    await this.prisma.customerAddress.delete({ where: { id: addressId } });

    if (address.isDefault) {
      const next = await this.prisma.customerAddress.findFirst({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
      });
      if (next) {
        await this.prisma.customerAddress.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
      }
    }

    return { deleted: true };
  }

  async setDefaultAddress(customerId: string, addressId: string) {
    const address = await this.prisma.customerAddress.findUnique({ where: { id: addressId } });
    if (!address || address.customerId !== customerId) {
      throw new NotFoundException('Address not found');
    }

    const [, updated] = await this.prisma.$transaction([
      this.prisma.customerAddress.updateMany({
        where: { customerId },
        data: { isDefault: false },
      }),
      this.prisma.customerAddress.update({
        where: { id: addressId },
        data: { isDefault: true },
      }),
    ]);

    return updated;
  }
}

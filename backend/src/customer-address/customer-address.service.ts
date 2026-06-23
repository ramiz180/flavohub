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
    console.log('CustomerAddress Request Body:', dto);
    const existing = await this.prisma.customerAddress.count({ where: { customerId } });
    const isDefault = existing === 0;

    const address = await this.prisma.customerAddress.create({
      data: {
        customerId,
        label: dto.label ?? 'Home',
        addressLine: dto.address,
        city: dto.city,
        state: dto.state,
        pincode: dto.pincode,
        lat: dto.latitude,
        lng: dto.longitude,
        isDefault,
      },
    });

    if (dto.latitude !== undefined && dto.longitude !== undefined && dto.latitude !== null && dto.longitude !== null) {
      await this.prisma.$executeRaw`
        UPDATE "CustomerAddress"
        SET location = ST_SetSRID(ST_MakePoint(${dto.longitude}, ${dto.latitude}), 4326)
        WHERE id = ${address.id}
      `;
    }

    return address;
  }

  async updateAddress(customerId: string, addressId: string, dto: UpdateCustomerAddressDto) {
    const address = await this.prisma.customerAddress.findUnique({ where: { id: addressId } });
    if (!address || address.customerId !== customerId) {
      throw new NotFoundException('Address not found');
    }

    // Map new DTO fields to Prisma
    const dataToUpdate: any = { ...dto };
    if (dto.address !== undefined) {
      dataToUpdate.addressLine = dto.address;
      delete dataToUpdate.address;
    }
    if (dto.landmark !== undefined) {
      delete dataToUpdate.landmark;
    }
    if (dto.latitude !== undefined) {
      dataToUpdate.lat = dto.latitude;
      delete dataToUpdate.latitude;
    }
    if (dto.longitude !== undefined) {
      dataToUpdate.lng = dto.longitude;
      delete dataToUpdate.longitude;
    }

    const updated = await this.prisma.customerAddress.update({
      where: { id: addressId },
      data: dataToUpdate,
    });

    if (dto.latitude !== undefined && dto.longitude !== undefined && dto.latitude !== null && dto.longitude !== null) {
      await this.prisma.$executeRaw`
        UPDATE "CustomerAddress"
        SET location = ST_SetSRID(ST_MakePoint(${dto.longitude}, ${dto.latitude}), 4326)
        WHERE id = ${addressId}
      `;
    }

    return updated;
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

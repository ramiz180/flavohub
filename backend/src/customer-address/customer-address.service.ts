import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
    if (!dto.latitude || !dto.longitude) {
      throw new BadRequestException('Latitude and longitude are required to save an address.');
    }
    const cleanAddress = dto.address?.trim() ?? '';
    if (!cleanAddress || cleanAddress.toLowerCase() === 'locating...') {
      throw new BadRequestException('A valid formatted address is required.');
    }

    const label = dto.label?.trim() || 'Home';

    // 1. Check for exact label match (prevent duplicate Home/Work)
    let existingMatch = await this.prisma.customerAddress.findFirst({
      where: { customerId, label },
    });

    // 2. If no exact label match, check for spatial duplicate within 50 meters
    if (!existingMatch) {
      const nearbyAddresses: any[] = await this.prisma.$queryRaw`
        SELECT id FROM "CustomerAddress"
        WHERE "customerId" = ${customerId}::uuid
        AND ST_DWithin(
          location,
          ST_SetSRID(ST_MakePoint(${dto.longitude}, ${dto.latitude}), 4326),
          50,
          true
        )
        LIMIT 1
      `;
      if (nearbyAddresses.length > 0) {
        existingMatch = await this.prisma.customerAddress.findUnique({
          where: { id: nearbyAddresses[0].id },
        });
      }
    }

    if (existingMatch) {
      // Update existing instead of duplicating
      return this.updateAddress(customerId, existingMatch.id, {
        ...dto,
        label,
      });
    }

    const existingCount = await this.prisma.customerAddress.count({ where: { customerId } });
    const isDefault = existingCount === 0;

    const address = await this.prisma.customerAddress.create({
      data: {
        customerId,
        label,
        addressLine: cleanAddress,
        city: dto.city,
        state: dto.state,
        pincode: dto.pincode,
        lat: dto.latitude,
        lng: dto.longitude,
        isDefault,
      },
    });

    await this.prisma.$executeRaw`
      UPDATE "CustomerAddress"
      SET location = ST_SetSRID(ST_MakePoint(${dto.longitude}, ${dto.latitude}), 4326)
      WHERE id = ${address.id}
    `;

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

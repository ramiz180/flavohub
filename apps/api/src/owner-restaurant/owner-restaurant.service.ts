import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditLogService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateOwnerProfileDto } from './dto/update-owner-profile.dto';
import { SetHoursDto } from './dto/set-hours.dto';

@Injectable()
export class OwnerRestaurantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async getProfile(ownerId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { ownerId },
      include: { hours: { orderBy: { dayOfWeek: 'asc' } } },
    });
    if (!restaurant) throw new NotFoundException('No restaurant linked to this account');
    return restaurant;
  }

  async updateProfile(ownerId: string, dto: UpdateOwnerProfileDto) {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { ownerId } });
    if (!restaurant) throw new NotFoundException('No restaurant linked to this account');

    const before = this.snap(restaurant);
    const updated = await this.prisma.restaurant.update({
      where: { id: restaurant.id },
      data: dto,
      include: { hours: { orderBy: { dayOfWeek: 'asc' } } },
    });

    await this.auditLog.log({
      actorId: ownerId,
      action: 'UPDATE_PROFILE',
      entityType: 'Restaurant',
      entityId: restaurant.id,
      before,
      after: this.snap(updated),
    });

    return updated;
  }

  async setHours(ownerId: string, dto: SetHoursDto) {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { ownerId } });
    if (!restaurant) throw new NotFoundException('No restaurant linked to this account');

    await this.prisma.$transaction(
      dto.hours.map((entry) =>
        this.prisma.restaurantHours.upsert({
          where: {
            restaurantId_dayOfWeek: { restaurantId: restaurant.id, dayOfWeek: entry.dayOfWeek },
          },
          create: {
            restaurantId: restaurant.id,
            dayOfWeek: entry.dayOfWeek,
            openTime: entry.openTime,
            closeTime: entry.closeTime,
            isClosed: entry.isClosed,
          },
          update: {
            openTime: entry.openTime,
            closeTime: entry.closeTime,
            isClosed: entry.isClosed,
          },
        }),
      ),
    );

    await this.auditLog.log({
      actorId: ownerId,
      action: 'UPDATE_HOURS',
      entityType: 'Restaurant',
      entityId: restaurant.id,
      after: { hours: dto.hours },
    });

    return this.prisma.restaurantHours.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  private snap(r: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    city: string;
  }): Record<string, unknown> {
    return { id: r.id, name: r.name, phone: r.phone, email: r.email, city: r.city };
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NearbyQueryDto } from './dto/nearby-query.dto';

interface NearbyRestaurant {
  id: string;
  name: string;
  cuisineType: string | null;
  logoUrl: string | null;
  addressLine: string;
  city: string;
  isActive: boolean;
  status: string;
  distance: number;
}

@Injectable()
export class CustomerRestaurantService {
  constructor(private prisma: PrismaService) {}

  async findNearby(query: NearbyQueryDto) {
    const { lat, lng, radius = 5 } = query;
    const restaurants = await this.prisma.$queryRaw<NearbyRestaurant[]>`
      SELECT
        r.id,
        r.name,
        r."cuisineType",
        r."logoUrl",
        r."addressLine",
        r.city,
        r."isActive",
        r.status,
        (
          6371 * 2 * ASIN(SQRT(
            POWER(SIN(RADIANS(${lat} - r.latitude) / 2), 2) +
            COS(RADIANS(${lat})) * COS(RADIANS(r.latitude)) *
            POWER(SIN(RADIANS(${lng} - r.longitude) / 2), 2)
          ))
        ) AS distance
      FROM "Restaurant" r
      WHERE
        r.status = 'APPROVED'
        AND r."isActive" = true
        AND r.latitude IS NOT NULL
        AND r.longitude IS NOT NULL
        AND (
          6371 * 2 * ASIN(SQRT(
            POWER(SIN(RADIANS(${lat} - r.latitude) / 2), 2) +
            COS(RADIANS(${lat})) * COS(RADIANS(r.latitude)) *
            POWER(SIN(RADIANS(${lng} - r.longitude) / 2), 2)
          ))
        ) <= ${radius}
      ORDER BY distance ASC
    `;
    return restaurants;
  }

  async findById(id: string) {
    return this.prisma.restaurant.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        cuisineType: true,
        logoUrl: true,
        addressLine: true,
        city: true,
        phone: true,
        isActive: true,
        status: true,
        latitude: true,
        longitude: true,
        hours: {
          select: {
            dayOfWeek: true,
            openTime: true,
            closeTime: true,
            isClosed: true,
          },
          orderBy: { dayOfWeek: 'asc' },
        },
      },
    });
  }

  async findMenu(restaurantId: string) {
    return this.prisma.menuCategory.findMany({
      where: { restaurantId },
      orderBy: { sortOrder: 'asc' },
      include: {
        items: {
          where: { isAvailable: true },
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            imageUrl: true,
            isAvailable: true,
          },
        },
      },
    });
  }
}

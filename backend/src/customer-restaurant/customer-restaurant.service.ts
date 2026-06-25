import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NearbyQueryDto } from './dto/nearby-query.dto';
import { SearchQueryDto } from './dto/search-query.dto';
import { CategoryQueryDto } from './dto/category-query.dto';

// ─── Response Shapes ────────────────────────────────────────────────────────

export interface NearbyRestaurant {
  id: string;
  name: string;
  cuisineType: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  addressLine: string;
  city: string;
  isActive: boolean;
  isOpen: boolean;
  status: string;
  distance: number;
  deliveryTimeMin: number | null;
  minOrderAmount: number | null;
}

export interface FoodSearchResult {
  id: string;
  name: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
  isAvailable: boolean;
  restaurantId: string;
  restaurantName: string;
  restaurantCity: string;
}

export interface SearchResult {
  restaurants: NearbyRestaurant[];
  foods: FoodSearchResult[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Compute whether a restaurant is currently open based on its RestaurantHours.
 * openTime/closeTime are stored as "HH:mm" strings (24-hour, local restaurant time).
 * We compare against the current UTC+5:30 (IST) wall-clock time.
 */
function computeIsOpen(
  hours: Array<{ dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean }>,
): boolean {
  // TODO: Temporarily bypassed for development
  return true;

  /*
  // Use IST (UTC+5:30)
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffset);
  const dayOfWeek = ist.getUTCDay(); // 0=Sun … 6=Sat
  const hhmm = `${String(ist.getUTCHours()).padStart(2, '0')}:${String(ist.getUTCMinutes()).padStart(2, '0')}`;

  const todayHours = hours.find((h) => h.dayOfWeek === dayOfWeek);
  if (!todayHours || todayHours.isClosed) return false;
  return hhmm >= todayHours.openTime && hhmm <= todayHours.closeTime;
  */
}

/**
 * Haversine distance (km) between two lat/lng pairs.
 */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class CustomerRestaurantService {
  constructor(private prisma: PrismaService) {}

  // ── Nearby ──────────────────────────────────────────────────────────────────

  async findNearby(query: NearbyQueryDto): Promise<NearbyRestaurant[]> {
    const { latitude: lat, longitude: lng, radius = 10 } = query;

    // PostGIS path: restaurants with geometry column set
    const withLocation = await this.prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        cuisineType: string | null;
        logoUrl: string | null;
        addressLine: string;
        city: string;
        isActive: boolean;
        status: string;
        distance: number;
        latitude: number | null;
        longitude: number | null;
        deliveryRadiusKm: number;
        hours: Array<{ dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean }>;
      }>
    >`
      SELECT
        r.id,
        r.name,
        r."cuisineType",
        r."logoUrl",
        r."addressLine",
        r.city,
        r."isActive",
        r.status,
        r.latitude,
        r.longitude,
        r."deliveryRadiusKm",
        (ST_Distance(r.location, ST_MakePoint(${lng}, ${lat})::geography) / 1000) AS distance
      FROM "Restaurant" r
      WHERE
        r.status = 'APPROVED'
        AND r."isActive" = true
        AND r.location IS NOT NULL
        AND ST_DWithin(r.location, ST_MakePoint(${lng}, ${lat})::geography, LEAST(${radius}, r."deliveryRadiusKm") * 1000)
      ORDER BY distance ASC
    `;

    // Haversine fallback: restaurants with lat/lng but no PostGIS geometry
    const withLatLng = await this.prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        cuisineType: string | null;
        logoUrl: string | null;
        addressLine: string;
        city: string;
        isActive: boolean;
        status: string;
        distance: number;
        latitude: number | null;
        longitude: number | null;
        deliveryRadiusKm: number;
      }>
    >`
      SELECT
        r.id,
        r.name,
        r."cuisineType",
        r."logoUrl",
        r."addressLine",
        r.city,
        r."isActive",
        r.status,
        r.latitude,
        r.longitude,
        r."deliveryRadiusKm",
        CASE
          WHEN r.latitude IS NOT NULL AND r.longitude IS NOT NULL THEN
            (6371 * acos(
              LEAST(1.0, cos(radians(${lat})) * cos(radians(r.latitude)) *
              cos(radians(r.longitude) - radians(${lng})) +
              sin(radians(${lat})) * sin(radians(r.latitude)))
            ))
          ELSE 999
        END AS distance
      FROM "Restaurant" r
      WHERE
        r.status = 'APPROVED'
        AND r."isActive" = true
        AND r.location IS NULL
        AND r.latitude IS NOT NULL
        AND r.longitude IS NOT NULL
        AND (
          6371 * acos(
            LEAST(1.0, cos(radians(${lat})) * cos(radians(r.latitude)) *
            cos(radians(r.longitude) - radians(${lng})) +
            sin(radians(${lat})) * sin(radians(r.latitude)))
          )
        ) <= LEAST(${radius}, r."deliveryRadiusKm")
      ORDER BY distance ASC
    `;

    // Also include restaurants with no location data at all (distance = 0, shown as "Nearby")
    const noLocation = await this.prisma.restaurant.findMany({
      where: {
        status: 'APPROVED',
        isActive: true,
        latitude: null,
        longitude: null,
        // Note: cannot filter on PostGIS geometry via Prisma ORM; latitude: null already excludes geo-enabled rows
      },
      select: {
        id: true,
        name: true,
        cuisineType: true,
        logoUrl: true,
        addressLine: true,
        city: true,
        isActive: true,
        status: true,
      },
    });

    // Fetch hours for all candidate restaurants in one query
    const allIds = [
      ...withLocation.map((r) => r.id),
      ...withLatLng.map((r) => r.id),
      ...noLocation.map((r) => r.id),
    ];
    const hoursMap = await this.buildHoursMap(allIds);

    // Deduplicate and merge
    const seen = new Set<string>();
    const merged: NearbyRestaurant[] = [];

    const toShape = (
      r: { id: string; name: string; cuisineType: string | null; logoUrl: string | null; addressLine: string; city: string; isActive: boolean; status: string; deliveryRadiusKm?: number },
      distance: number,
    ): NearbyRestaurant => ({
      id: r.id,
      name: r.name,
      cuisineType: r.cuisineType,
      logoUrl: r.logoUrl,
      coverImageUrl: null, // Future: add coverImageUrl to schema
      addressLine: r.addressLine,
      city: r.city,
      isActive: r.isActive,
      isOpen: computeIsOpen(hoursMap[r.id] ?? []),
      status: r.status,
      distance,
      deliveryTimeMin: null, // Future: add to schema
      minOrderAmount: null,  // Future: add to schema
    });

    for (const r of withLocation) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        merged.push(toShape(r, Number(r.distance)));
      }
    }
    for (const r of withLatLng) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        merged.push(toShape(r, Number(r.distance)));
      }
    }
    for (const r of noLocation) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        merged.push(toShape(r, 0));
      }
    }

    return merged.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
  }

  // ── Restaurant Detail ────────────────────────────────────────────────────────

  async findById(id: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
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

    if (!restaurant) return null;

    return {
      ...restaurant,
      isOpen: computeIsOpen(restaurant.hours),
    };
  }

  // ── Menu ─────────────────────────────────────────────────────────────────────

  async findMenu(restaurantId: string) {
    // Only serve menu if the restaurant is APPROVED and active
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { status: true, isActive: true },
    });

    if (!restaurant || restaurant.status !== 'APPROVED' || !restaurant.isActive) {
      return [];
    }

    const categories = await this.prisma.menuCategory.findMany({
      where: { restaurantId },
      orderBy: { sortOrder: 'asc' },
      include: {
        items: {
          where: { isAvailable: true },
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            imageUrl: true,
            isAvailable: true,
            sortOrder: true,
          },
        },
      },
    });

    // Only return categories that have at least one available item
    return categories.filter((cat) => cat.items.length > 0);
  }

  // ── Search ───────────────────────────────────────────────────────────────────

  async search(dto: SearchQueryDto): Promise<SearchResult> {
    const { q, latitude: lat, longitude: lng, radius = 50 } = dto;
    const term = `%${q.trim().toLowerCase()}%`;

    // Search restaurants by name or cuisineType
    const restaurants = await this.prisma.restaurant.findMany({
      where: {
        status: 'APPROVED',
        isActive: true,
        OR: [
          { name: { contains: q.trim(), mode: 'insensitive' } },
          { cuisineType: { contains: q.trim(), mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        cuisineType: true,
        logoUrl: true,
        addressLine: true,
        city: true,
        isActive: true,
        status: true,
        latitude: true,
        longitude: true,
        hours: {
          select: { dayOfWeek: true, openTime: true, closeTime: true, isClosed: true },
        },
      },
      take: 20,
    });

    // Search food items by name across APPROVED+active restaurants
    const foodItems = await this.prisma.menuItem.findMany({
      where: {
        isAvailable: true,
        name: { contains: q.trim(), mode: 'insensitive' },
        restaurant: {
          status: 'APPROVED',
          isActive: true,
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        imageUrl: true,
        isAvailable: true,
        restaurantId: true,
        restaurant: {
          select: { name: true, city: true },
        },
      },
      take: 20,
    });

    // Compute distance & isOpen for restaurants
    const restaurantResults: NearbyRestaurant[] = restaurants
      .map((r) => {
        const distance =
          lat !== undefined && lng !== undefined && r.latitude && r.longitude
            ? haversineKm(lat, lng, r.latitude, r.longitude)
            : 0;
        return {
          id: r.id,
          name: r.name,
          cuisineType: r.cuisineType,
          logoUrl: r.logoUrl,
          coverImageUrl: null,
          addressLine: r.addressLine,
          city: r.city,
          isActive: r.isActive,
          isOpen: computeIsOpen(r.hours),
          status: r.status,
          distance,
          deliveryTimeMin: null,
          minOrderAmount: null,
        } satisfies NearbyRestaurant;
      })
      .filter((r) => {
        if (lat === undefined || lng === undefined) return true;
        return r.distance <= radius;
      })
      .sort((a, b) => a.distance - b.distance);

    const foodResults: FoodSearchResult[] = foodItems.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      imageUrl: item.imageUrl,
      isAvailable: item.isAvailable,
      restaurantId: item.restaurantId,
      restaurantName: item.restaurant.name,
      restaurantCity: item.restaurant.city,
    }));

    return { restaurants: restaurantResults, foods: foodResults };
  }

  // ── Category Filter ──────────────────────────────────────────────────────────

  async getByCategory(dto: CategoryQueryDto): Promise<NearbyRestaurant[]> {
    const { name, latitude: lat, longitude: lng, radius = 10 } = dto;

    // Find restaurants that have at least one AVAILABLE item in the named category OR
    // whose cuisineType matches the category name OR
    // have a MenuCategory whose name matches.
    const restaurants = await this.prisma.restaurant.findMany({
      where: {
        status: 'APPROVED',
        isActive: true,
        OR: [
          { cuisineType: { contains: name, mode: 'insensitive' } },
          {
            menuCategories: {
              some: { name: { contains: name, mode: 'insensitive' } },
            },
          },
          {
            menuItems: {
              some: {
                isAvailable: true,
                name: { contains: name, mode: 'insensitive' },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        cuisineType: true,
        logoUrl: true,
        addressLine: true,
        city: true,
        isActive: true,
        status: true,
        latitude: true,
        longitude: true,
        deliveryRadiusKm: true,
        hours: {
          select: { dayOfWeek: true, openTime: true, closeTime: true, isClosed: true },
        },
      },
    });

    return restaurants
      .map((r) => {
        const distance =
          lat !== undefined && lng !== undefined && r.latitude && r.longitude
            ? haversineKm(lat, lng, r.latitude, r.longitude)
            : 0;
        return {
          id: r.id,
          name: r.name,
          cuisineType: r.cuisineType,
          logoUrl: r.logoUrl,
          coverImageUrl: null,
          addressLine: r.addressLine,
          city: r.city,
          isActive: r.isActive,
          isOpen: computeIsOpen(r.hours),
          status: r.status,
          distance,
          deliveryTimeMin: null,
          minOrderAmount: null,
        } satisfies NearbyRestaurant;
      })
      .filter((r) => {
        if (lat === undefined || lng === undefined) return true;
        const targetRadius = r.id ? (restaurants.find(rest => rest.id === r.id)?.deliveryRadiusKm ?? radius) : radius;
        return r.distance <= Math.min(radius, targetRadius);
      })
      .sort((a, b) => a.distance - b.distance);
  }

  // ── Popular Restaurants ──────────────────────────────────────────────────────

  async getPopular(query: NearbyQueryDto): Promise<NearbyRestaurant[]> {
    const { latitude: lat, longitude: lng, radius = 10 } = query;

    // Group CustomerOrders by restaurant, order by count DESC
    const popular = await this.prisma.customerOrder.groupBy({
      by: ['restaurantId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    });

    const restaurantIds = popular.map((p) => p.restaurantId);
    if (restaurantIds.length === 0) {
      // Fallback to nearby if no orders yet
      return this.findNearby(query);
    }

    const restaurants = await this.prisma.restaurant.findMany({
      where: {
        id: { in: restaurantIds },
        status: 'APPROVED',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        cuisineType: true,
        logoUrl: true,
        addressLine: true,
        city: true,
        isActive: true,
        status: true,
        latitude: true,
        longitude: true,
        deliveryRadiusKm: true,
        hours: {
          select: { dayOfWeek: true, openTime: true, closeTime: true, isClosed: true },
        },
      },
    });

    return restaurants
      .map((r) => {
        const distance =
          lat !== undefined && lng !== undefined && r.latitude && r.longitude
            ? haversineKm(lat, lng, r.latitude, r.longitude)
            : 0;
        return {
          id: r.id,
          name: r.name,
          cuisineType: r.cuisineType,
          logoUrl: r.logoUrl,
          coverImageUrl: null,
          addressLine: r.addressLine,
          city: r.city,
          isActive: r.isActive,
          isOpen: computeIsOpen(r.hours),
          status: r.status,
          distance,
          deliveryTimeMin: null,
          minOrderAmount: null,
        } satisfies NearbyRestaurant;
      })
      .filter((r) => {
        if (lat === undefined || lng === undefined) return true;
        const targetRadius = r.id ? (restaurants.find(rest => rest.id === r.id)?.deliveryRadiusKm ?? radius) : radius;
        return r.distance <= Math.min(radius, targetRadius);
      })
      // Preserve popularity order
      .sort((a, b) => {
        const aIdx = restaurantIds.indexOf(a.id);
        const bIdx = restaurantIds.indexOf(b.id);
        return aIdx - bIdx;
      });
  }

  // ── Trending (last 7 days) ───────────────────────────────────────────────────

  async getTrending(query: NearbyQueryDto): Promise<NearbyRestaurant[]> {
    const { latitude: lat, longitude: lng, radius = 10 } = query;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const trending = await this.prisma.customerOrder.groupBy({
      by: ['restaurantId'],
      where: { createdAt: { gte: sevenDaysAgo } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    });

    const restaurantIds = trending.map((p) => p.restaurantId);
    if (restaurantIds.length === 0) {
      return this.findNearby(query);
    }

    const restaurants = await this.prisma.restaurant.findMany({
      where: {
        id: { in: restaurantIds },
        status: 'APPROVED',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        cuisineType: true,
        logoUrl: true,
        addressLine: true,
        city: true,
        isActive: true,
        status: true,
        latitude: true,
        longitude: true,
        deliveryRadiusKm: true,
        hours: {
          select: { dayOfWeek: true, openTime: true, closeTime: true, isClosed: true },
        },
      },
    });

    return restaurants
      .map((r) => {
        const distance =
          lat !== undefined && lng !== undefined && r.latitude && r.longitude
            ? haversineKm(lat, lng, r.latitude, r.longitude)
            : 0;
        return {
          id: r.id,
          name: r.name,
          cuisineType: r.cuisineType,
          logoUrl: r.logoUrl,
          coverImageUrl: null,
          addressLine: r.addressLine,
          city: r.city,
          isActive: r.isActive,
          isOpen: computeIsOpen(r.hours),
          status: r.status,
          distance,
          deliveryTimeMin: null,
          minOrderAmount: null,
        } satisfies NearbyRestaurant;
      })
      .filter((r) => {
        if (lat === undefined || lng === undefined) return true;
        return r.distance <= radius;
      })
      .sort((a, b) => {
        const aIdx = restaurantIds.indexOf(a.id);
        const bIdx = restaurantIds.indexOf(b.id);
        return aIdx - bIdx;
      });
  }

  // ── Recently Ordered ─────────────────────────────────────────────────────────

  async getRecentlyOrdered(customerId: string): Promise<NearbyRestaurant[]> {
    // Get last 5 distinct restaurants this customer ordered from
    const recent = await this.prisma.customerOrder.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      select: { restaurantId: true },
      take: 50, // take more to get 5 distinct
    });

    const seenIds = new Set<string>();
    const distinctIds: string[] = [];
    for (const o of recent) {
      if (!seenIds.has(o.restaurantId)) {
        seenIds.add(o.restaurantId);
        distinctIds.push(o.restaurantId);
      }
      if (distinctIds.length === 5) break;
    }

    if (distinctIds.length === 0) return [];

    const restaurants = await this.prisma.restaurant.findMany({
      where: {
        id: { in: distinctIds },
        status: 'APPROVED',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        cuisineType: true,
        logoUrl: true,
        addressLine: true,
        city: true,
        isActive: true,
        status: true,
        latitude: true,
        longitude: true,
        hours: {
          select: { dayOfWeek: true, openTime: true, closeTime: true, isClosed: true },
        },
      },
    });

    return restaurants
      .map((r) => ({
        id: r.id,
        name: r.name,
        cuisineType: r.cuisineType,
        logoUrl: r.logoUrl,
        coverImageUrl: null,
        addressLine: r.addressLine,
        city: r.city,
        isActive: r.isActive,
        isOpen: computeIsOpen(r.hours),
        status: r.status,
        distance: 0,
        deliveryTimeMin: null,
        minOrderAmount: null,
      }))
      .sort((a, b) => distinctIds.indexOf(a.id) - distinctIds.indexOf(b.id));
  }

  // ── Internal Helpers ─────────────────────────────────────────────────────────

  private async buildHoursMap(
    restaurantIds: string[],
  ): Promise<Record<string, Array<{ dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean }>>> {
    if (restaurantIds.length === 0) return {};
    const hours = await this.prisma.restaurantHours.findMany({
      where: { restaurantId: { in: restaurantIds } },
    });
    const map: Record<string, Array<{ dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean }>> = {};
    for (const h of hours) {
      if (!map[h.restaurantId]) map[h.restaurantId] = [];
      map[h.restaurantId]!.push({
        dayOfWeek: h.dayOfWeek,
        openTime: h.openTime,
        closeTime: h.closeTime,
        isClosed: h.isClosed,
      });
    }
    return map;
  }
}

import {
  CouponType,
  MarkupType,
  OrderStatus,
  PrismaClient,
  RestaurantStatus,
  Role,
} from '@prisma/client';
import { hash } from 'argon2';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // ── Super-admin user ─────────────────────────────────────────────────────
  const email = process.env['SUPER_ADMIN_EMAIL'];
  const password = process.env['SUPER_ADMIN_PASSWORD'];

  if (!email || !password) {
    throw new Error('SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set');
  }

  const passwordHash = await hash(password);

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, fullName: 'Super Admin', role: Role.SUPER_ADMIN },
  });
  console.log(`Seed: super-admin upserted (${email})`);

  // ── Sample restaurants (fixed IDs for idempotency) ────────────────────────

  // 1. PENDING restaurant
  await prisma.restaurant.upsert({
    where: { id: 'seed-rest-pending-001' },
    update: {},
    create: {
      id: 'seed-rest-pending-001',
      name: 'Pizza Palace',
      description: 'Artisan wood-fired pizzas',
      addressLine: '42 Napoli Lane',
      city: 'Mumbai',
      phone: '+91-22-1234-5678',
      email: 'hello@pizzapalace.example',
      cuisineType: 'Italian',
      latitude: 19.076,
      longitude: 72.8777,
      status: RestaurantStatus.PENDING,
      isActive: false,
    },
  });

  // 2. APPROVED + active restaurant with full-week hours
  const approvedId = 'seed-rest-approved-001';
  await prisma.restaurant.upsert({
    where: { id: approvedId },
    update: {},
    create: {
      id: approvedId,
      name: 'Burger Barn',
      description: 'Classic smash-burgers and loaded fries',
      addressLine: '7 Grill Street',
      city: 'Bangalore',
      phone: '+91-80-9876-5432',
      email: 'contact@burgerbarn.example',
      cuisineType: 'American',
      latitude: 12.9716,
      longitude: 77.5946,
      status: RestaurantStatus.APPROVED,
      isActive: true,
    },
  });

  // Upsert one RestaurantHours row per day (0 = Sunday … 6 = Saturday)
  for (let day = 0; day <= 6; day++) {
    const isSunday = day === 0;
    await prisma.restaurantHours.upsert({
      where: { restaurantId_dayOfWeek: { restaurantId: approvedId, dayOfWeek: day } },
      update: {},
      create: {
        restaurantId: approvedId,
        dayOfWeek: day,
        openTime: isSunday ? '11:00' : '09:00',
        closeTime: '22:00',
        isClosed: false,
      },
    });
  }

  // 3. REJECTED restaurant
  await prisma.restaurant.upsert({
    where: { id: 'seed-rest-rejected-001' },
    update: {},
    create: {
      id: 'seed-rest-rejected-001',
      name: 'Sushi Spot',
      description: 'Fresh sushi and sashimi',
      addressLine: '15 Ocean Drive',
      city: 'Chennai',
      phone: '+91-44-5555-9999',
      cuisineType: 'Japanese',
      latitude: 13.0827,
      longitude: 80.2707,
      status: RestaurantStatus.REJECTED,
      isActive: false,
      rejectionReason: 'Food safety certificate missing — please reapply with valid documentation.',
    },
  });

  console.log('Seed: 3 sample restaurants upserted');

  // ── Platform pricing (singleton) ─────────────────────────────────────────
  await prisma.platformPricing.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      globalMarkupType: MarkupType.PERCENT,
      globalMarkupValue: 10,
      baseDeliveryFee: 30,
      surgeFee: 0,
      surgeEnabled: false,
    },
  });
  console.log('Seed: platform pricing upserted (10% markup, delivery 30, surge off)');

  // ── Platform settings (singleton) ────────────────────────────────────────
  await prisma.platformSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default' },
  });
  console.log('Seed: platform settings upserted');

  // ── Sample coupons ────────────────────────────────────────────────────────
  const now = new Date();
  const farFuture = new Date('2030-12-31T23:59:59.000Z');

  await prisma.coupon.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: {
      code: 'WELCOME10',
      description: '10% off, max discount 50',
      type: CouponType.PERCENT,
      value: 10,
      maxDiscount: 50,
      minOrderValue: 100,
      validFrom: now,
      validUntil: farFuture,
      isActive: true,
    },
  });

  await prisma.coupon.upsert({
    where: { code: 'FLAT50' },
    update: {},
    create: {
      code: 'FLAT50',
      description: 'Flat 50 off on orders above 300',
      type: CouponType.FLAT,
      value: 50,
      minOrderValue: 300,
      validFrom: now,
      validUntil: farFuture,
      isActive: true,
    },
  });
  console.log('Seed: 2 sample coupons upserted (WELCOME10, FLAT50)');

  // ── Burger Barn menu (needed for test orders) ─────────────────────────────
  const mainCategoryId = 'seed-cat-burgerbarn-main-001';
  await prisma.menuCategory.upsert({
    where: { id: mainCategoryId },
    update: {},
    create: {
      id: mainCategoryId,
      restaurantId: approvedId,
      name: 'Main Course',
      sortOrder: 1,
    },
  });

  const butterChickenId = 'seed-item-butter-chicken-001';
  await prisma.menuItem.upsert({
    where: { id: butterChickenId },
    update: {},
    create: {
      id: butterChickenId,
      restaurantId: approvedId,
      categoryId: mainCategoryId,
      name: 'Butter Chicken',
      description: 'Creamy tomato-based chicken curry',
      price: 320,
      isAvailable: true,
      sortOrder: 1,
    },
  });
  console.log('Seed: Burger Barn menu item upserted (Butter Chicken)');

  // ── Test orders ───────────────────────────────────────────────────────────
  const baseAcceptedAt = new Date('2026-06-07T10:05:00.000Z');
  const basePreparedAt = new Date('2026-06-07T10:20:00.000Z');

  // FH-TEST-001: PLACED — 2x Butter Chicken
  const order1 = await prisma.order.upsert({
    where: { orderNumber: 'FH-TEST-001' },
    update: {},
    create: {
      orderNumber: 'FH-TEST-001',
      restaurantId: approvedId,
      customerId: null,
      status: OrderStatus.PLACED,
      placedAt: new Date('2026-06-07T10:00:00.000Z'),
    },
  });
  if (order1.id) {
    const existing1 = await prisma.orderItem.count({ where: { orderId: order1.id } });
    if (existing1 === 0) {
      await prisma.orderItem.create({
        data: {
          orderId: order1.id,
          menuItemId: butterChickenId,
          name: 'Butter Chicken',
          price: 320,
          quantity: 2,
        },
      });
    }
  }

  // FH-TEST-002: ACCEPTED — 1x Butter Chicken
  const order2 = await prisma.order.upsert({
    where: { orderNumber: 'FH-TEST-002' },
    update: {},
    create: {
      orderNumber: 'FH-TEST-002',
      restaurantId: approvedId,
      customerId: null,
      status: OrderStatus.ACCEPTED,
      placedAt: new Date('2026-06-07T10:01:00.000Z'),
      acceptedAt: baseAcceptedAt,
    },
  });
  if (order2.id) {
    const existing2 = await prisma.orderItem.count({ where: { orderId: order2.id } });
    if (existing2 === 0) {
      await prisma.orderItem.create({
        data: {
          orderId: order2.id,
          menuItemId: butterChickenId,
          name: 'Butter Chicken',
          price: 320,
          quantity: 1,
        },
      });
    }
  }

  // FH-TEST-003: PREPARING — 2x Butter Chicken
  const order3 = await prisma.order.upsert({
    where: { orderNumber: 'FH-TEST-003' },
    update: {},
    create: {
      orderNumber: 'FH-TEST-003',
      restaurantId: approvedId,
      customerId: null,
      status: OrderStatus.PREPARING,
      placedAt: new Date('2026-06-07T10:02:00.000Z'),
      acceptedAt: baseAcceptedAt,
      preparedAt: basePreparedAt,
    },
  });
  if (order3.id) {
    const existing3 = await prisma.orderItem.count({ where: { orderId: order3.id } });
    if (existing3 === 0) {
      await prisma.orderItem.create({
        data: {
          orderId: order3.id,
          menuItemId: butterChickenId,
          name: 'Butter Chicken',
          price: 320,
          quantity: 2,
        },
      });
    }
  }

  console.log(
    'Seed: 3 test orders upserted (FH-TEST-001 PLACED, FH-TEST-002 ACCEPTED, FH-TEST-003 PREPARING)',
  );
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

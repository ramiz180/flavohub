import { MarkupType, PrismaClient, RestaurantStatus, Role } from '@prisma/client';
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
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

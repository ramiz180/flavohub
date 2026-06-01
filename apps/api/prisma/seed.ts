import { PrismaClient, Role } from '@prisma/client';
import { hash } from 'argon2';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = process.env['SUPER_ADMIN_EMAIL'];
  const password = process.env['SUPER_ADMIN_PASSWORD'];

  if (!email || !password) {
    throw new Error('SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set');
  }

  const passwordHash = await hash(password);

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      fullName: 'Super Admin',
      role: Role.SUPER_ADMIN,
    },
  });

  console.log(`Seed complete: super-admin upserted (${email})`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

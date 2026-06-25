import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  await prisma.restaurant.update({ where: { id: 'cmqchjrg50001ldxnpgh04228' }, data: { isActive: true } });
  console.log('Activated');
}
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

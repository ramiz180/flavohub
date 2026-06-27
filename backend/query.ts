import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const restaurants = await prisma.restaurant.findMany({
    include: {
      menuCategories: {
        include: { items: true }
      }
    }
  });
  console.log(JSON.stringify(restaurants, null, 2));
}
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

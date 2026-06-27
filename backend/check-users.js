const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true, isActive: true }
  });
  console.log('Users:', users);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());

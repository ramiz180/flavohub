const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Enabling PostGIS...");
  await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS postgis;');
  console.log("PostGIS enabled successfully!");
}

main().catch(console.error).finally(() => prisma.$disconnect());

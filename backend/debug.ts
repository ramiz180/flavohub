import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const lat = 12.9716;
  const lng = 77.5946;
  const radius = 10;
  
  const restaurants = await prisma.$queryRaw`
    SELECT
      r.id,
      r.name,
      r."isActive",
      r.status,
      (ST_Distance(r.location, ST_MakePoint(${lng}, ${lat})::geography) / 1000) AS distance
    FROM "Restaurant" r
    WHERE
      r.status = 'APPROVED'
      AND r."isActive" = true
      AND r.location IS NOT NULL
  `;
  
  console.log("All Approved & Active Restaurants and their distance from DEV_LAT/LNG:");
  console.log(restaurants);
}

main().catch(console.error).finally(() => prisma.$disconnect());

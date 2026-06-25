const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Setting up PostGIS triggers...");
  
  const tables = ['Restaurant', 'CustomerAddress', 'DeliveryTracking'];
  
  for (const table of tables) {
    console.log(`Setting up trigger for ${table}...`);
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION update_${table.toLowerCase()}_location()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_TABLE_NAME = 'CustomerAddress' THEN
          IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
            NEW.location = ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326);
          ELSE
            NEW.location = NULL;
          END IF;
        ELSE
          IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
            NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
          ELSE
            NEW.location = NULL;
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // We can drop the trigger first if it exists to be safe
    await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS trg_update_${table.toLowerCase()}_location ON "${table}";`);

    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER trg_update_${table.toLowerCase()}_location
      BEFORE INSERT OR UPDATE ON "${table}"
      FOR EACH ROW EXECUTE FUNCTION update_${table.toLowerCase()}_location();
    `);
  }
  
  // Update existing rows
  await prisma.$executeRawUnsafe(`
    UPDATE "Restaurant" SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND location IS NULL;
  `);
  await prisma.$executeRawUnsafe(`
    UPDATE "DeliveryTracking" SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND location IS NULL;
  `);
  await prisma.$executeRawUnsafe(`
    UPDATE "CustomerAddress" SET location = ST_SetSRID(ST_MakePoint(lng, lat), 4326)
    WHERE lat IS NOT NULL AND lng IS NOT NULL AND location IS NULL;
  `);

  console.log("Triggers setup successfully!");
}

main().catch(console.error).finally(() => prisma.$disconnect());

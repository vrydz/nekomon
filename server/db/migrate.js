import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { getPool, usePostgres } from "./pool.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function setupPostgis(pool) {
  try {
    await pool.query("CREATE EXTENSION IF NOT EXISTS postgis");
    await pool.query(`
      ALTER TABLE cat_catches
      ADD COLUMN IF NOT EXISTS location GEOGRAPHY(POINT, 4326)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_catches_location
      ON cat_catches USING GIST (location)
    `);
    await pool.query(`
      CREATE OR REPLACE FUNCTION sync_catch_location()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
          NEW.location := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await pool.query(`
      DROP TRIGGER IF EXISTS trg_sync_catch_location ON cat_catches
    `);
    await pool.query(`
      CREATE TRIGGER trg_sync_catch_location
      BEFORE INSERT OR UPDATE OF lat, lng ON cat_catches
      FOR EACH ROW EXECUTE FUNCTION sync_catch_location()
    `);
    console.log("PostGIS: enabled with spatial index");
  } catch (err) {
    console.warn("PostGIS: skipped (", err.message, ")");
  }
}

export async function migrate() {
  if (!usePostgres()) {
    console.log("Database: JSON file store (set DATABASE_URL for PostgreSQL)");
    return { backend: "json" };
  }

  const pool = getPool();
  const sql = readFileSync(join(__dirname, "init.sql"), "utf-8");
  await pool.query(sql);
  await setupPostgis(pool);

  console.log("Database: PostgreSQL migrated successfully");
  return { backend: "postgres" };
}

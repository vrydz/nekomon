import pg from "pg";

const { Pool } = pg;

let pool = null;

export function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
      max: 10,
    });
  }
  return pool;
}

export function usePostgres() {
  return Boolean(process.env.DATABASE_URL);
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

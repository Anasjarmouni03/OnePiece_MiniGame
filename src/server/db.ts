import { Pool } from 'pg';
import { attachDatabasePool } from '@vercel/functions';

const globalForDb = globalThis as unknown as { treasurePool?: Pool };

export function pool(): Pool {
  if (!globalForDb.treasurePool) {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!connectionString) throw new Error('Connect Neon to this Vercel project: DATABASE_URL is missing.');
    const dbPool = new Pool({
      connectionString,
      // Neon URLs include sslmode=require. Do not disable certificate verification.
      max: 3, idleTimeoutMillis: 5_000, connectionTimeoutMillis: 10_000,
    });
    dbPool.on('error', () => console.error('An idle database connection closed unexpectedly.'));
    attachDatabasePool(dbPool);
    globalForDb.treasurePool = dbPool;
  }
  return globalForDb.treasurePool;
}

export async function callFn<T>(fn: 'get_state' | 'start_game' | 'reset_game' | 'undo_last' | 'register_checkin', args: unknown[] = []): Promise<T> {
  const placeholders = args.map((_, index) => `$${index + 1}`).join(', ');
  const { rows } = await pool().query(`select public.${fn}(${placeholders}) as v`, args);
  return rows[0].v as T;
}

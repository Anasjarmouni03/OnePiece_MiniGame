import './env.mjs';
import pg from 'pg';
import { migrate } from './migrate.mjs';

export async function setupDatabase() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) throw new Error('DATABASE_URL is missing. Connect Neon to the Vercel project first.');
  const client = new pg.Client({ connectionString, connectionTimeoutMillis: 15_000 });
  try {
    await client.connect();
    await migrate(client);
    console.log('Database migrations applied; eight teams ready. Existing game data preserved.');
  } finally {
    await client.end();
  }
}

if (process.argv[1]?.endsWith('db-setup.mjs')) {
  try { await setupDatabase(); }
  catch (error) {
    // Provider errors may contain credentials; print only our own configuration/migration diagnostics.
    const safe = error instanceof Error && /^(DATABASE_URL|Applied migration|Team configuration)/.test(error.message);
    console.error(safe ? error.message : 'Database setup failed. Check the Neon connection, access, and migration SQL.');
    process.exitCode = 1;
  }
}

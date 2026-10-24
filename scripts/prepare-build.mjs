import './env.mjs';
import { setupDatabase } from './db-setup.mjs';
import { teams } from './migrate.mjs';

try {
  if (process.env.VERCEL) {
    if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) throw new Error('Connect Neon before deploying: DATABASE_URL is missing.');
    if ((process.env.SESSION_SECRET?.trim().length ?? 0) < 32) throw new Error('Set SESSION_SECRET to at least 32 random characters.');
    if (!/^\d{6,}$/.test(process.env.STAFF_PIN?.trim() ?? '')) throw new Error('Set STAFF_PIN to at least six digits.');
    const entries = (process.env.TEAM_PINS ?? '').split(',').filter(Boolean).map((entry) => entry.trim().split(':'));
    const pins = new Map(entries.map(([id, pin]) => [Number(id), pin?.trim()]));
    if (entries.length !== teams.length || pins.size !== teams.length || teams.some((team) => !/^\d{4}$/.test(pins.get(team.id) ?? ''))) {
      throw new Error('Set TEAM_PINS for all eight teams: 1:1234,2:5678,... (four digits each).');
    }
  }
  if (process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL_UNPOOLED) {
    await setupDatabase();
  } else {
    console.log('Local build without a database: checking compilation only. Vercel builds require Neon and application secrets.');
  }
} catch (error) {
  const safe = error instanceof Error && /^(Connect Neon|Set |Applied migration|Team configuration)/.test(error.message);
  console.error(safe ? error.message : 'Database setup failed. Check Neon access and migration SQL.');
  process.exitCode = 1;
}

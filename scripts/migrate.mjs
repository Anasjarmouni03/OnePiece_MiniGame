import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';

const migrationDirectory = new URL('../db/migrations/', import.meta.url);
export const teams = JSON.parse(readFileSync(new URL('../src/config/teams.json', import.meta.url), 'utf8'));

/** Both pg.Client and the isolated PostgreSQL test adapter implement query(). */
export async function migrate(client) {
  await client.query('begin');
  try {
    // Serializes preview/build jobs against the same database; released on commit/rollback.
    await client.query('select pg_advisory_xact_lock(831724665)');
    await client.query(`create table if not exists schema_migrations (
      version text primary key, checksum text not null, applied_at timestamptz not null default now()
    )`);
    for (const filename of readdirSync(migrationDirectory).filter((name) => name.endsWith('.sql')).sort()) {
      const sql = readFileSync(new URL(filename, migrationDirectory), 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      const { rows } = await client.query('select checksum from schema_migrations where version = $1', [filename]);
      if (rows.length) {
        if (rows[0].checksum !== checksum) throw new Error(`Applied migration ${filename} changed; add a new migration instead.`);
        continue;
      }
      await client.query(sql);
      await client.query('insert into schema_migrations (version, checksum) values ($1, $2)', [filename, checksum]);
    }
    const { rows: existing } = await client.query('select id, color_name, start_cp, offset_min, route from teams order by id');
    const { rows: active } = await client.query('select started_at from game where id = 1 for update');
    const { rows: counts } = await client.query('select count(*)::int as count from checkins');
    const changed = existing.length > 0 && (existing.length !== teams.length || teams.some((team) => {
      const old = existing.find((row) => row.id === team.id);
      return !old || old.color_name !== team.colorName || old.start_cp !== team.startCp ||
        old.offset_min !== team.offsetMin || JSON.stringify(old.route) !== JSON.stringify(team.route);
    }));
    if (changed && (active[0].started_at || counts[0].count > 0)) {
      throw new Error('Team configuration changed during an active game. Finish/reset the game before changing teams.');
    }
    for (const team of teams) {
      await client.query(`insert into teams (id, color_name, start_cp, offset_min, route) values ($1,$2,$3,$4,$5)
        on conflict (id) do update set color_name=excluded.color_name, start_cp=excluded.start_cp,
        offset_min=excluded.offset_min, route=excluded.route`,
      [team.id, team.colorName, team.startCp, team.offsetMin, team.route]);
    }
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  }
}

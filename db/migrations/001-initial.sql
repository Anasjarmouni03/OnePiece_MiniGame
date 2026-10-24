-- =====================================================================
--  Chasse au Trésor — database (Postgres / Neon)
--  Applied transactionally by scripts/migrate.mjs during the Vercel build.
--  Safe to re-run: it never deletes data. To erase the game, use « Réinitialiser » on /staff.
-- =====================================================================

create table if not exists game (
  id          int primary key default 1 check (id = 1),   -- a single row
  started_at  timestamptz
);
insert into game (id, started_at) values (1, null) on conflict (id) do nothing;

create table if not exists teams (
  id          int primary key,
  color_name  text not null,
  start_cp    int  not null check (start_cp between 1 and 5),
  offset_min  int  not null default 0,
  route       int[] not null check (array_length(route, 1) = 5)
);

create table if not exists checkins (
  id       uuid primary key default gen_random_uuid(),
  team_id  int  not null references teams(id),
  target   text not null check (target in ('1','2','3','4','5','SALLE')),
  step     int  not null check (step between 1 and 6),
  at       timestamptz not null default now(),
  source   text not null check (source in ('team','staff')),
  unique (team_id, step),     -- blocks double taps, even at the same millisecond
  unique (team_id, target)
);
create index if not exists checkins_at_idx on checkins (at);

-- ---------- Game rules (verified against src/lib/progress.ts in tests) ----------
-- Whole game state, in the exact JSON shape the React app expects (GameState).
create or replace function public.get_state()
returns jsonb
language sql stable
as $$
  select jsonb_build_object(
    'startedAt', (select started_at from game where id = 1),
    'checkins', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', c.id,
               'teamId', c.team_id,
               'target', case when c.target = 'SALLE' then to_jsonb('SALLE'::text) else to_jsonb(c.target::int) end,
               'step', c.step,
               'at', c.at,
               'source', c.source
             ) order by c.at, c.team_id, c.step)
      from checkins c), '[]'::jsonb)
  );
$$;

-- Validates and saves a check-in. Same rules as validateCheckin() in src/lib/progress.ts.
-- Returns {ok:true, checkin:{...}} or {ok:false, reason:'...'}.
create or replace function public.register_checkin(p_team int, p_target text, p_source text)
returns jsonb
language plpgsql
as $$
declare
  v_team     teams%rowtype;
  v_started  timestamptz;
  v_done     int;
  v_expected text;
  v_row      checkins%rowtype;
begin
  if p_source is null or p_target is null or p_source not in ('team', 'staff') or p_target not in ('1','2','3','4','5','SALLE') then
    return jsonb_build_object('ok', false, 'reason', 'wrong-checkpoint');
  end if;

  -- Serialize all mutations for this small game, including reset and undo.
  -- Always lock game first so concurrent operations cannot leave partial progress.
  select started_at into v_started from game where id = 1 for update;
  select * into v_team from teams where id = p_team;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'unknown-team');
  end if;

  if v_started is null then
    return jsonb_build_object('ok', false, 'reason', 'not-started');
  end if;

  select count(*) into v_done from checkins where team_id = p_team;
  v_expected := case
    when v_done < 5 then v_team.route[v_done + 1]::text
    when v_done = 5 then 'SALLE'
    else null
  end;

  if v_expected is null then
    return jsonb_build_object('ok', false, 'reason', 'finished');
  end if;
  if exists (select 1 from checkins where team_id = p_team and target = p_target) then
    return jsonb_build_object('ok', false, 'reason', 'duplicate');
  end if;
  if p_target = 'SALLE' and p_source <> 'staff' then
    return jsonb_build_object('ok', false, 'reason', 'salle-too-early');
  end if;
  if p_target <> v_expected then
    return jsonb_build_object('ok', false, 'reason',
      case when p_target = 'SALLE' then 'salle-too-early' else 'wrong-checkpoint' end);
  end if;

  insert into checkins (team_id, target, step, source)
  values (p_team, p_target, v_done + 1, p_source)
  returning * into v_row;

  return jsonb_build_object('ok', true, 'checkin', jsonb_build_object(
    'id', v_row.id,
    'teamId', v_row.team_id,
    'target', case when v_row.target = 'SALLE' then to_jsonb('SALLE'::text) else to_jsonb(v_row.target::int) end,
    'step', v_row.step,
    'at', v_row.at,
    'source', v_row.source
  ));
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'reason', 'duplicate');
end;
$$;

-- Starts the game clock (does nothing if already started).
create or replace function public.start_game()
returns jsonb
language plpgsql
as $$
begin
  update game set started_at = now() where id = 1 and started_at is null;
  return get_state();
end;
$$;

-- Removes the last validated step of a team (staff correction).
create or replace function public.undo_last(p_team int)
returns jsonb
language plpgsql
as $$
begin
  perform 1 from game where id = 1 for update;
  delete from checkins
  where id = (select id from checkins where team_id = p_team order by step desc limit 1);
  return get_state();
end;
$$;

-- Erases all check-ins and the start time (after testing).
create or replace function public.reset_game()
returns jsonb
language plpgsql
as $$
begin
  perform 1 from game where id = 1 for update;
  delete from checkins where true;
  update game set started_at = null where id = 1;
  return get_state();
end;
$$;

-- Login throttling persists across deployments and function instances.
create table if not exists auth_attempts (
  key text primary key,
  attempts int not null check (attempts > 0),
  expires_at timestamptz not null
);
create index if not exists auth_attempts_expiry_idx on auth_attempts (expires_at);

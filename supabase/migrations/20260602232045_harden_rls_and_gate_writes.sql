-- ════════════════════════════════════════════════════════════════════════
-- Harden RLS + gate all writes behind code-checked RPCs
-- ════════════════════════════════════════════════════════════════════════
--
-- WHY THIS FILE EXISTS
--   Before this migration teams/matches/tournament had permissive RLS
--   (FOR ALL USING(true) WITH CHECK(true)) granted to anon. Because the anon
--   key ships in the public JS bundle, anyone could read/insert/update/delete
--   every row via the REST API — the admin passphrase only gated the React UI,
--   not the data layer. Team access codes (teams.code) were world-readable too.
--
-- WHAT THIS DOES
--   1. Moves team access codes into a locked `team_codes` vault (R2) so the
--      code is a real secret — readable only through code/admin-gated RPCs.
--      (Supabase's docs recommend a dedicated table over column privileges.)
--   2. Makes teams/matches/tournament READ-ONLY for anon. Every write now goes
--      through a SECURITY DEFINER RPC that verifies a secret first — the same
--      pattern already used by set_tiebreak_decision / bulk_register_teams:
--        • player RPCs  → verify the acting team's own code
--        • admin RPCs   → verify_admin_code(admin_code)
--   3. Cleans up review findings: drops the dead public-signup register_team,
--      pins mutable search_paths, and revokes the auto-granted privileges on the
--      vault tables so they have no public grant at all (not merely RLS-denied).
--
-- NOTE ON ADVISORS
--   `get_advisors` will still report anon_security_definer_function_executable /
--   authenticated_... for every RPC below, and rls_enabled_no_policy for the two
--   vault tables. Both are intentional here: the RPCs MUST be reachable from the
--   public REST API (that's how the client calls them) and each gates on a secret
--   in its body; the vault tables are deliberately policy-less deny-all stores.
-- ════════════════════════════════════════════════════════════════════════

-- ─── 1. team_codes vault (R2) ─────────────────────────────────────────────
create table if not exists public.team_codes (
  team_id uuid primary key references public.teams(id) on delete cascade,
  code text not null unique
);

-- Carry existing codes across BEFORE dropping teams.code. Guarded so the migration
-- is idempotent: on a fresh build teams.code exists (copies nothing — teams is empty);
-- if ever re-applied to the already-migrated project the column is gone, so this skips
-- instead of erroring on a missing column.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'teams' and column_name = 'code'
  ) then
    insert into public.team_codes (team_id, code)
    select id, code from public.teams
    on conflict (team_id) do nothing;
  end if;
end $$;

alter table public.team_codes enable row level security;
-- no policies + no grants (see revoke at the bottom) → only SECURITY DEFINER
-- functions, which run as the table owner, can read/write it.

-- ─── 2. Code generation + registration now target the vault ───────────────
-- pgcrypto gives us a CSPRNG (gen_random_bytes); plain random() is not crypto-
-- safe. Supabase installs extensions into the dedicated `extensions` schema.
create extension if not exists pgcrypto with schema extensions;

-- search_path pinned (clears function_search_path_mutable); extensions added so
-- gen_random_bytes resolves. Internal helper — execute is revoked from PUBLIC
-- below; only bulk_register_teams calls it.
create or replace function public.generate_team_code(excluded_codes text[] default '{}')
returns text
language plpgsql
set search_path = public, extensions
as $$
declare
  candidate text;
  rand bytea;
  attempts integer := 0;
begin
  loop
    attempts := attempts + 1;
    -- 9 CSPRNG bytes per candidate: 2 bytes per letter (0–65535 % 26, ~0.04%
    -- modulo bias — negligible) + 3 bytes for the 000–999 suffix (% 1000).
    rand := gen_random_bytes(9);
    candidate :=
      chr(65 + (((get_byte(rand, 0) << 8) | get_byte(rand, 1)) % 26)) ||
      chr(65 + (((get_byte(rand, 2) << 8) | get_byte(rand, 3)) % 26)) ||
      chr(65 + (((get_byte(rand, 4) << 8) | get_byte(rand, 5)) % 26)) ||
      lpad((((get_byte(rand, 6) << 16) | (get_byte(rand, 7) << 8) | get_byte(rand, 8)) % 1000)::text, 3, '0');
    if not exists (select 1 from public.team_codes where code = candidate)
      and not candidate = any(excluded_codes)
    then
      return candidate;
    end if;
    if attempts >= 200 then
      raise exception 'CODE_GENERATION_FAILED';
    end if;
  end loop;
end;
$$;

-- Same signature + admin gate as before; now writes the code into the vault.
create or replace function public.bulk_register_teams(team_names text[], admin_code text)
returns table (id uuid, name text, code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_names text[];
  duplicate_name text;
  existing_name text;
  team_name text;
  new_code text;
  generated_codes text[] := '{}';
  new_team_id uuid;
begin
  if not public.verify_admin_code(admin_code) then
    raise exception 'INVALID_ADMIN_CODE';
  end if;

  select coalesce(array_agg(trimmed_name), '{}')
  into normalized_names
  from (
    select btrim(raw_name) as trimmed_name
    from unnest(team_names) as raw_name
    where btrim(raw_name) <> ''
  ) cleaned;

  if coalesce(array_length(normalized_names, 1), 0) = 0 then
    raise exception 'NO_TEAM_NAMES';
  end if;

  -- max(n) is an aggregate over each case-insensitive group, so it is valid to
  -- select alongside `group by lower(n)` (picks a representative original-case name).
  select max(n) into duplicate_name
  from unnest(normalized_names) as n
  group by lower(n)
  having count(*) > 1
  limit 1;
  if duplicate_name is not null then
    raise exception 'DUPLICATE_INPUT_NAME: %', duplicate_name;
  end if;

  select t.name into existing_name
  from public.teams t
  join unnest(normalized_names) as n on lower(btrim(t.name)) = lower(n)
  limit 1;
  if existing_name is not null then
    raise exception 'DUPLICATE_NAME: %', existing_name;
  end if;

  foreach team_name in array normalized_names loop
    new_code := public.generate_team_code(generated_codes);
    generated_codes := array_append(generated_codes, new_code);

    insert into public.teams as t (name) values (team_name)
      returning t.id into new_team_id;
    insert into public.team_codes (team_id, code) values (new_team_id, new_code);

    id := new_team_id;
    name := team_name;
    code := new_code;
    return next;
  end loop;
end;
$$;

-- Public self-signup was removed in the rebrand; register_team is dead.
drop function if exists public.register_team(text);

-- teams.code lives in the vault now. Dropping the column cascades the old
-- teams_code_unique_idx; the vault's own unique(code) replaces it.
alter table public.teams drop column if exists code;

revoke execute on function public.generate_team_code(text[]) from public;

-- ─── 3. Core tables: public READ only ─────────────────────────────────────
drop policy if exists "teams_public_all" on public.teams;
create policy "teams_public_read" on public.teams for select using (true);
revoke insert, update, delete on public.teams from anon, authenticated;

drop policy if exists "matches_public_all" on public.matches;
create policy "matches_public_read" on public.matches for select using (true);
revoke insert, update, delete on public.matches from anon, authenticated;

drop policy if exists "tournament_public_all" on public.tournament;
create policy "tournament_public_read" on public.tournament for select using (true);
revoke insert, update, delete on public.tournament from anon, authenticated;

-- Pin the last mutable search_path (clears function_search_path_mutable).
alter function public.set_tiebreak_decisions_updated_at() set search_path = public;

-- ─── 4. Player RPCs (gated by the acting team's own code) ──────────────────

-- Resolve a team from its code without exposing the code list.
create or replace function public.login_team(p_code text)
returns table (id uuid, name text, code text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select t.id, t.name, tc.code
  from public.team_codes tc
  join public.teams t on t.id = tc.team_id
  where tc.code = upper(btrim(p_code));
end;
$$;
grant execute on function public.login_team(text) to anon, authenticated;

-- HOME team (team1) reports an undecided match. Mirrors canHomeTeamReport:
-- winner hits 6 cups, loser hits p_loser_cups (0–5).
create or replace function public.report_match_result(
  p_match_id uuid,
  p_code text,
  p_we_are_winner boolean,
  p_loser_cups integer
)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
  v_match public.matches;
  v_winner uuid;
  v_loser uuid;
  v_s1 integer;
  v_s2 integer;
begin
  select team_id into v_team_id from public.team_codes where code = upper(btrim(p_code));
  if v_team_id is null then raise exception 'INVALID_CODE'; end if;

  select * into v_match from public.matches where id = p_match_id;
  if v_match.id is null then raise exception 'MATCH_NOT_FOUND'; end if;
  if v_match.team1_id <> v_team_id then raise exception 'NOT_HOME_TEAM'; end if;
  if v_match.winner_id is not null then raise exception 'ALREADY_REPORTED'; end if;
  if p_loser_cups < 0 or p_loser_cups > 5 then raise exception 'INVALID_SCORE'; end if;

  if p_we_are_winner then
    v_winner := v_team_id;        v_loser := v_match.team2_id;
  else
    v_winner := v_match.team2_id; v_loser := v_team_id;
  end if;

  if v_winner = v_match.team1_id then
    v_s1 := 6;            v_s2 := p_loser_cups;
  else
    v_s1 := p_loser_cups; v_s2 := 6;
  end if;

  update public.matches
    set winner_id = v_winner, loser_id = v_loser,
        score_team1 = v_s1, score_team2 = v_s2, reported_by = v_team_id
    where id = p_match_id and team1_id = v_team_id and winner_id is null
    returning * into v_match;
  if v_match.id is null then raise exception 'ALREADY_REPORTED'; end if;
  return v_match;
end;
$$;
grant execute on function public.report_match_result(uuid, text, boolean, integer) to anon, authenticated;

-- AWAY team (team2) confirms or disputes a reported result.
-- Mirrors canAwayTeamConfirm + handleConfirm/handleDispute.
create or replace function public.respond_match_result(
  p_match_id uuid,
  p_code text,
  p_action text
)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
  v_match public.matches;
begin
  if p_action not in ('confirm', 'dispute') then raise exception 'INVALID_ACTION'; end if;

  select team_id into v_team_id from public.team_codes where code = upper(btrim(p_code));
  if v_team_id is null then raise exception 'INVALID_CODE'; end if;

  select * into v_match from public.matches where id = p_match_id;
  if v_match.id is null then raise exception 'MATCH_NOT_FOUND'; end if;
  if v_match.team2_id <> v_team_id then raise exception 'NOT_AWAY_TEAM'; end if;
  if v_match.winner_id is null or v_match.confirmed
     or v_match.reported_by is null or v_match.reported_by <> v_match.team1_id then
    raise exception 'CANNOT_RESPOND';
  end if;

  if p_action = 'confirm' then
    update public.matches set confirmed = true, confirmed_by = 'away'
      where id = p_match_id and team2_id = v_team_id and confirmed = false
      returning * into v_match;
  else
    update public.matches set confirmed_by = 'disputed'
      where id = p_match_id and team2_id = v_team_id and confirmed = false
      returning * into v_match;
  end if;
  return v_match;
end;
$$;
grant execute on function public.respond_match_result(uuid, text, text) to anon, authenticated;

-- A team edits its own player names.
create or replace function public.update_team_profile(
  p_code text,
  p_player1 text,
  p_player2 text
)
returns public.teams
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
  v_team public.teams;
begin
  select team_id into v_team_id from public.team_codes where code = upper(btrim(p_code));
  if v_team_id is null then raise exception 'INVALID_CODE'; end if;

  update public.teams
    set player1 = nullif(btrim(coalesce(p_player1, '')), ''),
        player2 = nullif(btrim(coalesce(p_player2, '')), '')
    where id = v_team_id
    returning * into v_team;
  return v_team;
end;
$$;
grant execute on function public.update_team_profile(text, text, text) to anon, authenticated;

-- ─── 5. Admin RPCs (gated by verify_admin_code) ───────────────────────────

-- The hand-out screen: read teams WITH codes via the admin gate (the admin panel
-- uses the anon key and so cannot read the vault directly).
create or replace function public.admin_list_teams(admin_code text)
returns table (
  id uuid, code text, name text, player1 text, player2 text,
  wins integer, losses integer, checked_in boolean, created_at timestamptz
)
language plpgsql security definer set search_path = public as $$
begin
  if not public.verify_admin_code(admin_code) then raise exception 'INVALID_ADMIN_CODE'; end if;
  return query
  select t.id, tc.code, t.name, t.player1, t.player2, t.wins, t.losses, t.checked_in, t.created_at
  from public.teams t
  left join public.team_codes tc on tc.team_id = t.id
  order by t.created_at;
end;
$$;
grant execute on function public.admin_list_teams(text) to anon, authenticated;

-- Upsert the single tournament row (start / advance / knockout / finish / reset).
-- Only non-null args are applied.
create or replace function public.admin_set_tournament(
  admin_code text,
  p_current_round integer default null,
  p_total_rounds integer default null,
  p_table_count integer default null,
  p_status text default null
)
returns public.tournament
language plpgsql security definer set search_path = public as $$
declare v_row public.tournament;
begin
  if not public.verify_admin_code(admin_code) then raise exception 'INVALID_ADMIN_CODE'; end if;
  select * into v_row from public.tournament limit 1;
  if v_row.id is null then
    insert into public.tournament (current_round, total_rounds, table_count, status)
    values (coalesce(p_current_round, 0), coalesce(p_total_rounds, 7),
            coalesce(p_table_count, 16), coalesce(p_status, 'not_started'))
    returning * into v_row;
  else
    update public.tournament set
      current_round = coalesce(p_current_round, current_round),
      total_rounds  = coalesce(p_total_rounds, total_rounds),
      table_count   = coalesce(p_table_count, table_count),
      status        = coalesce(p_status, status)
    where id = v_row.id
    returning * into v_row;
  end if;
  return v_row;
end;
$$;
grant execute on function public.admin_set_tournament(text, integer, integer, integer, text) to anon, authenticated;

-- Bulk-insert generated pairings (swiss / QF / SF / final).
create or replace function public.admin_create_matches(admin_code text, rows jsonb)
returns setof public.matches
language plpgsql security definer set search_path = public as $$
begin
  if not public.verify_admin_code(admin_code) then raise exception 'INVALID_ADMIN_CODE'; end if;
  return query
  insert into public.matches (round, wave, team1_id, team2_id, table_number, scheduled_time)
  select
    (r->>'round')::integer,
    coalesce((r->>'wave')::integer, 1),
    (r->>'team1_id')::uuid,
    (r->>'team2_id')::uuid,
    nullif(r->>'table_number', '')::integer,
    nullif(r->>'scheduled_time', '')
  from jsonb_array_elements(rows) as r
  returning *;
end;
$$;
grant execute on function public.admin_create_matches(text, jsonb) to anon, authenticated;

-- Admin override / disputed-match resolution.
create or replace function public.admin_set_match_result(
  admin_code text, p_match_id uuid, p_winner_id uuid, p_loser_id uuid,
  p_score_team1 integer, p_score_team2 integer
)
returns public.matches
language plpgsql security definer set search_path = public as $$
declare v public.matches;
begin
  if not public.verify_admin_code(admin_code) then raise exception 'INVALID_ADMIN_CODE'; end if;
  update public.matches set
    winner_id = p_winner_id, loser_id = p_loser_id,
    score_team1 = p_score_team1, score_team2 = p_score_team2,
    confirmed = true, confirmed_by = 'admin'
  where id = p_match_id
  returning * into v;
  if v.id is null then raise exception 'MATCH_NOT_FOUND'; end if;
  return v;
end;
$$;
grant execute on function public.admin_set_match_result(text, uuid, uuid, uuid, integer, integer) to anon, authenticated;

-- Edit a team's name / player names.
create or replace function public.admin_update_team(
  admin_code text, p_team_id uuid, p_name text, p_player1 text, p_player2 text
)
returns public.teams
language plpgsql security definer set search_path = public as $$
declare v public.teams;
begin
  if not public.verify_admin_code(admin_code) then raise exception 'INVALID_ADMIN_CODE'; end if;
  update public.teams set
    name    = coalesce(nullif(btrim(coalesce(p_name, '')), ''), name),
    player1 = nullif(btrim(coalesce(p_player1, '')), ''),
    player2 = nullif(btrim(coalesce(p_player2, '')), '')
  where id = p_team_id
  returning * into v;
  if v.id is null then raise exception 'TEAM_NOT_FOUND'; end if;
  return v;
end;
$$;
grant execute on function public.admin_update_team(text, uuid, text, text, text) to anon, authenticated;

-- Toggle one team's check-in, or all (p_team_id omitted / null = all).
create or replace function public.admin_set_checkin(
  admin_code text, p_value boolean, p_team_id uuid default null
)
returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not public.verify_admin_code(admin_code) then raise exception 'INVALID_ADMIN_CODE'; end if;
  if p_team_id is null then
    update public.teams set checked_in = p_value;
  else
    update public.teams set checked_in = p_value where id = p_team_id;
  end if;
  get diagnostics n = row_count;
  return n;
end;
$$;
grant execute on function public.admin_set_checkin(text, boolean, uuid) to anon, authenticated;

create or replace function public.admin_delete_team(admin_code text, p_team_id uuid)
returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not public.verify_admin_code(admin_code) then raise exception 'INVALID_ADMIN_CODE'; end if;
  delete from public.teams where id = p_team_id;
  get diagnostics n = row_count;
  return n;
end;
$$;
grant execute on function public.admin_delete_team(text, uuid) to anon, authenticated;

create or replace function public.admin_delete_unchecked(admin_code text)
returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not public.verify_admin_code(admin_code) then raise exception 'INVALID_ADMIN_CODE'; end if;
  delete from public.teams where checked_in = false;
  get diagnostics n = row_count;
  return n;
end;
$$;
grant execute on function public.admin_delete_unchecked(text) to anon, authenticated;

-- Danger Zone: full reset (wipe matches, reset tournament + team records).
create or replace function public.admin_reset_tournament(admin_code text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.verify_admin_code(admin_code) then raise exception 'INVALID_ADMIN_CODE'; end if;
  delete from public.matches;
  update public.tournament set current_round = 0, status = 'not_started';
  update public.teams set wins = 0, losses = 0;
end;
$$;
grant execute on function public.admin_reset_tournament(text) to anon, authenticated;

create or replace function public.admin_clear_round(admin_code text, p_round integer)
returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not public.verify_admin_code(admin_code) then raise exception 'INVALID_ADMIN_CODE'; end if;
  delete from public.matches where round = p_round;
  get diagnostics n = row_count;
  return n;
end;
$$;
grant execute on function public.admin_clear_round(text, integer) to anon, authenticated;

-- ─── 6. Lock the vault tables: no public grant at all ─────────────────────
-- Supabase default privileges auto-grant SELECT to anon/authenticated on new
-- public tables. Strip them so the code/passphrase stores have NO public grant
-- (defense in depth — not merely RLS-denied). Only the SECURITY DEFINER
-- functions above (running as the owner) can reach them.
revoke all on public.team_codes from anon, authenticated, public;
revoke all on public.app_config from anon, authenticated, public;

-- Persisted admin tiebreak decision for unresolved cutoff ties.
create table if not exists public.tiebreak_decisions (
  id uuid primary key default gen_random_uuid(),
  cutoff integer not null,
  team1_id uuid not null references public.teams(id) on delete cascade,
  team2_id uuid not null references public.teams(id) on delete cascade,
  winner_team_id uuid not null references public.teams(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tiebreak_team_order_check check (team1_id < team2_id),
  constraint tiebreak_winner_check check (winner_team_id = team1_id or winner_team_id = team2_id),
  constraint tiebreak_cutoff_positive check (cutoff > 0),
  unique (cutoff, team1_id, team2_id)
);

create index if not exists tiebreak_decisions_cutoff_idx
  on public.tiebreak_decisions (cutoff);

create or replace function public.set_tiebreak_decisions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_tiebreak_decisions_updated_at on public.tiebreak_decisions;
create trigger trg_tiebreak_decisions_updated_at
before update on public.tiebreak_decisions
for each row execute function public.set_tiebreak_decisions_updated_at();

alter table public.tiebreak_decisions enable row level security;

-- Public (anon) may READ tiebreak decisions — the scoreboard and admin panel
-- display them.
drop policy if exists "Public can read tiebreak decisions" on public.tiebreak_decisions;
create policy "Public can read tiebreak decisions"
on public.tiebreak_decisions
for select
using (true);

-- WRITES ARE ADMIN-GATED (issue #18). These rows decide who makes Top 8, so they
-- must NOT be writable with the public anon key. All writes go through
-- set_tiebreak_decision() below (SECURITY DEFINER, verifies the admin code),
-- mirroring bulk_register_teams. The previous permissive "Public can insert/update"
-- policies are intentionally removed — with RLS on and no INSERT/UPDATE policy,
-- direct writes from the anon/authenticated keys are denied.
drop policy if exists "Public can insert tiebreak decisions" on public.tiebreak_decisions;
drop policy if exists "Public can update tiebreak decisions" on public.tiebreak_decisions;

-- Admin-gated upsert. Mirrors the existing frontend upsert exactly:
-- conflict target (cutoff, team1_id, team2_id) → overwrite winner_team_id.
-- Callers must pass team ids already ordered team1_id < team2_id (enforced by the
-- table's tiebreak_team_order_check constraint).
create or replace function public.set_tiebreak_decision(
  p_cutoff integer,
  p_team1_id uuid,
  p_team2_id uuid,
  p_winner_team_id uuid,
  admin_code text
)
returns public.tiebreak_decisions
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.tiebreak_decisions;
begin
  if not public.verify_admin_code(admin_code) then
    raise exception 'INVALID_ADMIN_CODE';
  end if;

  insert into public.tiebreak_decisions as td (cutoff, team1_id, team2_id, winner_team_id)
  values (p_cutoff, p_team1_id, p_team2_id, p_winner_team_id)
  on conflict (cutoff, team1_id, team2_id)
  do update set winner_team_id = excluded.winner_team_id
  returning td.* into result;

  return result;
end;
$$;

grant execute on function public.set_tiebreak_decision(integer, uuid, uuid, uuid, text)
  to anon, authenticated;

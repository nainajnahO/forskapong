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

drop policy if exists "Public can read tiebreak decisions" on public.tiebreak_decisions;
create policy "Public can read tiebreak decisions"
on public.tiebreak_decisions
for select
using (true);

drop policy if exists "Public can insert tiebreak decisions" on public.tiebreak_decisions;
create policy "Public can insert tiebreak decisions"
on public.tiebreak_decisions
for insert
with check (true);

drop policy if exists "Public can update tiebreak decisions" on public.tiebreak_decisions;
create policy "Public can update tiebreak decisions"
on public.tiebreak_decisions
for update
using (true)
with check (true);

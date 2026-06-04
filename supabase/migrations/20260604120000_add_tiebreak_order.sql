-- N-way tiebreak ordering for unresolved cutoff ties (issues #24, #27).
--
-- tiebreak_decisions (20260406180000) only encodes a single 2-team pair, so a
-- 3+-team tie at the Top-8 cutoff had no in-UI resolution path and hard-blocked
-- knockout generation. This table stores a full explicit ordering for an
-- arbitrary tied group: one row per (cutoff, team), with rank 1..N giving the
-- admin-chosen order. It generalizes — and supersedes in the frontend — the
-- pairwise set_tiebreak_decision flow (a 2-team tie is just N=2). The old table
-- and RPC are left in place (harmless, already deployed); dropping them is a
-- post-event cleanup.
create table if not exists public.tiebreak_order (
  cutoff integer not null,
  team_id uuid not null references public.teams(id) on delete cascade,
  rank integer not null,
  created_at timestamptz not null default now(),
  primary key (cutoff, team_id),
  constraint tiebreak_order_cutoff_positive check (cutoff > 0),
  constraint tiebreak_order_rank_positive check (rank > 0),
  -- No two teams may share a rank within the same cutoff group.
  unique (cutoff, rank)
);

alter table public.tiebreak_order enable row level security;

-- Public (anon) may READ the ordering — the admin panel renders it to confirm
-- the resolved order before generating the bracket.
drop policy if exists "Public can read tiebreak order" on public.tiebreak_order;
create policy "Public can read tiebreak order"
on public.tiebreak_order
for select
using (true);

-- WRITES ARE ADMIN-GATED. These rows decide who makes Top 8 and their seeds, so
-- they must NOT be writable with the public anon key. With RLS on and no
-- INSERT/UPDATE/DELETE policy, direct writes from the anon/authenticated keys
-- are denied; all writes go through set_tiebreak_order() below (SECURITY
-- DEFINER, verifies the admin code). This mirrors the RLS-deny posture of the
-- sibling tiebreak_decisions table (issue #18).

-- Admin-gated, clear-and-rewrite ordering. Replaces the cutoff's entire group in
-- one transaction: deletes any prior order for that cutoff, then re-inserts the
-- teams in the order given by p_team_ids (rank = array position, 1..N). The
-- clear-on-rewrite is what makes reordering safe — there can never be a stale
-- row contradicting the current order. Passing an empty array clears the order.
create or replace function public.set_tiebreak_order(
  p_cutoff integer,
  p_team_ids uuid[],
  admin_code text
)
returns setof public.tiebreak_order
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.verify_admin_code(admin_code) then
    raise exception 'INVALID_ADMIN_CODE';
  end if;

  delete from public.tiebreak_order where cutoff = p_cutoff;

  return query
  insert into public.tiebreak_order (cutoff, team_id, rank)
  select p_cutoff, t.team_id, t.ord
  from unnest(p_team_ids) with ordinality as t(team_id, ord)
  returning tiebreak_order.*;
end;
$$;

grant execute on function public.set_tiebreak_order(integer, uuid[], text)
  to anon, authenticated;

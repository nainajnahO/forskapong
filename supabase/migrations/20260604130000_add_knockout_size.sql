-- Make the knockout bracket size configurable (follow-up to the dynamic
-- knockout-start-round work). Previously the playoff was hardcoded to the top 8.
-- knockout_size is the number of teams that advance from the Swiss stage into a
-- single-elimination bracket; it must be a power of 2 (2/4/8/16/32…) so the
-- bracket has no first-round byes. Defaults to 8 — the size the 2026-06-06 event
-- runs — so existing rows and the live event are unaffected.

alter table public.tournament
  add column if not exists knockout_size integer not null default 8;

-- Enforce the power-of-2 invariant at the DB level (n & (n-1) = 0, n >= 2).
alter table public.tournament
  drop constraint if exists tournament_knockout_size_pow2;
alter table public.tournament
  add constraint tournament_knockout_size_pow2
  check (knockout_size >= 2 and (knockout_size & (knockout_size - 1)) = 0);

-- admin_set_tournament gains p_knockout_size. Adding a parameter changes the
-- function signature, so drop the old overload before recreating it.
drop function if exists public.admin_set_tournament(text, integer, integer, integer, text);

create or replace function public.admin_set_tournament(
  admin_code text,
  p_current_round integer default null,
  p_total_rounds integer default null,
  p_table_count integer default null,
  p_status text default null,
  p_knockout_size integer default null
)
returns public.tournament
language plpgsql security definer set search_path = public as $$
declare v_row public.tournament;
begin
  if not public.verify_admin_code(admin_code) then raise exception 'INVALID_ADMIN_CODE'; end if;
  select * into v_row from public.tournament limit 1;
  if v_row.id is null then
    insert into public.tournament (current_round, total_rounds, table_count, status, knockout_size)
    values (coalesce(p_current_round, 0), coalesce(p_total_rounds, 7),
            coalesce(p_table_count, 16), coalesce(p_status, 'not_started'),
            coalesce(p_knockout_size, 8))
    returning * into v_row;
  else
    update public.tournament set
      current_round = coalesce(p_current_round, current_round),
      total_rounds  = coalesce(p_total_rounds, total_rounds),
      table_count   = coalesce(p_table_count, table_count),
      status        = coalesce(p_status, status),
      knockout_size = coalesce(p_knockout_size, knockout_size)
    where id = v_row.id
    returning * into v_row;
  end if;
  return v_row;
end;
$$;
grant execute on function public.admin_set_tournament(text, integer, integer, integer, text, integer) to anon, authenticated;

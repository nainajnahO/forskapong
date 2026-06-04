-- Make a single match's length configurable so each wave (spelpass) gets its own
-- planned start time instead of every wave sharing the round's start time.
-- match_duration_minutes is play time + headroom for one match (e.g. 7 + 3 = 10).
-- Wave start = round start + (wave - 1) * match_duration_minutes, baked into each
-- match's scheduled_time at generation. Defaults to 10 so existing rows and the
-- live event keep working unchanged.

alter table public.tournament
  add column if not exists match_duration_minutes integer not null default 10;

-- A match can't take a non-positive number of minutes.
alter table public.tournament
  drop constraint if exists tournament_match_duration_positive;
alter table public.tournament
  add constraint tournament_match_duration_positive
  check (match_duration_minutes >= 1);

-- admin_set_tournament gains p_match_duration_minutes. Adding a parameter changes
-- the function signature, so drop the old overload before recreating it.
drop function if exists public.admin_set_tournament(text, integer, integer, integer, text, integer);

create or replace function public.admin_set_tournament(
  admin_code text,
  p_current_round integer default null,
  p_total_rounds integer default null,
  p_table_count integer default null,
  p_status text default null,
  p_knockout_size integer default null,
  p_match_duration_minutes integer default null
)
returns public.tournament
language plpgsql security definer set search_path = public as $$
declare v_row public.tournament;
begin
  if not public.verify_admin_code(admin_code) then raise exception 'INVALID_ADMIN_CODE'; end if;
  select * into v_row from public.tournament limit 1;
  if v_row.id is null then
    insert into public.tournament (current_round, total_rounds, table_count, status, knockout_size, match_duration_minutes)
    values (coalesce(p_current_round, 0), coalesce(p_total_rounds, 7),
            coalesce(p_table_count, 16), coalesce(p_status, 'not_started'),
            coalesce(p_knockout_size, 8), coalesce(p_match_duration_minutes, 10))
    returning * into v_row;
  else
    update public.tournament set
      current_round = coalesce(p_current_round, current_round),
      total_rounds  = coalesce(p_total_rounds, total_rounds),
      table_count   = coalesce(p_table_count, table_count),
      status        = coalesce(p_status, status),
      knockout_size = coalesce(p_knockout_size, knockout_size),
      match_duration_minutes = coalesce(p_match_duration_minutes, match_duration_minutes)
    where id = v_row.id
    returning * into v_row;
  end if;
  return v_row;
end;
$$;
grant execute on function public.admin_set_tournament(text, integer, integer, integer, text, integer, integer) to anon, authenticated;

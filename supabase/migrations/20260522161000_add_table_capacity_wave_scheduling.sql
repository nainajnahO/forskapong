-- Add table-capacity aware scheduling metadata.

alter table public.tournament
  add column if not exists table_count integer not null default 16;

alter table public.tournament
  drop constraint if exists tournament_table_count_positive;

alter table public.tournament
  add constraint tournament_table_count_positive check (table_count > 0);

alter table public.matches
  add column if not exists wave integer not null default 1;

alter table public.matches
  drop constraint if exists matches_wave_positive;

alter table public.matches
  add constraint matches_wave_positive check (wave > 0);

create index if not exists matches_round_wave_table_idx
  on public.matches (round, wave, table_number);

create unique index if not exists matches_round_wave_table_unique_idx
  on public.matches (round, wave, table_number)
  where table_number is not null;

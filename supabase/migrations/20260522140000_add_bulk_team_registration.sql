-- Admin-only bulk team registration.
-- Keeps team access codes in the existing ABC123 format while removing public self-signup.

create unique index if not exists teams_code_unique_idx
  on public.teams (code);

create unique index if not exists teams_name_ci_unique_idx
  on public.teams (lower(btrim(name)));

create or replace function public.generate_team_code(excluded_codes text[] default '{}')
returns text
language plpgsql
as $$
declare
  candidate text;
  attempts integer := 0;
begin
  loop
    attempts := attempts + 1;
    candidate :=
      chr(65 + floor(random() * 26)::integer) ||
      chr(65 + floor(random() * 26)::integer) ||
      chr(65 + floor(random() * 26)::integer) ||
      lpad(floor(random() * 1000)::integer::text, 3, '0');

    if not exists (select 1 from public.teams where code = candidate)
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

  select n
  into duplicate_name
  from unnest(normalized_names) as n
  group by lower(n)
  having count(*) > 1
  limit 1;

  if duplicate_name is not null then
    raise exception 'DUPLICATE_INPUT_NAME: %', duplicate_name;
  end if;

  select t.name
  into existing_name
  from public.teams t
  join unnest(normalized_names) as n on lower(btrim(t.name)) = lower(n)
  limit 1;

  if existing_name is not null then
    raise exception 'DUPLICATE_NAME: %', existing_name;
  end if;

  foreach team_name in array normalized_names loop
    new_code := public.generate_team_code(generated_codes);
    generated_codes := array_append(generated_codes, new_code);

    return query
      insert into public.teams as inserted_team (name, code)
      values (team_name, new_code)
      returning inserted_team.id, inserted_team.name::text, inserted_team.code::text;
  end loop;
end;
$$;

grant execute on function public.bulk_register_teams(text[], text) to anon, authenticated;

revoke execute on function public.register_team(text) from anon, authenticated;

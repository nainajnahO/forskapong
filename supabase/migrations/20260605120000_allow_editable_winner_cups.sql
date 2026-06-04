-- ════════════════════════════════════════════════════════════════════════
-- Let the reporter enter the winner's cups too (not just the loser's)
-- ════════════════════════════════════════════════════════════════════════
--
-- WHY
--   The original report_match_result pinned the winner to 6 cups and only let the
--   loser vary (0–5), so a player could never report a win like 4–2 — yet the admin
--   editor (admin_set_match_result) already accepts any two scores 0–6 with the higher
--   as the winner. This removes that asymmetry for the player report flow.
--
-- WHAT
--   Replaces report_match_result with a 5-arg version that takes BOTH cup counts.
--   The home team still declares who won (p_we_are_winner); the only score rule is
--   that the declared winner must have strictly more cups than the loser. Cups are
--   bounded 0–6 (the rack size, matching the admin editor's max). Ties are rejected
--   because Swiss/knockout matches always resolve to a winner.
--
--   Knock-on: cup difference (cupsFor − cupsAgainst) is the rankings' #2 tiebreaker
--   and defines the Top-8 tie groups, so truer margins now flow into standings — by
--   design, not a regression.
-- ════════════════════════════════════════════════════════════════════════

-- Old signature is superseded; drop it so only the 5-arg version remains.
drop function if exists public.report_match_result(uuid, text, boolean, integer);

-- HOME team (team1) reports an undecided match. Mirrors canHomeTeamReport.
-- Both teams' cups are entered (0–6); the declared winner must have strictly more.
create or replace function public.report_match_result(
  p_match_id uuid,
  p_code text,
  p_we_are_winner boolean,
  p_winner_cups integer,
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
  if p_winner_cups < 0 or p_winner_cups > 6
     or p_loser_cups < 0 or p_loser_cups > 6
     or p_winner_cups <= p_loser_cups then
    raise exception 'INVALID_SCORE';
  end if;

  if p_we_are_winner then
    v_winner := v_team_id;        v_loser := v_match.team2_id;
  else
    v_winner := v_match.team2_id; v_loser := v_team_id;
  end if;

  if v_winner = v_match.team1_id then
    v_s1 := p_winner_cups; v_s2 := p_loser_cups;
  else
    v_s1 := p_loser_cups;  v_s2 := p_winner_cups;
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
grant execute on function public.report_match_result(uuid, text, boolean, integer, integer) to anon, authenticated;

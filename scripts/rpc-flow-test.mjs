/**
 * Throwaway live-DB RPC flow test (Part 2).
 *
 * ⚠️  WRITES TO THE LIVE PROJECT in `.env` (VITE_SUPABASE_URL) — i.e. PRODUCTION.
 *     It creates a tiny 4-team / 2-round slice and runs dispute scenarios, then
 *     calls admin_reset_tournament to restore a clean baseline. Only run against a
 *     project whose data you can safely mutate, during a quiet window. Requires
 *     ADMIN_CODE + T1..T4 id/code env vars, so it cannot run by accident.
 *
 * Drives the REAL Supabase RPCs through the anon key — the exact path the browser
 * uses — to exercise the SQL-only logic that pure in-process tests can't reach:
 *   • anon write-gateway (direct table writes must be rejected by RLS)
 *   • admin-code gating (wrong code → INVALID_ADMIN_CODE)
 *   • report → confirm happy path
 *   • report → dispute → admin override
 *   • score validation (winner>loser, 0..6, sub-6 winning score allowed)
 *   • home/away permission rules
 *
 * Operates on a tiny 4-team / 2-round slice (no roster changes), then resets.
 * Secrets (admin code, team codes) come from env vars — never hardcoded.
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

/* ── env / client ── */
const envText = readFileSync(new URL('../.env', import.meta.url), 'utf8');
const env = {};
for (const line of envText.split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const eq = t.indexOf('=');
  if (eq === -1) continue;
  const k = t.slice(0, eq).trim();
  if (!(k in env)) env[k] = t.slice(eq + 1).trim();
}
const URL_ = env.VITE_SUPABASE_URL;
const ANON = env.VITE_SUPABASE_ANON_KEY;
const ADMIN = process.env.ADMIN_CODE;
const T1 = { id: process.env.T1_ID, code: process.env.T1_CODE, name: 'home1' };
const T2 = { id: process.env.T2_ID, code: process.env.T2_CODE, name: 'away1' };
const T3 = { id: process.env.T3_ID, code: process.env.T3_CODE, name: 'home2' };
const T4 = { id: process.env.T4_ID, code: process.env.T4_CODE, name: 'away2' };
if (!URL_ || !ANON || !ADMIN || !T1.code || !T4.code) {
  console.error('Missing env (URL/ANON/ADMIN/team codes)');
  process.exit(2);
}
const sb = createClient(URL_, ANON);

/* ── assertion helpers ── */
let pass = 0;
const failures = [];
function ok(label, cond, detail = '') {
  if (cond) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    failures.push(`${label} ${detail}`);
    console.log(`  ✗ ${label} ${detail}`);
  }
}
const errMsg = (e) => (e ? e.message || JSON.stringify(e) : '');
function expectErr(label, res, codeSubstr) {
  const m = errMsg(res.error);
  ok(label, !!res.error && m.includes(codeSubstr), `→ got error="${m || 'none'}" data=${JSON.stringify(res.data)}`);
}
function expectOk(label, res) {
  ok(label, !res.error, `→ unexpected error="${errMsg(res.error)}"`);
}

const rpc = (fn, args) => sb.rpc(fn, args);
async function getMatch(id) {
  const { data } = await sb.from('matches').select('*').eq('id', id).maybeSingle();
  return data;
}

async function main() {
  console.log('\n=== Part 2: live RPC flow (anon key) ===\n');

  /* 1. Anon write-gateway: direct table writes must be rejected. */
  console.log('1) anon write-gateway (direct writes rejected by RLS)');
  {
    const ins = await sb.from('matches').insert({ round: 99, team1_id: T1.id, team2_id: T2.id });
    ok('direct INSERT into matches is rejected', !!ins.error || (Array.isArray(ins.data) && ins.data.length === 0), `→ error="${errMsg(ins.error)}"`);
    const upd = await sb.from('tournament').update({ status: 'hacked' }).eq('id', 3);
    // RLS may reject (error) or silently match 0 rows; verify status is NOT 'hacked'.
    const { data: tnow } = await sb.from('tournament').select('status').maybeSingle();
    ok('direct UPDATE tournament does not take effect', tnow?.status !== 'hacked', `→ status="${tnow?.status}" error="${errMsg(upd.error)}"`);
    const selOk = await sb.from('matches').select('id').limit(1);
    ok('anon SELECT on matches is allowed (read-only access)', !selOk.error, `→ error="${errMsg(selOk.error)}"`);
  }

  /* 2. Admin gating with a wrong code. */
  console.log('\n2) admin-code gating');
  expectErr('admin_set_tournament with wrong code', await rpc('admin_set_tournament', { admin_code: 'wrong-code', p_status: 'swiss' }), 'INVALID_ADMIN_CODE');
  expectErr('admin_create_matches with wrong code', await rpc('admin_create_matches', { admin_code: 'wrong-code', rows: [] }), 'INVALID_ADMIN_CODE');

  /* 3. Start tournament (real admin RPC). */
  console.log('\n3) start tournament + generate round 1');
  expectOk('admin_set_tournament start (swiss, r1)', await rpc('admin_set_tournament', {
    admin_code: ADMIN, p_current_round: 1, p_total_rounds: 2, p_table_count: 16, p_knockout_size: 4, p_match_duration_minutes: 10, p_status: 'swiss',
  }));

  /* 4. Generate round 1: M1 (T1 vs T2), M2 (T3 vs T4). */
  const r1 = await rpc('admin_create_matches', {
    admin_code: ADMIN,
    rows: [
      { round: 1, wave: 1, team1_id: T1.id, team2_id: T2.id, table_number: 1, scheduled_time: '17:00' },
      { round: 1, wave: 1, team1_id: T3.id, team2_id: T4.id, table_number: 2, scheduled_time: '17:00' },
    ],
  });
  expectOk('admin_create_matches round 1 (2 rows)', r1);
  ok('round 1 returned 2 rows', Array.isArray(r1.data) && r1.data.length === 2, `→ ${r1.data?.length}`);
  const M1 = r1.data?.find((m) => m.team1_id === T1.id);
  const M2 = r1.data?.find((m) => m.team1_id === T3.id);

  /* 5. M1 happy path: home reports, away confirms. */
  console.log('\n4) report → confirm (happy path) + permission rules');
  expectErr('report by away team → NOT_HOME_TEAM', await rpc('report_match_result', { p_match_id: M1.id, p_code: T2.code, p_we_are_winner: true, p_winner_cups: 6, p_loser_cups: 2 }), 'NOT_HOME_TEAM');
  expectErr('report with bad code → INVALID_CODE', await rpc('report_match_result', { p_match_id: M1.id, p_code: 'ZZZ999', p_we_are_winner: true, p_winner_cups: 6, p_loser_cups: 2 }), 'INVALID_CODE');
  expectOk('home reports M1 (6-2, home wins)', await rpc('report_match_result', { p_match_id: M1.id, p_code: T1.code, p_we_are_winner: true, p_winner_cups: 6, p_loser_cups: 2 }));
  {
    const m = await getMatch(M1.id);
    ok('M1 winner=home, scores 6-2, reported_by=home, not confirmed', m?.winner_id === T1.id && m?.score_team1 === 6 && m?.score_team2 === 2 && m?.reported_by === T1.id && m?.confirmed === false, `→ ${JSON.stringify(m && { w: m.winner_id, s1: m.score_team1, s2: m.score_team2, rb: m.reported_by, c: m.confirmed })}`);
  }
  expectErr('re-report M1 → ALREADY_REPORTED', await rpc('report_match_result', { p_match_id: M1.id, p_code: T1.code, p_we_are_winner: true, p_winner_cups: 6, p_loser_cups: 0 }), 'ALREADY_REPORTED');
  expectErr('home tries to confirm M1 → NOT_AWAY_TEAM', await rpc('respond_match_result', { p_match_id: M1.id, p_code: T1.code, p_action: 'confirm' }), 'NOT_AWAY_TEAM');
  expectOk('away confirms M1', await rpc('respond_match_result', { p_match_id: M1.id, p_code: T2.code, p_action: 'confirm' }));
  {
    const m = await getMatch(M1.id);
    ok('M1 now confirmed by away', m?.confirmed === true && m?.confirmed_by === 'away', `→ confirmed=${m?.confirmed} by=${m?.confirmed_by}`);
  }

  /* 6. M2 dispute path: home reports, away disputes, admin overrides. */
  console.log('\n5) report → dispute → admin override');
  expectOk('home(T3) reports M2 (away T4 wins 6-4)', await rpc('report_match_result', { p_match_id: M2.id, p_code: T3.code, p_we_are_winner: false, p_winner_cups: 6, p_loser_cups: 4 }));
  {
    const m = await getMatch(M2.id);
    ok('M2 winner=away(T4), score_team1(T3)=4, score_team2(T4)=6', m?.winner_id === T4.id && m?.score_team1 === 4 && m?.score_team2 === 6, `→ ${JSON.stringify(m && { w: m.winner_id, s1: m.score_team1, s2: m.score_team2 })}`);
  }
  expectOk('away(T4) disputes M2', await rpc('respond_match_result', { p_match_id: M2.id, p_code: T4.code, p_action: 'dispute' }));
  {
    const m = await getMatch(M2.id);
    ok('M2 confirmed_by=disputed and still unconfirmed', m?.confirmed_by === 'disputed' && m?.confirmed === false, `→ by=${m?.confirmed_by} confirmed=${m?.confirmed}`);
    const { data: disputed } = await sb.from('matches').select('id').eq('confirmed_by', 'disputed').eq('confirmed', false);
    ok('M2 appears in admin disputed list', (disputed ?? []).some((d) => d.id === M2.id), `→ ${disputed?.length} disputed`);
  }
  expectOk('admin overrides M2 (T3 wins 6-5)', await rpc('admin_set_match_result', { admin_code: ADMIN, p_match_id: M2.id, p_winner_id: T3.id, p_loser_id: T4.id, p_score_team1: 6, p_score_team2: 5 }));
  {
    const m = await getMatch(M2.id);
    ok('M2 resolved: winner=T3, 6-5, confirmed by admin', m?.winner_id === T3.id && m?.score_team1 === 6 && m?.score_team2 === 5 && m?.confirmed === true && m?.confirmed_by === 'admin', `→ ${JSON.stringify(m && { w: m.winner_id, s1: m.score_team1, s2: m.score_team2, c: m.confirmed, by: m.confirmed_by })}`);
  }

  /* 7. Advance + round 2 + score validation. */
  console.log('\n6) advance round + score validation');
  expectOk('advance to round 2', await rpc('admin_set_tournament', { admin_code: ADMIN, p_current_round: 2 }));
  const r2 = await rpc('admin_create_matches', {
    admin_code: ADMIN,
    rows: [
      { round: 2, wave: 1, team1_id: T1.id, team2_id: T3.id, table_number: 1, scheduled_time: '17:10' },
      { round: 2, wave: 1, team1_id: T2.id, team2_id: T4.id, table_number: 2, scheduled_time: '17:10' },
    ],
  });
  expectOk('admin_create_matches round 2', r2);
  const M3 = r2.data?.find((m) => m.team1_id === T1.id); // T1 vs T3
  const M4 = r2.data?.find((m) => m.team1_id === T2.id); // T2 vs T4
  expectErr('report winner<=loser → INVALID_SCORE', await rpc('report_match_result', { p_match_id: M3.id, p_code: T1.code, p_we_are_winner: true, p_winner_cups: 3, p_loser_cups: 6 }), 'INVALID_SCORE');
  expectErr('report cups out of 0..6 → INVALID_SCORE', await rpc('report_match_result', { p_match_id: M3.id, p_code: T1.code, p_we_are_winner: true, p_winner_cups: 7, p_loser_cups: 2 }), 'INVALID_SCORE');
  expectOk('report sub-6 winning score 5-3 is ACCEPTED', await rpc('report_match_result', { p_match_id: M3.id, p_code: T1.code, p_we_are_winner: true, p_winner_cups: 5, p_loser_cups: 3 }));
  {
    const m = await getMatch(M3.id);
    ok('M3 persisted as 5-3, winner=T1', m?.winner_id === T1.id && m?.score_team1 === 5 && m?.score_team2 === 3, `→ ${JSON.stringify(m && { w: m.winner_id, s1: m.score_team1, s2: m.score_team2 })}`);
  }
  expectErr('respond invalid action → INVALID_ACTION', await rpc('respond_match_result', { p_match_id: M4.id, p_code: T4.code, p_action: 'bogus' }), 'INVALID_ACTION');
  expectErr('respond to unreported match → CANNOT_RESPOND', await rpc('respond_match_result', { p_match_id: M4.id, p_code: T4.code, p_action: 'confirm' }), 'CANNOT_RESPOND');

  /* 8. Round-trip persisted state. */
  console.log('\n7) round-trip: persisted match state (anon SELECT)');
  {
    const { data: all } = await sb.from('matches').select('*').order('round').order('table_number');
    ok('exactly 4 matches exist', all?.length === 4, `→ ${all?.length}`);
    const confirmedCount = all?.filter((m) => m.confirmed).length ?? 0;
    ok('2 confirmed (M1 by away, M2 by admin); M3 reported-not-confirmed; M4 untouched', confirmedCount === 2, `→ confirmed=${confirmedCount}`);
  }

  /* 9. Teardown: reset + restore original config + clean stale tiebreak rows. */
  console.log('\n8) teardown (reset + restore config)');
  expectOk('admin_reset_tournament', await rpc('admin_reset_tournament', { admin_code: ADMIN }));
  expectOk('restore knockout_size=8', await rpc('admin_set_tournament', { admin_code: ADMIN, p_knockout_size: 8, p_total_rounds: 2, p_table_count: 16, p_match_duration_minutes: 10, p_current_round: 0, p_status: 'not_started' }));
  {
    const { data: m } = await sb.from('matches').select('id');
    ok('all matches cleared after reset', (m?.length ?? 0) === 0, `→ ${m?.length} remain`);
    const { data: t } = await sb.from('tournament').select('*').maybeSingle();
    ok('tournament back to not_started/r0/ko8', t?.status === 'not_started' && t?.current_round === 0 && t?.knockout_size === 8, `→ ${JSON.stringify(t)}`);
  }

  console.log(`\n=== RESULT: ${pass} passed, ${failures.length} failed ===`);
  if (failures.length) {
    console.log('FAILURES:');
    for (const f of failures) console.log('  - ' + f);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(3);
});

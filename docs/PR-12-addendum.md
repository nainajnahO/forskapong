# PR #12 addendum — bulk team signup & table capacity scheduling

This document describes changes added on top of the original Home/Away + cup-diff ranking work in `feature/BK-rules-update`.

## 1. Admin-only bulk team registration

### Problem
Public website signup exposed team creation to anyone. Event organizers need to register many teams at once and distribute access codes offline.

### Solution
- **Removed public signup** from the marketing site (`TicketsComingSoon`, navbar “Anmälan” CTA, Swish helpers, login prefill from `forskopong_registered`).
- **Admin bulk import**: paste one team name per line → creates teams with unique `ABC123` codes → download `forskapong-team-codes.csv`.
- **Single-team create** in admin now uses the same `bulk_register_teams` RPC (one name).
- **Public `register_team` revoked** at the database layer; only `bulk_register_teams(team_names, admin_code)` remains for team creation.

### Database (`20260522140000_add_bulk_team_registration.sql`)
- Unique indexes on `teams.code` and case-insensitive `teams.name`.
- `generate_team_code()` — three letters + three digits, collision-safe.
- `bulk_register_teams(team_names, admin_code)` — validates admin code, trims names, rejects duplicate input or existing names, returns `(id, name, code)` per row.

### Frontend
| File | Change |
|------|--------|
| `TeamBulkImportModal.tsx` | New modal: parse/validate names, RPC, CSV export |
| `TeamsTab.tsx` | “Importera lag” opens bulk modal |
| `TeamFormModal.tsx` | Single create via `bulk_register_teams` |
| `AdminPassphraseGate.tsx` | Persists `adminCode` in sessionStorage for RPC |
| `database.types.ts` | `bulk_register_teams` RPC typing |

### Post-deploy
Apply migration on hosted Supabase. Confirm `verify_admin_code` exists (used by bulk RPC).

---

## 2. Table capacity & wave scheduling (spelpass)

### Problem
Swiss generation assigned `table_number = matchIndex + 1`. With 16 matches and 8 physical tables, the app showed tables 1–16 and implied everyone plays at once. In reality, matches run in **waves** (spelpass) until all pairings in the round are done.

### Solution
- **`tournament.table_count`** — configured when starting Swiss (admin “Bord” input).
- **`matches.wave`** — spelpass within a competitive round (1-based).
- **Scheduling**: for match index `i` and `N` tables: `wave = floor(i/N)+1`, `table_number = (i % N)+1`.
- **Round progression unchanged** — admin still advances when every match in the round is confirmed (all waves).

### Database (`20260522161000_add_table_capacity_wave_scheduling.sql`)
- `tournament.table_count` (default 16, check `> 0`).
- `matches.wave` (default 1, check `> 0`).
- Index + unique constraint on `(round, wave, table_number)` where `table_number` is set.

### Logic (`src/lib/table-scheduling.ts`)
- `normalizeTableCount`, `getWaveCount`, `getTableSlot`, `assignTablesAndWaves`.
- Unit tests in `table-scheduling.test.ts`.

### Admin
| File | Change |
|------|--------|
| `TournamentFlowCard.tsx` | “Bord” input before Swiss; preview “X matcher · Y bord · Z spelpass” |
| `TournamentTab.tsx` | Saves `table_count`; Swiss/QF/SF/Final use `assignTablesAndWaves`; match lists ordered by wave then table |

### Player / display / live
| File | Change |
|------|--------|
| `Dashboard.tsx` | Spelpass + bord in schedule |
| `MatchPage.tsx` | Wave/table in header |
| `LiveTab.tsx`, `SwissRoundCard.tsx` | P{n} · B{n} labels |
| `TournamentMapView.tsx`, `DisplayPage.tsx` | Wave-aware grouping/labels |

### Fixtures
- `home-away.test.ts`, `SimulatorTab.tsx` — `wave: 1` on test/sim match rows.

### Example
32 teams → 16 Swiss matches, 8 tables:
- Wave 1: matches 0–7 → tables 1–8
- Wave 2: matches 8–15 → tables 1–8
- Admin confirms all 16 before next round.

### Post-deploy
Apply migration. Set **Bord** to real table count before first Swiss round of a live event.

---

## Migrations to run (full PR)

1. `supabase/migrations/20260406180000_add_tiebreak_decisions.sql` (original PR)
2. `supabase/migrations/20260522140000_add_bulk_team_registration.sql`
3. `supabase/migrations/20260522161000_add_table_capacity_wave_scheduling.sql`

```bash
cd forskapong && supabase db push
```

## Test plan (addendum)

- [x] `npm run type-check`
- [x] `npm run lint`
- [x] `npm run test` (`table-scheduling.test.ts`)
- [x] `npm run build`
- [ ] Bulk import: paste 3+ names → CSV download with codes; duplicates rejected
- [ ] Public site: no signup section; navbar links to `/play`
- [ ] Swiss with 16 matches / 8 tables: two waves, tables 1–8 only per wave
- [ ] Dashboard / match page show spelpass + bord
- [ ] Round still blocked until all matches in round confirmed

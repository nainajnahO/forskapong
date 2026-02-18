import { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { useTheme } from '@/contexts/useTheme';
import { cn } from '@/lib/utils';
import { themeText } from '@/lib/theme-utils';
import { supabase } from '@/lib/supabase';
import type { Team, Match, Tournament } from '@/lib/database.types';
import Container from '../components/common/Container';
import SectionLabel from '../components/common/SectionLabel';
import Bracket from '../components/Bracket';

/* ─── Types ───────────────────────────────────────────────────── */

type Tab = 'teams' | 'rounds' | 'results' | 'playoff' | 'settings';
type Theme = ReturnType<typeof useTheme>['theme'];

/* ─── Helpers ─────────────────────────────────────────────────── */

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 to avoid confusion
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/* ─── Swiss Pairing ───────────────────────────────────────────── */

interface TeamForPairing {
  id: string;
  name: string;
  wins: number;
  opponentWins: number;
  cupsHit: number;
  previousOpponents: Set<string>;
}

function swissPair(teams: Team[], allMatches: Match[]): Array<[string, string]> {
  // Build stats for each team
  const statsMap = new Map<string, TeamForPairing>();
  for (const t of teams) {
    statsMap.set(t.id, {
      id: t.id,
      name: t.name,
      wins: 0,
      opponentWins: 0,
      cupsHit: 0,
      previousOpponents: new Set(),
    });
  }

  // Process all played matches
  for (const m of allMatches) {
    if (!m.winner_id || !m.loser_id) continue;
    const w = statsMap.get(m.winner_id);
    const l = statsMap.get(m.loser_id);
    if (w) {
      w.wins += 1;
      w.previousOpponents.add(m.loser_id);
    }
    if (l) {
      l.previousOpponents.add(m.winner_id);
    }
    // Cups
    if (m.score_team1 !== null && m.score_team2 !== null) {
      const t1 = statsMap.get(m.team1_id);
      const t2 = statsMap.get(m.team2_id);
      if (t1) t1.cupsHit += m.score_team1;
      if (t2) t2.cupsHit += m.score_team2;
    }
  }

  // Calculate Buchholz
  for (const [, stats] of statsMap) {
    stats.opponentWins = [...stats.previousOpponents].reduce((sum, oppId) => {
      return sum + (statsMap.get(oppId)?.wins ?? 0);
    }, 0);
  }

  // Sort teams: wins desc, buchholz desc, cups desc
  const sorted = [...statsMap.values()].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.opponentWins !== a.opponentWins) return b.opponentWins - a.opponentWins;
    return b.cupsHit - a.cupsHit;
  });

  // Round 1: if no matches played yet, shuffle randomly
  const isFirstRound = allMatches.length === 0;
  if (isFirstRound) {
    for (let i = sorted.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
    }
  }

  // Greedy pairing: pair top-ranked unpaired team with highest-ranked unpaired opponent
  // that they haven't played before
  const paired = new Set<string>();
  const pairs: Array<[string, string]> = [];

  for (let i = 0; i < sorted.length; i++) {
    const team = sorted[i];
    if (paired.has(team.id)) continue;

    // Find best available opponent
    for (let j = i + 1; j < sorted.length; j++) {
      const opp = sorted[j];
      if (paired.has(opp.id)) continue;
      if (team.previousOpponents.has(opp.id)) continue;

      pairs.push([team.id, opp.id]);
      paired.add(team.id);
      paired.add(opp.id);
      break;
    }
  }

  // Handle any unpaired teams (odd number or all opponents already played)
  // If a team couldn't be paired, try pairing with anyone remaining (even a rematch)
  const unpaired = sorted.filter((t) => !paired.has(t.id));
  for (let i = 0; i < unpaired.length - 1; i += 2) {
    pairs.push([unpaired[i].id, unpaired[i + 1].id]);
  }
  // If odd number: last team gets a bye (not paired)

  return pairs;
}

/* ─── Admin Login ─────────────────────────────────────────────── */

function AdminLogin({ theme, onLogin }: { theme: Theme; onLogin: () => void }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError('');

    const { data, error: fetchError } = await supabase
      .from('tournament')
      .select('admin_code')
      .eq('id', 1)
      .single();

    if (fetchError) {
      setError('Kunde inte verifiera koden.');
      setLoading(false);
      return;
    }

    if (data.admin_code !== code.trim().toUpperCase()) {
      setError('Felaktig adminkod.');
      setLoading(false);
      return;
    }

    sessionStorage.setItem('isAdmin', 'true');
    onLogin();
    setLoading(false);
  };

  return (
    <section className="relative w-full min-h-[calc(100vh-5rem)] pt-24 flex items-center justify-center">
      <Container className="max-w-sm">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <SectionLabel variant="gradient">ADMIN</SectionLabel>
          <h1 className="font-display text-3xl text-brand-500 tracking-wider hdr-text-fill mt-1 mb-8">
            Adminpanel
          </h1>

          <div className="flex flex-col gap-4">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="Adminkod"
              className={cn(
                'w-full px-4 py-3 rounded-xl text-center text-lg font-mono tracking-[0.3em] border transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/50',
                theme === 'dark'
                  ? 'bg-white/[0.04] border-white/10 text-white placeholder:text-zinc-600'
                  : 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-300',
              )}
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              onClick={handleSubmit}
              disabled={loading || !code.trim()}
              className="w-full py-3 rounded-xl text-sm font-semibold bg-brand-500 text-white shadow-lg shadow-brand-500/20 hover:brightness-110 transition-all disabled:opacity-40"
            >
              {loading ? 'Verifierar…' : 'Logga in'}
            </button>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}

/* ─── Admin Panel ─────────────────────────────────────────────── */

export default function Admin() {
  const { theme } = useTheme();
  const [isAuthed, setIsAuthed] = useState(sessionStorage.getItem('isAdmin') === 'true');

  if (!isAuthed) {
    return <AdminLogin theme={theme} onLogin={() => setIsAuthed(true)} />;
  }

  return <AdminDashboard theme={theme} />;
}

/* ─── Admin Dashboard ─────────────────────────────────────────── */

function AdminDashboard({ theme }: { theme: Theme }) {
  const [tab, setTab] = useState<Tab>('teams');
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  const cardBg = theme === 'dark' ? 'bg-white/[0.03]' : 'bg-zinc-50';
  const cardBorder = theme === 'dark' ? 'border-white/[0.06]' : 'border-zinc-200';

  const loadAll = useCallback(async () => {
    try {
      const [tRes, teamsRes, matchesRes] = await Promise.all([
        supabase.from('tournament').select('*').eq('id', 1).single(),
        supabase.from('teams').select('*').order('name'),
        supabase.from('matches').select('*').order('round').order('table_number'),
      ]);
      if (tRes.data) setTournament(tRes.data);
      setTeams(teamsRes.data ?? []);
      setMatches(matchesRes.data ?? []);
    } catch {
      console.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Real-time
  useEffect(() => {
    const channel = supabase
      .channel('admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament' }, () =>
        loadAll(),
      )
      .subscribe();
    return () => {
      void channel.unsubscribe();
    };
  }, [loadAll]);

  if (loading) {
    return (
      <section className="relative w-full min-h-[calc(100vh-5rem)] pt-24 flex items-center justify-center">
        <motion.div
          className="flex flex-col items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <p className={cn('text-sm', themeText(theme, 'secondary'))}>Laddar admin…</p>
        </motion.div>
      </section>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'teams', label: 'Lag' },
    { key: 'rounds', label: 'Rundor' },
    { key: 'results', label: 'Resultat' },
    { key: 'playoff', label: 'Slutspel' },
    { key: 'settings', label: 'Inst.' },
  ];

  return (
    <section className="relative w-full min-h-[calc(100vh-5rem)] pt-24 md:pt-28 pb-10 md:pb-16">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <SectionLabel variant="gradient">ADMIN</SectionLabel>
          <div className="flex items-center justify-between mb-8">
            <h1 className="font-display text-3xl md:text-4xl text-brand-500 tracking-wider hdr-text-fill mt-1">
              Adminpanel
            </h1>
            <div className="flex items-center gap-3">
              <span className={cn('text-xs font-mono', themeText(theme, 'secondary'))}>
                Runda {tournament?.current_round ?? '?'}/{tournament?.total_rounds ?? '?'}
              </span>
              <span
                className={cn(
                  'px-2 py-1 rounded-lg text-xs font-semibold border',
                  tournament?.status === 'active'
                    ? theme === 'dark'
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                      : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    : theme === 'dark'
                      ? 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20'
                      : 'bg-zinc-100 text-zinc-500 border-zinc-200',
                )}
              >
                {tournament?.status === 'active' ? 'Aktiv' : (tournament?.status ?? '–')}
              </span>
            </div>
          </div>

          {/* ── Tabs ──────────────────────────────────── */}
          <div className={cn('flex gap-1 p-1 rounded-xl mb-8 border', cardBg, cardBorder)}>
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'flex-1 py-2.5 rounded-lg text-sm font-medium transition-all',
                  tab === t.key
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                    : cn('hover:opacity-80', themeText(theme, 'secondary')),
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Tab Content ───────────────────────────── */}
          {tab === 'teams' && (
            <TeamsTab
              theme={theme}
              teams={teams}
              onRefresh={loadAll}
              cardBg={cardBg}
              cardBorder={cardBorder}
            />
          )}
          {tab === 'rounds' && (
            <RoundsTab
              theme={theme}
              teams={teams}
              matches={matches}
              tournament={tournament}
              onRefresh={loadAll}
              cardBg={cardBg}
              cardBorder={cardBorder}
            />
          )}
          {tab === 'results' && (
            <ResultsTab
              theme={theme}
              teams={teams}
              matches={matches}
              onRefresh={loadAll}
              cardBg={cardBg}
              cardBorder={cardBorder}
            />
          )}
          {tab === 'playoff' && (
            <PlayoffTab
              theme={theme}
              teams={teams}
              matches={matches}
              tournament={tournament}
              onRefresh={loadAll}
              cardBg={cardBg}
              cardBorder={cardBorder}
            />
          )}
          {tab === 'settings' && (
            <SettingsTab
              theme={theme}
              tournament={tournament}
              onRefresh={loadAll}
              cardBg={cardBg}
              cardBorder={cardBorder}
            />
          )}
        </motion.div>
      </Container>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TEAMS TAB
   ═══════════════════════════════════════════════════════════════ */

function TeamsTab({
  theme,
  teams,
  onRefresh,
  cardBg,
  cardBorder,
}: {
  theme: Theme;
  teams: Team[];
  onRefresh: () => void;
  cardBg: string;
  cardBorder: string;
}) {
  const [name, setName] = useState('');
  const [player1, setPlayer1] = useState('');
  const [player2, setPlayer2] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const inputCn = cn(
    'w-full px-3 py-2.5 rounded-lg text-sm border transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/50',
    theme === 'dark'
      ? 'bg-white/[0.04] border-white/10 text-white placeholder:text-zinc-600'
      : 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400',
  );

  const handleAdd = async () => {
    if (!name.trim() || !player1.trim() || !player2.trim()) return;
    setSaving(true);
    setMsg('');

    // Generate unique code
    let code = generateCode();
    let attempts = 0;
    while (attempts < 10) {
      const { data: existing } = await supabase
        .from('teams')
        .select('id')
        .eq('code', code)
        .maybeSingle();
      if (!existing) break;
      code = generateCode();
      attempts++;
    }

    const { error } = await supabase.from('teams').insert({
      name: name.trim(),
      player1: player1.trim(),
      player2: player2.trim(),
      code,
    });

    if (error) {
      setMsg('Kunde inte skapa laget.');
    } else {
      setMsg(`Lag skapat! Kod: ${code}`);
      setName('');
      setPlayer1('');
      setPlayer2('');
      onRefresh();
    }
    setSaving(false);
  };

  const handleDelete = async (teamId: string, teamName: string) => {
    if (!confirm(`Ta bort ${teamName}? Alla deras matcher tas också bort.`)) return;

    // Delete matches involving this team
    await supabase.from('matches').delete().or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`);
    await supabase.from('teams').delete().eq('id', teamId);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Add team form */}
      <div className={cn('rounded-2xl p-5 border', cardBg, cardBorder)}>
        <h3 className="text-sm font-semibold text-foreground mb-4">Lägg till lag</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Lagnamn"
            className={inputCn}
          />
          <input
            value={player1}
            onChange={(e) => setPlayer1(e.target.value)}
            placeholder="Spelare 1"
            className={inputCn}
          />
          <input
            value={player2}
            onChange={(e) => setPlayer2(e.target.value)}
            placeholder="Spelare 2"
            className={inputCn}
          />
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleAdd}
            disabled={saving || !name.trim() || !player1.trim() || !player2.trim()}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-brand-500 text-white hover:brightness-110 transition-all disabled:opacity-40"
          >
            {saving ? 'Skapar…' : 'Skapa lag'}
          </button>
          {msg && (
            <p
              className={cn(
                'text-sm',
                msg.includes('Kod') ? 'text-emerald-400 font-mono' : 'text-red-400',
              )}
            >
              {msg}
            </p>
          )}
        </div>
      </div>

      {/* Teams list */}
      <div className={cn('rounded-2xl border overflow-hidden', cardBorder)}>
        <div
          className={cn(
            'grid grid-cols-[1fr_6rem_5rem_3rem] sm:grid-cols-[1fr_10rem_7rem_5rem] gap-0 px-4 sm:px-6 py-3 text-xs font-semibold uppercase tracking-wider border-b',
            theme === 'dark'
              ? 'bg-white/[0.02] text-zinc-500 border-white/[0.06]'
              : 'bg-zinc-100 text-zinc-400 border-zinc-200',
          )}
        >
          <span>Lag</span>
          <span>Spelare</span>
          <span className="text-center">Kod</span>
          <span></span>
        </div>
        {teams.length === 0 ? (
          <div className={cn('p-8 text-center', cardBg)}>
            <p className={themeText(theme, 'secondary')}>Inga lag skapade ännu.</p>
          </div>
        ) : (
          teams.map((team, i) => (
            <div
              key={team.id}
              className={cn(
                'grid grid-cols-[1fr_6rem_5rem_3rem] sm:grid-cols-[1fr_10rem_7rem_5rem] gap-0 px-4 sm:px-6 py-3 items-center',
                cardBg,
                i < teams.length - 1
                  ? theme === 'dark'
                    ? 'border-b border-white/[0.04]'
                    : 'border-b border-zinc-100'
                  : '',
              )}
            >
              <span className="text-sm font-medium text-foreground truncate">{team.name}</span>
              <span className={cn('text-xs truncate', themeText(theme, 'secondary'))}>
                {team.player1} & {team.player2}
              </span>
              <span
                className={cn(
                  'text-xs font-mono font-bold text-center',
                  theme === 'dark' ? 'text-brand-400' : 'text-brand-600',
                )}
              >
                {team.code}
              </span>
              <button
                onClick={() => handleDelete(team.id, team.name)}
                className="text-red-400 hover:text-red-300 transition-colors text-xs"
                title="Ta bort"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      <p className={cn('text-xs', themeText(theme, 'secondary'))}>
        {teams.length} lag registrerade
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ROUNDS TAB
   ═══════════════════════════════════════════════════════════════ */

function RoundsTab({
  theme,
  teams,
  matches,
  tournament,
  onRefresh,
  cardBg,
  cardBorder,
}: {
  theme: Theme;
  teams: Team[];
  matches: Match[];
  tournament: Tournament | null;
  onRefresh: () => void;
  cardBg: string;
  cardBorder: string;
}) {
  const [numTables, setNumTables] = useState(tournament?.num_tables ?? 3);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<Array<[string, string]> | null>(null);
  const [msg, setMsg] = useState('');

  const currentRound = tournament?.current_round ?? 0;
  const totalRounds = tournament?.total_rounds ?? 6;

  // Check if current round is fully played
  const currentRoundMatches = matches.filter((m) => m.round === currentRound);
  const allCurrentPlayed =
    currentRoundMatches.length > 0 && currentRoundMatches.every((m) => m.winner_id !== null);
  const allCurrentConfirmed =
    currentRoundMatches.length > 0 && currentRoundMatches.every((m) => m.confirmed);

  // Check if matches exist for next round
  const nextRound = currentRound + 1;
  const nextRoundMatches = matches.filter((m) => m.round === nextRound);
  const nextRoundDrawn = nextRoundMatches.length > 0;

  const teamMap = new Map(teams.map((t) => [t.id, t]));

  const handleGenerate = () => {
    if (teams.length < 2) {
      setMsg('Minst 2 lag krävs.');
      return;
    }
    const pairs = swissPair(teams, matches);
    setPreview(pairs);
    setMsg('');
  };

  const handleSaveRound = async () => {
    if (!preview || !tournament) return;
    setGenerating(true);
    setMsg('');

    const newRound = currentRound + 1;

    // Assign tables and times — split into waves if more matches than tables
    const matchInserts = preview.map(([t1, t2], i) => {
      const tableNum = (i % numTables) + 1;
      const waveIdx = Math.floor(i / numTables);
      const baseMinutes = waveIdx * 25; // 25 min per wave
      const hours = Math.floor(baseMinutes / 60);
      const mins = baseMinutes % 60;
      const timeStr = `${String(18 + hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

      return {
        round: newRound,
        team1_id: t1,
        team2_id: t2,
        table_number: tableNum,
        scheduled_time: timeStr,
      };
    });

    const { error: insertError } = await supabase.from('matches').insert(matchInserts);
    if (insertError) {
      setMsg('Kunde inte spara lottning.');
      setGenerating(false);
      return;
    }

    // Update tournament round
    await supabase
      .from('tournament')
      .update({
        current_round: newRound,
        num_tables: numTables,
      })
      .eq('id', 1);

    setPreview(null);
    setMsg(`Runda ${newRound} skapad med ${matchInserts.length} matcher!`);
    setGenerating(false);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Status */}
      <div className={cn('rounded-2xl p-5 border', cardBg, cardBorder)}>
        <h3 className="text-sm font-semibold text-foreground mb-3">Rundstatus</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className={cn('text-xs mb-1', themeText(theme, 'secondary'))}>Nuvarande runda</p>
            <p className="font-bold text-foreground">
              {currentRound} / {totalRounds}
            </p>
          </div>
          <div>
            <p className={cn('text-xs mb-1', themeText(theme, 'secondary'))}>Matcher i rundan</p>
            <p className="font-bold text-foreground">{currentRoundMatches.length}</p>
          </div>
          <div>
            <p className={cn('text-xs mb-1', themeText(theme, 'secondary'))}>Spelade</p>
            <p
              className={cn('font-bold', allCurrentPlayed ? 'text-emerald-400' : 'text-amber-400')}
            >
              {currentRoundMatches.filter((m) => m.winner_id).length} / {currentRoundMatches.length}
            </p>
          </div>
          <div>
            <p className={cn('text-xs mb-1', themeText(theme, 'secondary'))}>Bekräftade</p>
            <p
              className={cn(
                'font-bold',
                allCurrentConfirmed ? 'text-emerald-400' : 'text-amber-400',
              )}
            >
              {currentRoundMatches.filter((m) => m.confirmed).length} / {currentRoundMatches.length}
            </p>
          </div>
        </div>
      </div>

      {/* Generate next round */}
      {!nextRoundDrawn && nextRound <= totalRounds && (
        <div className={cn('rounded-2xl p-5 border', cardBg, cardBorder)}>
          <h3 className="text-sm font-semibold text-foreground mb-4">Lotta runda {nextRound}</h3>

          <div className="flex items-center gap-4 mb-4">
            <label className={cn('text-sm', themeText(theme, 'secondary'))}>Antal bord:</label>
            <input
              type="number"
              min={1}
              max={20}
              value={numTables}
              onChange={(e) => setNumTables(Math.max(1, parseInt(e.target.value) || 1))}
              className={cn(
                'w-20 px-3 py-2 rounded-lg text-sm text-center border focus:outline-none focus:ring-2 focus:ring-brand-500/50',
                theme === 'dark'
                  ? 'bg-white/[0.04] border-white/10 text-white'
                  : 'bg-white border-zinc-200 text-zinc-900',
              )}
            />
          </div>

          {!allCurrentPlayed && currentRoundMatches.length > 0 && (
            <p className="text-sm text-amber-400 mb-4">
              Alla matcher i runda {currentRound} är inte avslutade ännu.
            </p>
          )}

          <button
            onClick={handleGenerate}
            disabled={teams.length < 2}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-brand-500 text-white hover:brightness-110 transition-all disabled:opacity-40"
          >
            Generera lottning
          </button>

          {msg && !preview && (
            <p
              className={cn(
                'mt-3 text-sm',
                msg.includes('skapad') ? 'text-emerald-400' : 'text-red-400',
              )}
            >
              {msg}
            </p>
          )}
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className={cn('rounded-2xl p-5 border', cardBg, cardBorder)}>
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Förhandsvisning — Runda {nextRound}
          </h3>
          <div className="space-y-2 mb-6">
            {preview.map(([t1, t2], i) => {
              const tableNum = (i % numTables) + 1;
              return (
                <div
                  key={i}
                  className={cn(
                    'flex items-center justify-between px-4 py-3 rounded-xl border',
                    theme === 'dark'
                      ? 'bg-white/[0.02] border-white/[0.04]'
                      : 'bg-white border-zinc-100',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        'w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold',
                        theme === 'dark'
                          ? 'bg-white/[0.06] text-zinc-400'
                          : 'bg-zinc-200 text-zinc-500',
                      )}
                    >
                      B{tableNum}
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {teamMap.get(t1)?.name ?? '?'}
                    </span>
                  </div>
                  <span className={cn('text-xs font-display', themeText(theme, 'secondary'))}>
                    VS
                  </span>
                  <span className="text-sm font-medium text-foreground text-right">
                    {teamMap.get(t2)?.name ?? '?'}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSaveRound}
              disabled={generating}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-emerald-500 text-white hover:brightness-110 transition-all disabled:opacity-40"
            >
              {generating ? 'Sparar…' : `Starta runda ${nextRound}`}
            </button>
            <button
              onClick={() => setPreview(null)}
              className={cn(
                'px-5 py-2.5 rounded-lg text-sm font-medium border hover:opacity-80 transition-all',
                theme === 'dark'
                  ? 'bg-white/[0.04] border-white/10 text-zinc-400'
                  : 'bg-zinc-100 border-zinc-200 text-zinc-500',
              )}
            >
              Avbryt
            </button>
            <button
              onClick={handleGenerate}
              className={cn(
                'px-5 py-2.5 rounded-lg text-sm font-medium border hover:opacity-80 transition-all',
                theme === 'dark'
                  ? 'bg-white/[0.04] border-white/10 text-zinc-400'
                  : 'bg-zinc-100 border-zinc-200 text-zinc-500',
              )}
            >
              Lotta om
            </button>
          </div>

          {msg && (
            <p
              className={cn(
                'mt-3 text-sm',
                msg.includes('skapad') ? 'text-emerald-400' : 'text-red-400',
              )}
            >
              {msg}
            </p>
          )}
        </div>
      )}

      {/* Current round matches */}
      {currentRoundMatches.length > 0 && (
        <div className={cn('rounded-2xl p-5 border', cardBg, cardBorder)}>
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Runda {currentRound} — Matcher
          </h3>
          <div className="space-y-2">
            {currentRoundMatches.map((m) => (
              <div
                key={m.id}
                className={cn(
                  'flex items-center justify-between px-4 py-3 rounded-xl border',
                  theme === 'dark'
                    ? 'bg-white/[0.02] border-white/[0.04]'
                    : 'bg-white border-zinc-100',
                )}
              >
                <div className="flex items-center gap-3 flex-1">
                  <span
                    className={cn(
                      'w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold',
                      theme === 'dark'
                        ? 'bg-white/[0.06] text-zinc-400'
                        : 'bg-zinc-200 text-zinc-500',
                    )}
                  >
                    B{m.table_number}
                  </span>
                  <span
                    className={cn(
                      'text-sm font-medium',
                      m.winner_id === m.team1_id ? 'text-emerald-400' : 'text-foreground',
                    )}
                  >
                    {teamMap.get(m.team1_id)?.name ?? '?'}
                  </span>
                  <span className={cn('text-xs', themeText(theme, 'secondary'))}>vs</span>
                  <span
                    className={cn(
                      'text-sm font-medium',
                      m.winner_id === m.team2_id ? 'text-emerald-400' : 'text-foreground',
                    )}
                  >
                    {teamMap.get(m.team2_id)?.name ?? '?'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {m.score_team1 !== null && m.score_team2 !== null && (
                    <span className="text-sm font-mono font-bold text-foreground">
                      {m.score_team1}–{m.score_team2}
                    </span>
                  )}
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-semibold',
                      m.confirmed
                        ? theme === 'dark'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-emerald-50 text-emerald-600'
                        : m.winner_id
                          ? theme === 'dark'
                            ? 'bg-amber-500/15 text-amber-400'
                            : 'bg-amber-50 text-amber-600'
                          : theme === 'dark'
                            ? 'bg-zinc-500/15 text-zinc-500'
                            : 'bg-zinc-100 text-zinc-400',
                    )}
                  >
                    {m.confirmed ? 'OK' : m.winner_id ? 'Väntar' : 'Ospelad'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   RESULTS TAB
   ═══════════════════════════════════════════════════════════════ */

function ResultsTab({
  theme,
  teams,
  matches,
  onRefresh,
  cardBg,
  cardBorder,
}: {
  theme: Theme;
  teams: Team[];
  matches: Match[];
  onRefresh: () => void;
  cardBg: string;
  cardBorder: string;
}) {
  const [editingMatch, setEditingMatch] = useState<string | null>(null);
  const [editScore1, setEditScore1] = useState(0);
  const [editScore2, setEditScore2] = useState(0);
  const [editWinner, setEditWinner] = useState<'team1' | 'team2'>('team1');
  const [saving, setSaving] = useState(false);

  const teamMap = new Map(teams.map((t) => [t.id, t]));

  // Group matches by round
  const rounds = [...new Set(matches.map((m) => m.round))].sort((a, b) => b - a);

  const startEdit = (m: Match) => {
    setEditingMatch(m.id);
    setEditScore1(m.score_team1 ?? 0);
    setEditScore2(m.score_team2 ?? 0);
    setEditWinner(m.winner_id === m.team1_id ? 'team1' : 'team2');
  };

  const handleSaveEdit = async (m: Match) => {
    setSaving(true);

    const winnerId = editWinner === 'team1' ? m.team1_id : m.team2_id;
    const loserId = editWinner === 'team1' ? m.team2_id : m.team1_id;

    const { error } = await supabase
      .from('matches')
      .update({
        winner_id: winnerId,
        loser_id: loserId,
        score_team1: editScore1,
        score_team2: editScore2,
        confirmed: true,
        confirmed_by: 'admin',
      })
      .eq('id', m.id);

    if (!error) {
      setEditingMatch(null);
      onRefresh();
    }
    setSaving(false);
  };

  const handleRevert = async (m: Match) => {
    if (!confirm('Nollställ resultat för denna match?')) return;

    await supabase
      .from('matches')
      .update({
        winner_id: null,
        loser_id: null,
        score_team1: null,
        score_team2: null,
        reported_by: null,
        confirmed: false,
        confirmed_by: null,
      })
      .eq('id', m.id);

    onRefresh();
  };

  const handleConfirm = async (m: Match) => {
    await supabase
      .from('matches')
      .update({
        confirmed: true,
        confirmed_by: 'admin',
      })
      .eq('id', m.id);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {rounds.map((round) => {
        const roundMatches = matches.filter((m) => m.round === round);

        return (
          <div key={round} className={cn('rounded-2xl border overflow-hidden', cardBorder)}>
            <div
              className={cn(
                'px-5 py-3 text-sm font-semibold border-b',
                theme === 'dark'
                  ? 'bg-white/[0.02] text-foreground border-white/[0.06]'
                  : 'bg-zinc-100 text-zinc-700 border-zinc-200',
              )}
            >
              Runda {round}
            </div>

            {roundMatches.map((m, i) => {
              const isEditing = editingMatch === m.id;
              const t1Name = teamMap.get(m.team1_id)?.name ?? '?';
              const t2Name = teamMap.get(m.team2_id)?.name ?? '?';

              return (
                <div
                  key={m.id}
                  className={cn(
                    'px-5 py-4',
                    cardBg,
                    i < roundMatches.length - 1
                      ? theme === 'dark'
                        ? 'border-b border-white/[0.04]'
                        : 'border-b border-zinc-100'
                      : '',
                  )}
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-4 text-sm">
                        <span className="font-medium text-foreground">{t1Name}</span>
                        <span className={themeText(theme, 'secondary')}>vs</span>
                        <span className="font-medium text-foreground">{t2Name}</span>
                      </div>

                      <div className="flex items-center gap-3 flex-wrap">
                        <select
                          value={editWinner}
                          onChange={(e) => {
                            const val = e.target.value as 'team1' | 'team2';
                            setEditWinner(val);
                            if (val === 'team1') {
                              setEditScore1(6);
                              setEditScore2(Math.min(editScore2, 5));
                            } else {
                              setEditScore2(6);
                              setEditScore1(Math.min(editScore1, 5));
                            }
                          }}
                          className={cn(
                            'px-3 py-2 rounded-lg text-sm border focus:outline-none',
                            theme === 'dark'
                              ? 'bg-white/[0.04] border-white/10 text-white'
                              : 'bg-white border-zinc-200 text-zinc-900',
                          )}
                        >
                          <option value="team1">{t1Name} vinner</option>
                          <option value="team2">{t2Name} vinner</option>
                        </select>

                        <div className="flex items-center gap-2 text-sm">
                          <span className={themeText(theme, 'secondary')}>{t1Name}:</span>
                          <input
                            type="number"
                            min={0}
                            max={6}
                            value={editScore1}
                            onChange={(e) =>
                              setEditScore1(Math.min(6, Math.max(0, parseInt(e.target.value) || 0)))
                            }
                            className={cn(
                              'w-14 px-2 py-1.5 rounded text-center text-sm border focus:outline-none',
                              theme === 'dark'
                                ? 'bg-white/[0.04] border-white/10 text-white'
                                : 'bg-white border-zinc-200 text-zinc-900',
                            )}
                          />
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <span className={themeText(theme, 'secondary')}>{t2Name}:</span>
                          <input
                            type="number"
                            min={0}
                            max={6}
                            value={editScore2}
                            onChange={(e) =>
                              setEditScore2(Math.min(6, Math.max(0, parseInt(e.target.value) || 0)))
                            }
                            className={cn(
                              'w-14 px-2 py-1.5 rounded text-center text-sm border focus:outline-none',
                              theme === 'dark'
                                ? 'bg-white/[0.04] border-white/10 text-white'
                                : 'bg-white border-zinc-200 text-zinc-900',
                            )}
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(m)}
                          disabled={saving}
                          className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-500 text-white hover:brightness-110 disabled:opacity-40"
                        >
                          {saving ? 'Sparar…' : 'Spara'}
                        </button>
                        <button
                          onClick={() => setEditingMatch(null)}
                          className={cn(
                            'px-4 py-2 rounded-lg text-xs font-medium border hover:opacity-80',
                            theme === 'dark'
                              ? 'border-white/10 text-zinc-400'
                              : 'border-zinc-200 text-zinc-500',
                          )}
                        >
                          Avbryt
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <span
                          className={cn(
                            'text-sm font-medium',
                            m.winner_id === m.team1_id ? 'text-emerald-400' : 'text-foreground',
                          )}
                        >
                          {t1Name}
                        </span>
                        <span className={cn('text-xs', themeText(theme, 'secondary'))}>vs</span>
                        <span
                          className={cn(
                            'text-sm font-medium',
                            m.winner_id === m.team2_id ? 'text-emerald-400' : 'text-foreground',
                          )}
                        >
                          {t2Name}
                        </span>
                        {m.score_team1 !== null && m.score_team2 !== null && (
                          <span className="text-sm font-mono font-bold text-foreground ml-2">
                            {m.score_team1}–{m.score_team2}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {m.winner_id && !m.confirmed && (
                          <button
                            onClick={() => handleConfirm(m)}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-emerald-500 text-white hover:brightness-110"
                          >
                            Bekräfta
                          </button>
                        )}
                        <button
                          onClick={() => startEdit(m)}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-[10px] font-medium border hover:opacity-80',
                            theme === 'dark'
                              ? 'border-white/10 text-zinc-400'
                              : 'border-zinc-200 text-zinc-500',
                          )}
                        >
                          Redigera
                        </button>
                        {m.winner_id && (
                          <button
                            onClick={() => handleRevert(m)}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-medium text-red-400 border border-red-500/20 hover:opacity-80"
                          >
                            Nollställ
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      {matches.length === 0 && (
        <div className={cn('rounded-2xl p-8 border text-center', cardBg, cardBorder)}>
          <p className={themeText(theme, 'secondary')}>Inga matcher ännu.</p>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SETTINGS TAB
   ═══════════════════════════════════════════════════════════════ */

function SettingsTab({
  theme,
  tournament,
  onRefresh,
  cardBg,
  cardBorder,
}: {
  theme: Theme;
  tournament: Tournament | null;
  onRefresh: () => void;
  cardBg: string;
  cardBorder: string;
}) {
  const [totalRounds, setTotalRounds] = useState(tournament?.total_rounds ?? 6);
  const [numTables, setNumTables] = useState(tournament?.num_tables ?? 3);
  const [adminCode, setAdminCode] = useState(tournament?.admin_code ?? '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const inputCn = cn(
    'w-full px-3 py-2.5 rounded-lg text-sm border transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/50',
    theme === 'dark'
      ? 'bg-white/[0.04] border-white/10 text-white'
      : 'bg-white border-zinc-200 text-zinc-900',
  );

  const handleSave = async () => {
    setSaving(true);
    setMsg('');

    const { error } = await supabase
      .from('tournament')
      .update({
        total_rounds: totalRounds,
        num_tables: numTables,
        admin_code: adminCode.trim().toUpperCase(),
      })
      .eq('id', 1);

    if (error) {
      setMsg('Kunde inte spara.');
    } else {
      setMsg('Inställningar sparade!');
      onRefresh();
    }
    setSaving(false);
  };

  const handleResetTournament = async () => {
    if (!confirm('VARNING: Detta nollställer hela turneringen! Alla matcher raderas. Är du säker?'))
      return;
    if (!confirm('Verkligen? Alla resultat försvinner permanent.')) return;

    // Delete all matches
    const { error: delError } = await supabase.from('matches').delete().gte('round', 0);
    if (delError) {
      console.error('Failed to delete matches:', delError);
      setMsg(`Kunde inte radera matcher: ${delError.message}`);
      return;
    }

    // Reset all team win/loss counters
    const { error: teamError } = await supabase
      .from('teams')
      .update({ wins: 0, losses: 0 })
      .not('id', 'is', null);
    if (teamError) console.error('Failed to reset teams:', teamError);

    // Reset tournament state
    await supabase
      .from('tournament')
      .update({
        current_round: 0,
        status: 'active',
      })
      .eq('id', 1);

    onRefresh();
    setMsg('Turnering nollställd. Alla matcher raderade.');
  };

  return (
    <div className="space-y-6">
      <div className={cn('rounded-2xl p-5 border', cardBg, cardBorder)}>
        <h3 className="text-sm font-semibold text-foreground mb-4">Turneringsinställningar</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className={cn('text-xs mb-1.5 block', themeText(theme, 'secondary'))}>
              Antal rundor
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={totalRounds}
              onChange={(e) => setTotalRounds(parseInt(e.target.value) || 1)}
              className={inputCn}
            />
          </div>
          <div>
            <label className={cn('text-xs mb-1.5 block', themeText(theme, 'secondary'))}>
              Antal bord
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={numTables}
              onChange={(e) => setNumTables(parseInt(e.target.value) || 1)}
              className={inputCn}
            />
          </div>
          <div>
            <label className={cn('text-xs mb-1.5 block', themeText(theme, 'secondary'))}>
              Adminkod
            </label>
            <input
              type="text"
              value={adminCode}
              onChange={(e) => setAdminCode(e.target.value.toUpperCase())}
              className={inputCn}
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-brand-500 text-white hover:brightness-110 transition-all disabled:opacity-40"
          >
            {saving ? 'Sparar…' : 'Spara inställningar'}
          </button>
          {msg && (
            <p
              className={cn(
                'text-sm',
                msg.includes('sparade') || msg.includes('nollställd')
                  ? 'text-emerald-400'
                  : 'text-red-400',
              )}
            >
              {msg}
            </p>
          )}
        </div>
      </div>

      {/* Danger zone */}
      <div className={cn('rounded-2xl p-5 border border-red-500/20')}>
        <h3 className="text-sm font-semibold text-red-400 mb-3">Farlig zon</h3>
        <p className={cn('text-xs mb-4', themeText(theme, 'secondary'))}>
          Nollställ hela turneringen. Alla matcher raderas men lag behålls.
        </p>
        <button
          onClick={handleResetTournament}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-red-500 text-white hover:brightness-110 transition-all"
        >
          Nollställ turnering
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PLAYOFF TAB
   ═══════════════════════════════════════════════════════════════ */

function PlayoffTab({
  theme,
  teams,
  matches,
  tournament,
  onRefresh,
  cardBg,
  cardBorder,
}: {
  theme: Theme;
  teams: Team[];
  matches: Match[];
  tournament: Tournament | null;
  onRefresh: () => void;
  cardBg: string;
  cardBorder: string;
}) {
  const [generating, setGenerating] = useState(false);
  const [msg, setMsg] = useState('');

  const playoffStarted = tournament?.playoff_started ?? false;
  const playoffMatches = matches.filter((m) => m.is_playoff);
  const teamMap = new Map(teams.map((t) => [t.id, t]));

  // Calculate standings for seeding
  const calculateStandings = () => {
    const swissMatches = matches.filter((m) => !m.is_playoff);
    const stats = new Map<
      string,
      { wins: number; oppWins: number; cups: number; opponents: string[] }
    >();

    for (const t of teams) {
      stats.set(t.id, { wins: 0, oppWins: 0, cups: 0, opponents: [] });
    }

    for (const m of swissMatches) {
      if (!m.winner_id || !m.loser_id) continue;
      const w = stats.get(m.winner_id);
      const l = stats.get(m.loser_id);
      if (w) {
        w.wins += 1;
        w.opponents.push(m.loser_id);
      }
      if (l) {
        l.opponents.push(m.winner_id);
      }
      if (m.score_team1 !== null && m.score_team2 !== null) {
        const t1 = stats.get(m.team1_id);
        const t2 = stats.get(m.team2_id);
        if (t1) t1.cups += m.score_team1;
        if (t2) t2.cups += m.score_team2;
      }
    }

    for (const [, s] of stats) {
      s.oppWins = s.opponents.reduce((sum, id) => sum + (stats.get(id)?.wins ?? 0), 0);
    }

    return [...stats.entries()]
      .map(([id, s]) => ({ id, ...s }))
      .sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.oppWins !== a.oppWins) return b.oppWins - a.oppWins;
        return b.cups - a.cups;
      });
  };

  const handleGeneratePlayoffs = async () => {
    const standings = calculateStandings();
    if (standings.length < 8) {
      setMsg(`Minst 8 lag krävs, har ${standings.length}.`);
      return;
    }

    setGenerating(true);
    setMsg('');

    const top8 = standings.slice(0, 8);
    const numTables = tournament?.num_tables ?? 4;

    // Seeding: 1v8, 2v7, 3v6, 4v5
    const qfInserts = [
      [top8[0].id, top8[7].id, 1],
      [top8[1].id, top8[6].id, 2],
      [top8[2].id, top8[5].id, 3],
      [top8[3].id, top8[4].id, 4],
    ].map(([t1, t2, pos], i) => ({
      round: (tournament?.current_round ?? 0) + 1,
      team1_id: t1 as string,
      team2_id: t2 as string,
      is_playoff: true,
      bracket_stage: 'quarterfinal',
      bracket_position: pos as number,
      table_number: (i % numTables) + 1,
    }));

    const { error: qfError } = await supabase.from('matches').insert(qfInserts);
    if (qfError) {
      setMsg('Kunde inte skapa kvartsfinaler.');
      setGenerating(false);
      return;
    }

    await supabase
      .from('tournament')
      .update({
        playoff_started: true,
        status: 'playoff',
      })
      .eq('id', 1);

    setMsg('Slutspel startat! Kvartsfinaler skapade.');
    setGenerating(false);
    onRefresh();
  };

  const handleAdvance = async (fromStage: string) => {
    const stageMatches = playoffMatches.filter((m) => m.bracket_stage === fromStage);
    const allComplete = stageMatches.every((m) => m.winner_id !== null);

    if (!allComplete) {
      setMsg(
        `Alla matcher i ${fromStage === 'quarterfinal' ? 'kvartsfinalen' : 'semifinalen'} måste vara avgjorda.`,
      );
      return;
    }

    setGenerating(true);
    setMsg('');
    const numTables = tournament?.num_tables ?? 4;

    if (fromStage === 'quarterfinal') {
      const qfByPos = new Map(stageMatches.map((m) => [m.bracket_position, m]));
      const sf1t1 = qfByPos.get(1)?.winner_id;
      const sf1t2 = qfByPos.get(2)?.winner_id;
      const sf2t1 = qfByPos.get(3)?.winner_id;
      const sf2t2 = qfByPos.get(4)?.winner_id;

      if (!sf1t1 || !sf1t2 || !sf2t1 || !sf2t2) {
        setMsg('Kunde inte hitta alla vinnare.');
        setGenerating(false);
        return;
      }

      await supabase.from('matches').insert([
        {
          round: 0,
          team1_id: sf1t1,
          team2_id: sf1t2,
          is_playoff: true,
          bracket_stage: 'semifinal',
          bracket_position: 1,
          table_number: 1,
        },
        {
          round: 0,
          team1_id: sf2t1,
          team2_id: sf2t2,
          is_playoff: true,
          bracket_stage: 'semifinal',
          bracket_position: 2,
          table_number: Math.min(2, numTables),
        },
      ]);
      setMsg('Semifinaler skapade!');
    } else if (fromStage === 'semifinal') {
      const sfByPos = new Map(stageMatches.map((m) => [m.bracket_position, m]));
      const sf1 = sfByPos.get(1);
      const sf2 = sfByPos.get(2);

      if (!sf1?.winner_id || !sf2?.winner_id || !sf1?.loser_id || !sf2?.loser_id) {
        setMsg('Kunde inte hitta vinnare/förlorare.');
        setGenerating(false);
        return;
      }

      await supabase.from('matches').insert([
        {
          round: 0,
          team1_id: sf1.winner_id,
          team2_id: sf2.winner_id,
          is_playoff: true,
          bracket_stage: 'final',
          bracket_position: 1,
          table_number: 1,
        },
        {
          round: 0,
          team1_id: sf1.loser_id,
          team2_id: sf2.loser_id,
          is_playoff: true,
          bracket_stage: 'third_place',
          bracket_position: 1,
          table_number: Math.min(2, numTables),
        },
      ]);
      setMsg('Final och bronsmatch skapade!');
    }

    setGenerating(false);
    onRefresh();
  };

  const qfMatches = playoffMatches.filter((m) => m.bracket_stage === 'quarterfinal');
  const sfMatches = playoffMatches.filter((m) => m.bracket_stage === 'semifinal');
  const finalMatch = playoffMatches.filter((m) => m.bracket_stage === 'final');
  const allQfDone = qfMatches.length === 4 && qfMatches.every((m) => m.winner_id);
  const sfExists = sfMatches.length > 0;
  const allSfDone = sfMatches.length === 2 && sfMatches.every((m) => m.winner_id);
  const finalExists = finalMatch.length > 0;

  return (
    <div className="space-y-6">
      {/* Bracket visualization */}
      {playoffStarted && playoffMatches.length > 0 && (
        <div className={cn('rounded-2xl p-5 border', cardBg, cardBorder)}>
          <h3 className="text-sm font-semibold text-foreground mb-4">Slutspelsträd</h3>
          <Bracket matches={matches} teams={teams} />
        </div>
      )}

      {/* Generate playoffs */}
      {!playoffStarted && (
        <div className={cn('rounded-2xl p-5 border', cardBg, cardBorder)}>
          <h3 className="text-sm font-semibold text-foreground mb-3">Starta slutspel</h3>
          <p className={cn('text-sm mb-4', themeText(theme, 'secondary'))}>
            Topp 8 från grundserien seedas: 1 vs 8, 2 vs 7, 3 vs 6, 4 vs 5.
          </p>
          <button
            onClick={handleGeneratePlayoffs}
            disabled={generating || teams.length < 8}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-brand-500 text-white hover:brightness-110 transition-all disabled:opacity-40"
          >
            {generating ? 'Skapar…' : 'Generera slutspel'}
          </button>
          {teams.length < 8 && (
            <p className="text-sm text-amber-400 mt-2">
              Minst 8 lag krävs ({teams.length} registrerade).
            </p>
          )}
        </div>
      )}

      {/* Advance buttons */}
      {playoffStarted && (
        <div className={cn('rounded-2xl p-5 border', cardBg, cardBorder)}>
          <h3 className="text-sm font-semibold text-foreground mb-4">Avancera</h3>
          <div className="flex flex-wrap gap-3">
            {allQfDone && !sfExists && (
              <button
                onClick={() => handleAdvance('quarterfinal')}
                disabled={generating}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-brand-500 text-white hover:brightness-110 disabled:opacity-40"
              >
                {generating ? 'Skapar…' : 'Skapa semifinaler →'}
              </button>
            )}
            {allSfDone && !finalExists && (
              <button
                onClick={() => handleAdvance('semifinal')}
                disabled={generating}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-brand-500 text-white hover:brightness-110 disabled:opacity-40"
              >
                {generating ? 'Skapar…' : 'Skapa final →'}
              </button>
            )}
            {!allQfDone && qfMatches.length > 0 && (
              <p className={cn('text-sm', themeText(theme, 'secondary'))}>
                Väntar på kvartsfinaler ({qfMatches.filter((m) => m.winner_id).length}/4)
              </p>
            )}
            {sfExists && !allSfDone && (
              <p className={cn('text-sm', themeText(theme, 'secondary'))}>
                Väntar på semifinaler ({sfMatches.filter((m) => m.winner_id).length}/2)
              </p>
            )}
            {finalMatch[0]?.winner_id && (
              <p
                className={cn(
                  'text-sm font-semibold',
                  theme === 'dark' ? 'text-amber-400' : 'text-amber-600',
                )}
              >
                🏆 Turnering avslutad!
              </p>
            )}
          </div>
        </div>
      )}

      {/* Match list */}
      {playoffMatches.length > 0 && (
        <div className={cn('rounded-2xl p-5 border', cardBg, cardBorder)}>
          <h3 className="text-sm font-semibold text-foreground mb-4">Slutspelsmatcher</h3>
          <div className="space-y-2">
            {playoffMatches.map((m) => {
              const label =
                m.bracket_stage === 'quarterfinal'
                  ? 'KF'
                  : m.bracket_stage === 'semifinal'
                    ? 'SF'
                    : m.bracket_stage === 'final'
                      ? 'Final'
                      : 'Brons';
              return (
                <div
                  key={m.id}
                  className={cn(
                    'flex items-center justify-between px-4 py-3 rounded-xl border',
                    theme === 'dark'
                      ? 'bg-white/[0.02] border-white/[0.04]'
                      : 'bg-white border-zinc-100',
                  )}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <span
                      className={cn(
                        'w-10 text-center text-[10px] font-bold uppercase',
                        theme === 'dark' ? 'text-brand-400' : 'text-brand-600',
                      )}
                    >
                      {label}
                      {m.bracket_position ?? ''}
                    </span>
                    <span
                      className={cn(
                        'text-sm font-medium',
                        m.winner_id === m.team1_id ? 'text-emerald-400' : 'text-foreground',
                      )}
                    >
                      {teamMap.get(m.team1_id)?.name ?? '?'}
                    </span>
                    <span className={cn('text-xs', themeText(theme, 'secondary'))}>vs</span>
                    <span
                      className={cn(
                        'text-sm font-medium',
                        m.winner_id === m.team2_id ? 'text-emerald-400' : 'text-foreground',
                      )}
                    >
                      {teamMap.get(m.team2_id)?.name ?? '?'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.score_team1 !== null && m.score_team2 !== null && (
                      <span className="text-sm font-mono font-bold text-foreground">
                        {m.score_team1}–{m.score_team2}
                      </span>
                    )}
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-[10px] font-semibold',
                        m.confirmed
                          ? theme === 'dark'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-emerald-50 text-emerald-600'
                          : m.winner_id
                            ? theme === 'dark'
                              ? 'bg-amber-500/15 text-amber-400'
                              : 'bg-amber-50 text-amber-600'
                            : theme === 'dark'
                              ? 'bg-zinc-500/15 text-zinc-500'
                              : 'bg-zinc-100 text-zinc-400',
                      )}
                    >
                      {m.confirmed ? 'OK' : m.winner_id ? 'Väntar' : 'Ospelad'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {msg && (
        <p
          className={cn(
            'text-sm',
            msg.includes('skapad') || msg.includes('Startat') ? 'text-emerald-400' : 'text-red-400',
          )}
        >
          {msg}
        </p>
      )}
    </div>
  );
}

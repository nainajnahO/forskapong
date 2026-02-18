import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { Team, Match } from '@/lib/database.types';
import {
  calculateRankings,
  type TournamentTeam,
  type MatchResult,
  type TeamStanding,
} from '@/lib/tournament-engine';
import TeamFormModal from '../components/TeamFormModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';

function dbMatchToResult(m: Match): MatchResult | null {
  if (!m.winner_id || !m.loser_id) return null;
  return {
    team1Id: m.team1_id,
    team2Id: m.team2_id,
    winnerId: m.winner_id,
    loserId: m.loser_id,
    scoreTeam1: m.score_team1 ?? 0,
    scoreTeam2: m.score_team2 ?? 0,
  };
}

export default function TeamsTab() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deletingTeam, setDeletingTeam] = useState<Team | null>(null);

  const loadData = useCallback(async () => {
    const [teamsRes, matchesRes] = await Promise.all([
      supabase.from('teams').select('*'),
      supabase.from('matches').select('*'),
    ]);
    setTeams(teamsRes.data ?? []);
    setMatches(matchesRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const channel = supabase
      .channel('admin-teams')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => loadData())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  // Compute standings for sorting & stats
  const standings = useMemo(() => {
    const results = matches.map(dbMatchToResult).filter(Boolean) as MatchResult[];
    const engineTeams: TournamentTeam[] = teams.map((t) => {
      const wins = results.filter((r) => r.winnerId === t.id).length;
      const losses = results.filter((r) => r.loserId === t.id).length;
      return { id: t.id, name: t.name, wins, losses };
    });
    return calculateRankings(engineTeams, results);
  }, [teams, matches]);

  // Map team id → standing for quick lookup
  const standingMap = useMemo(
    () => new Map(standings.map((s) => [s.id, s])),
    [standings],
  );

  const hasMatches = matches.length > 0;

  // Sort teams by rank (from standings) when tournament has started, otherwise by created_at
  const sorted = useMemo(() => {
    if (!hasMatches) return teams;
    return [...teams].sort((a, b) => {
      const ra = standingMap.get(a.id)?.rank ?? Infinity;
      const rb = standingMap.get(b.id)?.rank ?? Infinity;
      return ra - rb;
    });
  }, [teams, standingMap, hasMatches]);

  const filtered = sorted.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.code.toLowerCase().includes(q) ||
      (t.player1 ?? '').toLowerCase().includes(q) ||
      (t.player2 ?? '').toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <motion.div
          className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Sök lag…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={cn(
            'flex-1 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] px-3',
            'text-white text-sm placeholder:text-zinc-600 outline-none',
            'focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30',
          )}
        />
        <button
          onClick={() => setShowCreate(true)}
          className={cn(
            'h-10 px-4 rounded-xl text-sm font-medium transition-all whitespace-nowrap',
            'bg-brand-500 text-white shadow-lg shadow-brand-500/20',
            'hover:brightness-110 active:scale-[0.98]',
          )}
        >
          + Skapa lag
        </button>
      </div>

      {/* Count */}
      <p className="text-xs text-zinc-600">
        {filtered.length} lag {search && `(av ${teams.length})`}
      </p>

      {/* Table */}
      <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
        {/* Header row */}
        <div
          className={cn(
            'grid gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02] text-xs text-zinc-500',
            hasMatches
              ? 'grid-cols-[2.5rem_1fr_1fr_5rem_3rem_3rem_3rem_3rem_4.5rem]'
              : 'grid-cols-[2.5rem_1fr_1fr_5rem_4rem_4.5rem]',
          )}
        >
          <span className="text-center">#</span>
          <span>Namn</span>
          <span>Spelare</span>
          <span className="text-center">Kod</span>
          {hasMatches ? (
            <>
              <span className="text-center">V</span>
              <span className="text-center">F</span>
              <span className="text-center" title="Buchholz">BH</span>
              <span className="text-center">Cups</span>
            </>
          ) : (
            <span className="text-center">V/F</span>
          )}
          <span />
        </div>

        {filtered.length === 0 ? (
          <div className="py-8 text-center text-zinc-600 text-sm">
            {search ? 'Inga lag matchar sökningen' : 'Inga lag ännu'}
          </div>
        ) : (
          filtered.map((team, i) => {
            const s = standingMap.get(team.id);
            return (
              <motion.div
                key={team.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                className={cn(
                  'grid gap-2 px-4 py-2.5 border-b border-white/[0.04] last:border-0 text-sm items-center',
                  hasMatches
                    ? 'grid-cols-[2.5rem_1fr_1fr_5rem_3rem_3rem_3rem_3rem_4.5rem]'
                    : 'grid-cols-[2.5rem_1fr_1fr_5rem_4rem_4.5rem]',
                )}
              >
                <span className="text-zinc-600 text-center font-mono text-xs">
                  {s?.rank ?? i + 1}
                </span>
                <span className="text-white truncate">{team.name}</span>
                <span className="text-zinc-400 truncate text-xs">
                  {[team.player1, team.player2].filter(Boolean).join(', ') || '—'}
                </span>
                <span className="text-zinc-500 text-center font-mono text-xs">
                  {team.code}
                </span>
                {hasMatches ? (
                  <>
                    <span className="text-emerald-400 text-center font-mono text-xs">{s?.wins ?? 0}</span>
                    <span className="text-red-400 text-center font-mono text-xs">{s?.losses ?? 0}</span>
                    <span className="text-zinc-400 text-center font-mono text-xs">{s?.opponentWins ?? 0}</span>
                    <span className="text-zinc-400 text-center font-mono text-xs">{s?.totalCupsHit ?? 0}</span>
                  </>
                ) : (
                  <span className="text-center text-xs">
                    <span className="text-emerald-400">{team.wins}</span>
                    <span className="text-zinc-600">/</span>
                    <span className="text-red-400">{team.losses}</span>
                  </span>
                )}
                <div className="flex gap-1 justify-end">
                  <button
                    onClick={() => setEditingTeam(team)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.06] transition"
                    title="Redigera"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setDeletingTeam(team)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition"
                    title="Radera"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Modals */}
      {(showCreate || editingTeam) && (
        <TeamFormModal
          team={editingTeam}
          onClose={() => {
            setShowCreate(false);
            setEditingTeam(null);
          }}
          onSaved={() => {
            setShowCreate(false);
            setEditingTeam(null);
            loadData();
          }}
        />
      )}

      {deletingTeam && (
        <DeleteConfirmModal
          teamId={deletingTeam.id}
          teamName={deletingTeam.name}
          onClose={() => setDeletingTeam(null)}
          onDeleted={() => {
            setDeletingTeam(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

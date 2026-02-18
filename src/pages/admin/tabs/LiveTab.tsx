import { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { Team, Match, Tournament } from '@/lib/database.types';
import MatchResultEditor from '../components/MatchResultEditor';
import type { AdminTab } from '../components/AdminTabBar';

interface LiveTabProps {
  onTabChange: (tab: AdminTab) => void;
}

export default function LiveTab({ onTabChange }: LiveTabProps) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [completedOpen, setCompletedOpen] = useState(false);

  const loadData = useCallback(async () => {
    const [tRes, teamsRes, matchesRes] = await Promise.all([
      supabase.from('tournament').select('*').maybeSingle(),
      supabase.from('teams').select('*'),
      supabase.from('matches').select('*').order('round', { ascending: true }),
    ]);

    setTournament(tRes.data);
    setTeams(teamsRes.data ?? []);
    setMatches(matchesRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('admin-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => loadData())
      .subscribe((_status, err) => {
        if (!err) loadData();
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const teamNameMap = new Map(teams.map((t) => [t.id, t.name]));
  const currentRound = tournament?.current_round ?? 0;
  const status = tournament?.status ?? 'not_started';

  const currentRoundMatches = matches.filter((m) => m.round === currentRound);
  const disputed = matches.filter((m) => m.confirmed_by === 'disputed' && !m.confirmed);
  const unconfirmed = matches.filter(
    (m) => m.winner_id && !m.confirmed && m.confirmed_by !== 'disputed',
  );
  const completed = matches.filter((m) => m.confirmed);

  const confirmedCurrent = currentRoundMatches.filter((m) => m.confirmed).length;
  const totalCurrent = currentRoundMatches.length;
  const progressPct = totalCurrent > 0 ? (confirmedCurrent / totalCurrent) * 100 : 0;

  function MatchRow({ match }: { match: Match }) {
    const t1 = teamNameMap.get(match.team1_id) ?? '?';
    const t2 = teamNameMap.get(match.team2_id) ?? '?';
    const isDisputed = match.confirmed_by === 'disputed' && !match.confirmed;
    const isConfirmed = match.confirmed;
    const hasResult = !!match.winner_id;

    if (editingMatchId === match.id) {
      return (
        <MatchResultEditor
          match={match}
          team1Name={t1}
          team2Name={t2}
          onSaved={() => {
            setEditingMatchId(null);
            loadData();
          }}
          onCancel={() => setEditingMatchId(null)}
        />
      );
    }

    return (
      <button
        onClick={() => setEditingMatchId(match.id)}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all',
          isDisputed
            ? 'bg-amber-500/[0.06] border-amber-500/20 hover:bg-amber-500/[0.1]'
            : isConfirmed
              ? 'bg-emerald-500/[0.04] border-emerald-500/15 hover:bg-emerald-500/[0.08]'
              : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]',
        )}
      >
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-600 font-mono">R{match.round}</span>
          <span className="text-sm text-white">{t1} vs {t2}</span>
        </div>
        <div className="flex items-center gap-3">
          {hasResult && (
            <span className="text-xs font-mono text-zinc-400">
              {match.score_team1}–{match.score_team2}
            </span>
          )}
          {isDisputed && (
            <span className="text-xs font-medium text-amber-400 px-2 py-0.5 rounded-full bg-amber-500/10">
              Disputerad
            </span>
          )}
          {isConfirmed && (
            <span className="text-xs font-medium text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10">
              Klar
            </span>
          )}
          {hasResult && !isConfirmed && !isDisputed && (
            <span className="text-xs font-medium text-zinc-400 px-2 py-0.5 rounded-full bg-white/[0.06]">
              Obekräftad
            </span>
          )}
        </div>
      </button>
    );
  }

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

  if (status === 'not_started') {
    return (
      <div className="text-center py-16">
        <p className="text-lg text-zinc-400">Turneringen har inte startat</p>
        <p className="text-sm text-zinc-600 mt-2">Konfigurera och starta turneringen från Turnering-fliken.</p>
        <button
          onClick={() => onTabChange('tournament')}
          className={cn(
            'mt-4 px-5 py-2.5 rounded-xl text-sm font-medium transition-all inline-flex items-center gap-2',
            'bg-brand-500 text-white shadow-lg shadow-brand-500/20 hover:brightness-110',
          )}
        >
          Gå till Turnering
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: 'Registrerade lag', value: teams.length },
          { label: `Runda ${currentRound} av 7`, value: status === 'knockout' ? 'Slutspel' : `${confirmedCurrent}/${totalCurrent}` },
          { label: 'Matcher totalt', value: matches.length },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex-1 min-w-[140px] px-4 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02]"
          >
            <p className="text-xs text-zinc-500">{stat.label}</p>
            <p className="text-lg font-bold text-white mt-0.5">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {totalCurrent > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">Runda {currentRound} framsteg</span>
            <span className="text-zinc-400 font-mono">{confirmedCurrent}/{totalCurrent}</span>
          </div>
          <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-brand-500"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}

      {/* Disputed */}
      {disputed.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-amber-400">
            Disputerade ({disputed.length})
          </h3>
          {disputed.map((m) => <MatchRow key={m.id} match={m} />)}
        </div>
      )}

      {/* Unconfirmed */}
      {unconfirmed.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-zinc-400">
            Obekräftade ({unconfirmed.length})
          </h3>
          {unconfirmed.map((m) => <MatchRow key={m.id} match={m} />)}
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setCompletedOpen(!completedOpen)}
            className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-300 transition"
          >
            <span className={cn('transition-transform', completedOpen && 'rotate-90')}>&#9654;</span>
            Klara ({completed.length})
          </button>
          {completedOpen && completed.map((m) => <MatchRow key={m.id} match={m} />)}
        </div>
      )}

      {/* Projector link */}
      <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <p className="text-xs text-zinc-500 mb-1">Projektorlänk</p>
        <a
          href="/display"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-brand-400 hover:text-brand-300 transition underline underline-offset-2"
        >
          /display
        </a>
        <p className="text-xs text-zinc-600 mt-1">Öppna i nytt fönster för storbildsvisning</p>
      </div>
    </div>
  );
}

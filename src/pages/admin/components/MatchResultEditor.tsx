import { useState } from 'react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { Match } from '@/lib/database.types';

interface Props {
  match: Match;
  team1Name: string;
  team2Name: string;
  onSaved: () => void;
  onCancel: () => void;
}

export default function MatchResultEditor({
  match,
  team1Name,
  team2Name,
  onSaved,
  onCancel,
}: Props) {
  const [score1, setScore1] = useState(match.score_team1 ?? 0);
  const [score2, setScore2] = useState(match.score_team2 ?? 0);
  const [tiebreakWinner, setTiebreakWinner] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const tied = score1 === score2;
  const winnerId = tied
    ? tiebreakWinner
    : score1 > score2
      ? match.team1_id
      : match.team2_id;
  const loserId =
    winnerId === match.team1_id ? match.team2_id :
    winnerId === match.team2_id ? match.team1_id :
    null;

  const canSave = winnerId !== null && loserId !== null;

  async function handleSave() {
    if (!winnerId || !loserId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('matches')
        .update({
          winner_id: winnerId,
          loser_id: loserId,
          score_team1: score1,
          score_team2: score2,
          confirmed: true,
          confirmed_by: 'admin',
        })
        .eq('id', match.id);
      if (error) throw error;
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 py-2 px-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
      <span className={cn('text-sm', winnerId === match.team1_id ? 'text-emerald-400 font-medium' : 'text-white')}>
        {team1Name}
      </span>

      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min={0}
          max={6}
          value={score1}
          onChange={(e) => {
            setScore1(Number(e.target.value));
            setTiebreakWinner(null);
          }}
          className="w-12 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-center text-sm outline-none focus:border-brand-500"
        />
        <span className="text-zinc-600">&ndash;</span>
        <input
          type="number"
          min={0}
          max={6}
          value={score2}
          onChange={(e) => {
            setScore2(Number(e.target.value));
            setTiebreakWinner(null);
          }}
          className="w-12 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-center text-sm outline-none focus:border-brand-500"
        />
      </div>

      <span className={cn('text-sm', winnerId === match.team2_id ? 'text-emerald-400 font-medium' : 'text-white')}>
        {team2Name}
      </span>

      {/* Tied-score winner selector */}
      {tied && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-500">Vinnare:</span>
          <button
            onClick={() => setTiebreakWinner(match.team1_id)}
            className={cn(
              'px-2 py-1 text-xs rounded-md border transition-all',
              tiebreakWinner === match.team1_id
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'text-zinc-400 border-white/[0.08] hover:border-white/[0.15]',
            )}
          >
            {team1Name}
          </button>
          <button
            onClick={() => setTiebreakWinner(match.team2_id)}
            className={cn(
              'px-2 py-1 text-xs rounded-md border transition-all',
              tiebreakWinner === match.team2_id
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'text-zinc-400 border-white/[0.08] hover:border-white/[0.15]',
            )}
          >
            {team2Name}
          </button>
        </div>
      )}

      <div className="flex gap-2 ml-auto">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs text-zinc-400 border border-white/[0.08] rounded-lg hover:opacity-80 transition"
        >
          Avbryt
        </button>
        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
            'bg-brand-500 text-white',
            'disabled:opacity-50 disabled:pointer-events-none',
          )}
        >
          {saving ? '...' : 'Spara'}
        </button>
      </div>
    </div>
  );
}

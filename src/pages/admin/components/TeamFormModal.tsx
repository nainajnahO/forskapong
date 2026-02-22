import { useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { Team } from '@/lib/database.types';

interface Props {
  team: Team | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function TeamFormModal({ team, onClose, onSaved }: Props) {
  const isEdit = team !== null;
  const [name, setName] = useState(team?.name ?? '');
  const [player1, setPlayer1] = useState(team?.player1 ?? '');
  const [player2, setPlayer2] = useState(team?.player2 ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setError('');

    try {
      if (isEdit) {
        const { error: err } = await supabase
          .from('teams')
          .update({
            name: name.trim(),
            player1: player1.trim() || null,
            player2: player2.trim() || null,
          })
          .eq('id', team.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.rpc('register_team', {
          team_name: name.trim(),
        });
        if (err) throw err;
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Något gick fel');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.form
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onSubmit={handleSubmit}
        className="relative w-full max-w-md rounded-2xl border border-white/[0.08] bg-zinc-900 p-6 space-y-5"
      >
        <h2 className="text-lg font-bold text-white">
          {isEdit ? 'Redigera lag' : 'Skapa lag'}
        </h2>

        <div className="space-y-4">
          <label className="block">
            <span className="text-sm text-zinc-400 mb-1.5 block">Lagnamn *</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
              className={cn(
                'w-full h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] px-3',
                'text-white text-sm outline-none',
                'focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30',
              )}
            />
          </label>

          {isEdit && (
            <>
              <label className="block">
                <span className="text-sm text-zinc-400 mb-1.5 block">Spelare 1</span>
                <input
                  type="text"
                  value={player1}
                  onChange={(e) => setPlayer1(e.target.value)}
                  className={cn(
                    'w-full h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] px-3',
                    'text-white text-sm outline-none',
                    'focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30',
                  )}
                />
              </label>
              <label className="block">
                <span className="text-sm text-zinc-400 mb-1.5 block">Spelare 2</span>
                <input
                  type="text"
                  value={player2}
                  onChange={(e) => setPlayer2(e.target.value)}
                  className={cn(
                    'w-full h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] px-3',
                    'text-white text-sm outline-none',
                    'focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30',
                  )}
                />
              </label>
            </>
          )}
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-3 justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-zinc-400 border border-white/[0.08] hover:opacity-80 transition"
          >
            Avbryt
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium transition-all',
              'bg-brand-500 text-white shadow-lg shadow-brand-500/20',
              'hover:brightness-110 active:scale-[0.98]',
              'disabled:opacity-50 disabled:pointer-events-none',
            )}
          >
            <span className="hdr-white-fill">{saving ? 'Sparar…' : isEdit ? 'Spara' : 'Skapa'}</span>
          </button>
        </div>
      </motion.form>
    </div>
  );
}

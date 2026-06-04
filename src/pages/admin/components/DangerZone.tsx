import { useState } from 'react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { Tournament } from '@/lib/database.types';
import TypedConfirmModal from './TypedConfirmModal';

interface Props {
  tournament: Tournament | null;
  currentRound: number;
  onActionComplete: () => void;
}

export default function DangerZone({ currentRound, onActionComplete }: Props) {
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<'reset' | 'clear-round' | null>(null);

  async function handleResetTournament() {
    const adminCode = sessionStorage.getItem('adminCode');
    if (!adminCode) throw new Error('Logga in som admin igen');
    // One transactional RPC: wipe matches, reset the tournament row + all team W/L.
    const { error } = await supabase.rpc('admin_reset_tournament', { admin_code: adminCode });
    if (error) throw error;
    onActionComplete();
  }

  async function handleClearRound() {
    const adminCode = sessionStorage.getItem('adminCode');
    if (!adminCode) throw new Error('Logga in som admin igen');
    const { error } = await supabase.rpc('admin_clear_round', {
      admin_code: adminCode,
      p_round: currentRound,
    });
    if (error) throw error;
    onActionComplete();
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-xs text-red-400/60 hover:text-red-400 transition"
      >
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        {open ? 'Dölj farozon' : 'Farozon'}
      </button>

      {open && (
        <div className="space-y-3 p-4 rounded-2xl border border-red-500/20 bg-red-500/[0.04]">
          <p className="text-xs text-red-400/70">Dessa åtgärder kan inte ångras.</p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setModal('reset')}
              className={cn(
                'px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                'bg-red-500/15 text-red-400 border border-red-500/20',
                'hover:bg-red-500/25',
              )}
            >
              Nollställ turnering
            </button>

            {currentRound > 0 && (
              <button
                onClick={() => setModal('clear-round')}
                className={cn(
                  'px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                  'bg-red-500/15 text-red-400 border border-red-500/20',
                  'hover:bg-red-500/25',
                )}
              >
                Rensa runda {currentRound}
              </button>
            )}
          </div>
        </div>
      )}

      {modal === 'reset' && (
        <TypedConfirmModal
          title="Nollställ turnering"
          description="Alla matcher raderas, turneringen återställs till starttillstånd och alla lags vinster/förluster nollställs."
          confirmPhrase="NOLLSTÄLL"
          confirmLabel="Nollställ"
          onConfirm={handleResetTournament}
          onClose={() => setModal(null)}
        />
      )}

      {modal === 'clear-round' && (
        <TypedConfirmModal
          title={`Rensa runda ${currentRound}`}
          description={`Alla matcher i runda ${currentRound} raderas. Turneringsstatusen påverkas inte.`}
          confirmPhrase={String(currentRound)}
          confirmLabel="Rensa"
          onConfirm={handleClearRound}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

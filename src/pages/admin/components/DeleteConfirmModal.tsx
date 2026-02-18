import { useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface Props {
  teamId: string;
  teamName: string;
  onClose: () => void;
  onDeleted: () => void;
}

export default function DeleteConfirmModal({
  teamId,
  teamName,
  onClose,
  onDeleted,
}: Props) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    setDeleting(true);
    setError('');
    try {
      const { error: err } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);
      if (err) throw err;
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Något gick fel');
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-sm rounded-2xl border border-white/[0.08] bg-zinc-900 p-6 space-y-5"
      >
        <h2 className="text-lg font-bold text-white">Radera lag?</h2>
        <p className="text-sm text-zinc-400">
          Är du säker på att du vill radera{' '}
          <span className="text-white font-medium">{teamName}</span>? Detta går
          inte att ångra.
        </p>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-zinc-400 border border-white/[0.08] hover:opacity-80 transition"
          >
            Avbryt
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium transition-all',
              'bg-red-500/15 text-red-400 border border-red-500/20',
              'hover:bg-red-500/25 active:scale-[0.98]',
              'disabled:opacity-50 disabled:pointer-events-none',
            )}
          >
            {deleting ? 'Raderar…' : 'Radera'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

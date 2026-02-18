import { useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface Props {
  title: string;
  description: string;
  confirmPhrase: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export default function TypedConfirmModal({
  title,
  description,
  confirmPhrase,
  confirmLabel,
  onConfirm,
  onClose,
}: Props) {
  const [input, setInput] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  const matches = input === confirmPhrase;

  async function handleConfirm() {
    if (!matches) return;
    setRunning(true);
    setError('');
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Något gick fel');
      setRunning(false);
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
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <p className="text-sm text-zinc-400">{description}</p>

        <div className="space-y-2">
          <p className="text-xs text-zinc-500">
            Skriv <span className="text-red-400 font-mono font-bold">{confirmPhrase}</span> för att bekräfta:
          </p>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full h-10 px-3 rounded-xl text-sm bg-white/[0.04] border border-white/[0.08] text-white outline-none focus:border-red-500"
            autoFocus
          />
        </div>

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
            onClick={handleConfirm}
            disabled={!matches || running}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium transition-all',
              'bg-red-500/15 text-red-400 border border-red-500/20',
              'hover:bg-red-500/25 active:scale-[0.98]',
              'disabled:opacity-30 disabled:pointer-events-none',
            )}
          >
            {running ? 'Kör…' : confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

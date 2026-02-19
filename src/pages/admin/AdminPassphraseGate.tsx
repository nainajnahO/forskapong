import { useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

const PASSPHRASE = import.meta.env.VITE_ADMIN_PASSPHRASE ?? 'ADMIN2026';

interface Props {
  onAuthenticated: () => void;
}

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (value === PASSPHRASE) {
      sessionStorage.setItem('adminAuth', 'true');
      onAuthenticated();
    } else {
      setError(true);
      setTimeout(() => setError(false), 1500);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-6 text-center"
      >
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Admin</h1>
          <p className="text-zinc-500 text-sm">Ange adminkod</p>
        </div>

        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="••••••••"
          autoFocus
          className={cn(
            'w-full h-12 rounded-xl bg-white/[0.04] border px-4 text-center text-white',
            'placeholder:text-zinc-600 outline-none transition-colors',
            'focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30',
            error
              ? 'border-red-500/50 bg-red-500/5'
              : 'border-white/[0.08]',
          )}
        />

        <button
          type="submit"
          className={cn(
            'w-full h-12 rounded-xl font-medium transition-all',
            'bg-brand-500 text-white shadow-lg shadow-brand-500/20',
            'hover:brightness-110 active:scale-[0.98]',
          )}
        >
          Logga in
        </button>

        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-red-400 text-sm"
          >
            Fel kod
          </motion.p>
        )}
      </motion.form>
    </div>
  );
}

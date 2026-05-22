import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { Team } from '@/lib/database.types';

interface BulkRegisteredTeam {
  id: string;
  name: string;
  code: string;
}

interface Props {
  existingTeams: Team[];
  onClose: () => void;
  onImported: () => void;
}

function normalizeName(name: string) {
  return name.trim().toLowerCase();
}

function csvEscape(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function buildCsv(teams: BulkRegisteredTeam[]) {
  return [
    ['team_name', 'code'],
    ...teams.map((team) => [team.name, team.code]),
  ]
    .map((row) => row.map(csvEscape).join(','))
    .join('\n');
}

function downloadCsv(teams: BulkRegisteredTeam[]) {
  const blob = new Blob([buildCsv(teams)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'forskapong-team-codes.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function TeamBulkImportModal({ existingTeams, onClose, onImported }: Props) {
  const [rawNames, setRawNames] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [createdTeams, setCreatedTeams] = useState<BulkRegisteredTeam[]>([]);

  const parsedNames = useMemo(
    () => rawNames.split(/\r?\n/).map((name) => name.trim()).filter(Boolean),
    [rawNames],
  );

  const existingNames = useMemo(
    () => new Set(existingTeams.map((team) => normalizeName(team.name))),
    [existingTeams],
  );

  const duplicateInputNames = useMemo(() => {
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    parsedNames.forEach((name) => {
      const normalized = normalizeName(name);
      if (seen.has(normalized)) duplicates.add(name);
      seen.add(normalized);
    });
    return [...duplicates];
  }, [parsedNames]);

  const existingDuplicateNames = useMemo(
    () => parsedNames.filter((name) => existingNames.has(normalizeName(name))),
    [existingNames, parsedNames],
  );

  const canSubmit =
    parsedNames.length > 0 &&
    duplicateInputNames.length === 0 &&
    existingDuplicateNames.length === 0 &&
    !saving;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    const adminCode = sessionStorage.getItem('adminCode');
    if (!adminCode) {
      setError('Logga in som admin igen innan du importerar lag.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const { data, error: err } = await supabase.rpc('bulk_register_teams', {
        team_names: parsedNames,
        admin_code: adminCode,
      });
      if (err) throw err;

      const created = data ?? [];
      setCreatedTeams(created);
      downloadCsv(created);
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte importera lag');
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
        className="relative w-full max-w-2xl rounded-2xl border border-white/[0.08] bg-zinc-900 p-6 space-y-5"
      >
        <div>
          <h2 className="text-lg font-bold text-white">Importera lag</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Klistra in ett lagnamn per rad. Koder skapas automatiskt och laddas ner som CSV.
          </p>
        </div>

        <label className="block">
          <span className="text-sm text-zinc-400 mb-1.5 block">Lagnamn</span>
          <textarea
            value={rawNames}
            onChange={(e) => {
              setRawNames(e.target.value);
              setCreatedTeams([]);
              setError('');
            }}
            rows={12}
            placeholder={'Lag 1\nLag 2\nLag 3'}
            autoFocus
            className={cn(
              'w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 py-2',
              'text-white text-sm outline-none resize-y',
              'placeholder:text-zinc-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30',
            )}
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2">
            <span className="text-zinc-500">Nya lag</span>
            <p className="mt-1 text-white font-mono">{parsedNames.length}</p>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2">
            <span className="text-zinc-500">Dubbletter i listan</span>
            <p className={cn('mt-1 font-mono', duplicateInputNames.length ? 'text-red-400' : 'text-white')}>
              {duplicateInputNames.length}
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2">
            <span className="text-zinc-500">Finns redan</span>
            <p className={cn('mt-1 font-mono', existingDuplicateNames.length ? 'text-red-400' : 'text-white')}>
              {existingDuplicateNames.length}
            </p>
          </div>
        </div>

        {duplicateInputNames.length > 0 && (
          <p className="text-red-400 text-sm">
            Dubbletter i listan: {duplicateInputNames.join(', ')}
          </p>
        )}

        {existingDuplicateNames.length > 0 && (
          <p className="text-red-400 text-sm">
            Finns redan i systemet: {existingDuplicateNames.join(', ')}
          </p>
        )}

        {createdTeams.length > 0 && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
            <p className="text-emerald-300 text-sm">
              {createdTeams.length} lag skapades. CSV-filen har laddats ner.
            </p>
            <button
              type="button"
              onClick={() => downloadCsv(createdTeams)}
              className="mt-2 text-xs text-emerald-200 underline underline-offset-4 hover:text-white"
            >
              Ladda ner CSV igen
            </button>
          </div>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-3 justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-zinc-400 border border-white/[0.08] hover:opacity-80 transition"
          >
            Stäng
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium transition-all',
              'bg-brand-500 text-white shadow-lg shadow-brand-500/20',
              'hover:brightness-110 active:scale-[0.98]',
              'disabled:opacity-50 disabled:pointer-events-none',
            )}
          >
            <span className="hdr-white-fill">{saving ? 'Importerar...' : 'Skapa lag och ladda ner CSV'}</span>
          </button>
        </div>
      </motion.form>
    </div>
  );
}

import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useTheme } from '@/contexts/useTheme';
import { cn } from '@/lib/utils';
import { themeText } from '@/lib/theme-utils';
import { supabase } from '@/lib/supabase';
import Container from '../components/common/Container';
import SectionLabel from '../components/common/SectionLabel';

const TOTAL_LENGTH = 6;
const LETTER_COUNT = 3;

function isValidAtPosition(char: string, position: number) {
  if (position < LETTER_COUNT) return /^[a-zA-Z]$/.test(char);
  return /^[0-9]$/.test(char);
}

export default function Play() {
  const { theme } = useTheme();
  const [values, setValues] = useState<string[]>(Array(TOTAL_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = useCallback(
    (index: number, rawValue: string) => {
      const char = rawValue.slice(-1);
      if (!char) return;

      if (!isValidAtPosition(char, index)) {
        setError(
          index < LETTER_COUNT
            ? `Position ${index + 1} måste vara en bokstav`
            : `Position ${index + 1} måste vara en siffra`,
        );
        return;
      }

      setError('');
      const next = [...values];
      next[index] = char.toUpperCase();
      setValues(next);

      if (index < TOTAL_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [values],
  );

  const handleSubmit = useCallback(async () => {
    const code = values.join('');
    if (code.length < TOTAL_LENGTH) {
      setError('Fyll i alla 6 tecken');
      return;
    }
    setIsSubmitting(true);
    setError('');

    try {
      const { data: team, error: dbError } = await supabase
        .from('teams')
        .select('*')
        .eq('code', code)
        .maybeSingle();

      if (dbError) {
        setError('Något gick fel. Försök igen.');
        setIsSubmitting(false);
        return;
      }

      if (!team) {
        setError('Ogiltig kod — hittades inte');
        setIsSubmitting(false);
        return;
      }

      // Store team info for the session
      sessionStorage.setItem('playCode', team.code);
      sessionStorage.setItem('teamId', team.id);
      sessionStorage.setItem('teamName', team.name);
      navigate('/play/dashboard');
    } catch {
      setError('Kunde inte ansluta. Kontrollera din uppkoppling.');
      setIsSubmitting(false);
    }
  }, [values, navigate]);

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace') {
        e.preventDefault();
        const next = [...values];
        if (values[index]) {
          next[index] = '';
          setValues(next);
        } else if (index > 0) {
          next[index - 1] = '';
          setValues(next);
          inputRefs.current[index - 1]?.focus();
        }
        setError('');
      } else if (e.key === 'ArrowLeft' && index > 0) {
        inputRefs.current[index - 1]?.focus();
      } else if (e.key === 'ArrowRight' && index < TOTAL_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      } else if (e.key === 'Enter') {
        handleSubmit();
      }
    },
    [values, handleSubmit],
  );

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim();
    if (pasted.length !== TOTAL_LENGTH) {
      setError('Klistra in en 6-teckens kod (t.ex. ABC123)');
      return;
    }
    const chars = pasted.split('');
    const valid = chars.every((c, i) => isValidAtPosition(c, i));
    if (!valid) {
      setError('Ogiltigt format — 3 bokstäver följt av 3 siffror');
      return;
    }
    setValues(chars.map((c) => c.toUpperCase()));
    setError('');
    inputRefs.current[TOTAL_LENGTH - 1]?.focus();
  }, []);

  const code = values.join('');
  const isComplete = code.length === TOTAL_LENGTH;

  return (
    <section className="relative w-full min-h-[calc(100vh-5rem)] flex items-center justify-center overflow-hidden">
      {/* Subtle radial glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, var(--color-brand-500) 0%, transparent 70%)',
            opacity: 0.04,
          }}
        />
      </div>

      <Container className="relative z-10 flex flex-col items-center">
        <motion.div
          className="flex flex-col items-center text-center max-w-md w-full"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          <SectionLabel variant="gradient">SPELA</SectionLabel>

          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-brand-500 tracking-wider hdr-text-fill mb-4">
            Ange Din Kod
          </h1>

          <p className={cn('text-base md:text-lg mb-10 max-w-sm', themeText(theme, 'secondary'))}>
            Skriv in eller klistra in din 6-teckens åtkomstkod för att komma igång.
          </p>

          {/* Code Input */}
          <motion.div
            className="flex items-center justify-center gap-2 sm:gap-3 mb-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
          >
            {values.map((val, i) => (
              <div key={i} className="relative">
                {/* Separator dot between letters and numbers */}
                {i === LETTER_COUNT && (
                  <div
                    className={cn(
                      'absolute -left-2 sm:-left-2.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full',
                      theme === 'dark' ? 'bg-zinc-600' : 'bg-zinc-300',
                    )}
                  />
                )}
                <input
                  ref={(el) => {
                    inputRefs.current[i] = el;
                  }}
                  type="text"
                  inputMode={i < LETTER_COUNT ? 'text' : 'numeric'}
                  maxLength={2}
                  value={val}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onPaste={i === 0 ? handlePaste : undefined}
                  onFocus={() => setFocusedIndex(i)}
                  onBlur={() => setFocusedIndex(-1)}
                  aria-label={`Tecken ${i + 1} — ${i < LETTER_COUNT ? 'bokstav' : 'siffra'}`}
                  className={cn(
                    'w-12 h-16 sm:w-14 sm:h-[4.5rem] text-center text-2xl sm:text-3xl font-mono font-bold rounded-xl border-2 outline-none transition-all duration-300',
                    'bg-transparent text-foreground',
                    focusedIndex === i
                      ? 'border-brand-500 shadow-[0_0_0_3px_rgba(var(--color-brand-500-rgb,99,102,241),0.15)]'
                      : val
                        ? 'border-brand-500/30'
                        : theme === 'dark'
                          ? 'border-zinc-700/60'
                          : 'border-zinc-300',
                  )}
                />
                {/* Placeholder hint */}
                {!val && focusedIndex !== i && (
                  <span
                    className={cn(
                      'absolute inset-0 flex items-center justify-center text-sm font-mono pointer-events-none',
                      theme === 'dark' ? 'text-zinc-600' : 'text-zinc-400',
                    )}
                    aria-hidden
                  >
                    {i < LETTER_COUNT ? 'A' : '0'}
                  </span>
                )}
              </div>
            ))}
          </motion.div>

          {/* Format hint */}
          <p
            className={cn(
              'text-xs font-mono tracking-[0.3em] mb-8',
              theme === 'dark' ? 'text-zinc-600' : 'text-zinc-400',
            )}
          >
            B O K · S I F
          </p>

          {/* Error message */}
          <motion.div
            initial={false}
            animate={{
              height: error ? 'auto' : 0,
              opacity: error ? 1 : 0,
            }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden w-full"
          >
            <p className="text-center text-sm text-red-400 mb-4">{error}</p>
          </motion.div>

          {/* Submit button */}
          <motion.button
            onClick={handleSubmit}
            disabled={!isComplete || isSubmitting}
            className={cn(
              'w-full max-w-xs py-3.5 rounded-xl font-sans font-semibold text-sm tracking-wide transition-all duration-300',
              'disabled:opacity-30 disabled:cursor-not-allowed',
              isComplete
                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 hover:brightness-110'
                : theme === 'dark'
                  ? 'bg-zinc-800 text-zinc-500'
                  : 'bg-zinc-200 text-zinc-400',
            )}
            whileTap={isComplete && !isSubmitting ? { scale: 0.97 } : undefined}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <motion.svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                    opacity="0.3"
                  />
                  <path
                    d="M12 2a10 10 0 0 1 10 10"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </motion.svg>
                Verifierar…
              </span>
            ) : (
              'Fortsätt'
            )}
          </motion.button>
        </motion.div>
      </Container>
    </section>
  );
}

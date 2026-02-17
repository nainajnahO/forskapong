import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { scheduleScrollLock } from './schedule-scroll-lock';

const TOTAL_LENGTH = 6;
const LETTER_COUNT = 3;

function isValidAtPosition(char: string, position: number) {
  if (position < LETTER_COUNT) return /^[a-zA-Z]$/.test(char);
  return /^[0-9]$/.test(char);
}

interface LoginFormProps {
  theme: 'light' | 'dark';
  side: 'left' | 'right';
}

export default function LoginForm({ theme, side }: LoginFormProps) {
  const [values, setValues] = useState<string[]>(Array(TOTAL_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const formRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const handleInputFocus = useCallback(() => {
    scheduleScrollLock.current = true;
  }, []);

  const handleInputBlur = useCallback(() => {
    requestAnimationFrame(() => {
      const active = document.activeElement;
      if (active instanceof HTMLInputElement && formRef.current?.contains(active)) return;
      scheduleScrollLock.current = false;
    });
  }, []);

  // Ensure lock is released if component unmounts while focused
  useEffect(() => {
    return () => {
      scheduleScrollLock.current = false;
    };
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
        inputRefs.current[index + 1]?.focus({ preventScroll: true });
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
      const { supabase } = await import('@/lib/supabase');
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
          inputRefs.current[index - 1]?.focus({ preventScroll: true });
        }
        setError('');
      } else if (e.key === 'ArrowLeft' && index > 0) {
        inputRefs.current[index - 1]?.focus({ preventScroll: true });
      } else if (e.key === 'ArrowRight' && index < TOTAL_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus({ preventScroll: true });
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
    inputRefs.current[TOTAL_LENGTH - 1]?.focus({ preventScroll: true });
  }, []);

  const code = values.join('');
  const isComplete = code.length === TOTAL_LENGTH;

  return (
    <div ref={formRef} className="mt-3">
      {/* Code Input */}
      <div
        className={cn(
          'flex items-center gap-1.5 sm:gap-2 mb-2',
          side === 'left' ? 'md:justify-end' : 'justify-start',
        )}
      >
        {values.map((val, i) => (
          <div key={i} className="relative">
            {i === LETTER_COUNT && (
              <div
                className={cn(
                  'absolute -left-1.5 sm:-left-2 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full',
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
              onFocus={() => { setFocusedIndex(i); handleInputFocus(); }}
              onBlur={() => { setFocusedIndex(-1); handleInputBlur(); }}
              aria-label={`Tecken ${i + 1} — ${i < LETTER_COUNT ? 'bokstav' : 'siffra'}`}
              className={cn(
                'w-9 h-11 sm:w-10 sm:h-12 text-center text-lg sm:text-xl font-mono font-bold rounded-lg border-2 outline-none transition-all duration-300',
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
            {!val && focusedIndex !== i && (
              <span
                className={cn(
                  'absolute inset-0 flex items-center justify-center text-xs font-mono pointer-events-none',
                  theme === 'dark' ? 'text-zinc-600' : 'text-zinc-400',
                )}
                aria-hidden
              >
                {i < LETTER_COUNT ? 'A' : '0'}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Format hint */}
      <p
        className={cn(
          'text-[10px] font-mono tracking-[0.2em] mb-3',
          side === 'left' && 'md:text-right',
          theme === 'dark' ? 'text-zinc-600' : 'text-zinc-400',
        )}
      >
        B O K · S I F
      </p>

      {/* Error message */}
      {error && (
        <p className={cn('text-xs text-red-400 mb-2', side === 'left' && 'md:text-right')}>
          {error}
        </p>
      )}

      {/* Submit button */}
      <motion.button
        onClick={handleSubmit}
        disabled={!isComplete || isSubmitting}
        className={cn(
          'py-2 px-6 rounded-lg font-sans font-semibold text-xs tracking-wide transition-all duration-300',
          'disabled:opacity-30 disabled:cursor-not-allowed',
          side === 'left' && 'md:ml-auto md:block',
          'bg-brand-500 text-white shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 hover:brightness-110',
        )}
        whileTap={isComplete && !isSubmitting ? { scale: 0.97 } : undefined}
      >
        {isSubmitting ? (
          <span className="inline-flex items-center gap-1.5">
            <motion.svg
              className="w-3.5 h-3.5"
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
    </div>
  );
}

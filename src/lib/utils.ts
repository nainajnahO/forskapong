import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Best-effort human message from an unknown error. Supabase's PostgrestError is a
 * plain object (not an Error instance), so a bare `err instanceof Error` check
 * swallows the real DB message — this reads `.message` off either shape. Known
 * RPC sentinels are mapped to Swedish; otherwise the raw message (or fallback).
 */
export function getErrorMessage(err: unknown, fallback = 'Något gick fel'): string {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === 'object' &&
          err !== null &&
          typeof (err as { message?: unknown }).message === 'string'
        ? (err as { message: string }).message
        : '';
  if (raw === 'INVALID_ADMIN_CODE') return 'Fel eller utgången adminkod – logga in igen.';
  return raw || fallback;
}

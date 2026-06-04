import { useCallback, useState } from 'react';
import { REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';

export type RealtimeStatus = 'connecting' | 'live' | 'stale';

/**
 * Tracks a Supabase Realtime channel's connection state for a live/stale UI
 * indicator. Pass the returned `onStatusChange` to `channel.subscribe(...)`.
 *
 * On (re)connect it runs `onReconnect` so the view catches up on anything that
 * changed while the socket was down — e.g. after the free-tier 200-connection
 * cap frees a slot. `onReconnect` must be stable (wrap it in useCallback) or the
 * channel will re-subscribe on every render.
 */
export function useRealtimeStatus(onReconnect: () => void) {
  const [status, setStatus] = useState<RealtimeStatus>('connecting');

  const onStatusChange = useCallback(
    (state: REALTIME_SUBSCRIBE_STATES) => {
      if (state === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
        setStatus('live');
        onReconnect();
      } else {
        // CLOSED / TIMED_OUT / CHANNEL_ERROR
        setStatus('stale');
      }
    },
    [onReconnect],
  );

  return { status, onStatusChange };
}

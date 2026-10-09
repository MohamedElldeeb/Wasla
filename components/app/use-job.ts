'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Job } from '@/lib/types';

const TERMINAL = ['succeeded', 'failed', 'cancelled'];
const rank = (j: Job) => (TERMINAL.includes(j.status) ? 2 : j.status === 'running' ? 1 : 0);

/** The more advanced of two snapshots of the same job (server-rendered vs. live), so a stale one never wins. */
function pick(a: Job | null, b: Job | null): Job | null {
  if (!a || !b || a.id !== b.id) return a ?? b;
  if (rank(a) !== rank(b)) return rank(a) > rank(b) ? a : b;
  return (a.progress ?? 0) >= (b.progress ?? 0) ? a : b;
}

/** Live job state: Supabase Realtime on `jobs` (RLS applies) plus a 4s polling fallback while the job is active. */
export function useJob(initial: Job | null, onDone?: (job: Job) => void): Job | null {
  const [live, setLive] = useState<Job | null>(null);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  const id = initial?.id;
  const startedTerminal = initial ? TERMINAL.includes(initial.status) : false;

  useEffect(() => {
    if (!id) return;
    const supabase = createClient();
    let alive = true;
    let finished = startedTerminal;
    const apply = (next: Job) => {
      if (!alive) return;
      setLive(next);
      if (!finished && TERMINAL.includes(next.status)) {
        finished = true;
        done.current?.(next);
      }
    };
    const channel = supabase
      .channel(`job-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'jobs', filter: `id=eq.${id}` }, (p) => apply(p.new as Job))
      .subscribe();
    const poll = setInterval(async () => {
      if (finished) return;
      const { data } = await supabase.from('jobs').select('*').eq('id', id).maybeSingle();
      if (data) apply(data as Job);
    }, 4000);
    return () => {
      alive = false;
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [id, startedTerminal]);

  return pick(initial, live);
}

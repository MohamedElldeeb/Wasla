'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { createClient } from '@/lib/supabase/client';
import { ar } from '@/lib/i18n/ar';

/** Google sign-in through Supabase Auth (the provider must be enabled in the Supabase dashboard). */
export function GoogleButton({ initialError }: { initialError?: boolean }) {
  const [error, setError] = useState(initialError ? ar.auth.googleFailed : '');
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    setError('');
    const { error: e } = await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (e) {
      setBusy(false);
      setError(ar.auth.googleFailed);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Button type="button" variant="outline" size="lg" onClick={go} disabled={busy} data-testid="google-signin">
        <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
          <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
          <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1C3.4 21.4 7.4 24 12 24z" />
          <path fill="#FBBC05" d="M5.4 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.6.4-2.4V6.5H1.4C.5 8.1 0 10 0 12s.5 3.9 1.4 5.5l4-3.1z" />
          <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C18 1.2 15.2 0 12 0 7.4 0 3.4 2.6 1.4 6.5l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
        </svg>
        {ar.auth.google}
      </Button>
      {error && <Alert variant="destructive" role="alert">{error}</Alert>}
      <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden>
        <span className="h-px flex-1 bg-border" />
        {ar.auth.or}
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}

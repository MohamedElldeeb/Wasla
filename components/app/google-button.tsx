'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { GoogleIcon } from '@/components/icons';
import { createClient } from '@/lib/supabase/client';
import { useT } from '@/components/app/i18n-provider';

/** Google sign-in through Supabase Auth (the provider must be enabled in the Supabase dashboard). First on the auth screens. */
export function GoogleButton({ initialError }: { initialError?: boolean }) {
  const t = useT();
  const [failed, setFailed] = useState(!!initialError);
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    setFailed(false);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setBusy(false);
      setFailed(true);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Button type="button" variant="secondary" size="lg" onClick={go} loading={busy} data-testid="google-signin">
        <GoogleIcon className="size-5" />
        {t.auth.google}
      </Button>
      {failed && <Alert variant="danger" role="alert">{t.auth.googleFailed}</Alert>}
      <div className="flex items-center gap-3 text-body-sm text-fg-muted" aria-hidden>
        <span className="h-px flex-1 bg-border" />
        {t.auth.or}
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}

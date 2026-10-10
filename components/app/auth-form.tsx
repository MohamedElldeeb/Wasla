'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Field } from '@/components/app/field';
import { GoogleButton } from '@/components/app/google-button';
import { useT } from '@/components/app/i18n-provider';
import type { AuthState } from '@/app/actions/auth';

type Props = { mode: 'login' | 'signup'; action: (s: AuthState, f: FormData) => Promise<AuthState>; oauthError?: boolean };

export function AuthForm({ mode, action, oauthError }: Props) {
  const t = useT();
  const [state, run, pending] = useActionState(action, undefined);
  const signup = mode === 'signup';
  return (
    <div className="flex flex-col gap-6">
      <GoogleButton initialError={oauthError} />
      <form action={run} className="flex flex-col gap-4" noValidate>
        {signup && (
          <Field id="full_name" label={t.auth.fullName}>
            <Input id="full_name" name="full_name" autoComplete="name" />
          </Field>
        )}
        <Field id="email" label={t.auth.email}>
          <Input id="email" name="email" type="email" dir="ltr" className="text-start" autoComplete="email" required />
        </Field>
        <Field id="password" label={t.auth.password}>
          <Input id="password" name="password" type="password" dir="ltr" className="text-start" autoComplete={signup ? 'new-password' : 'current-password'} required />
        </Field>
        {state?.error && <Alert variant="danger" role="alert">{state.error}</Alert>}
        {state?.info && <Alert role="status">{state.info}</Alert>}
        <Button type="submit" variant="primary" size="lg" loading={pending}>
          {signup ? t.auth.signup : t.auth.login}
        </Button>
        <p className="text-center text-body-sm text-fg-muted">
          {signup ? t.auth.haveAccount : t.auth.noAccount}{' '}
          <Link href={signup ? '/login' : '/signup'} className="inline-flex min-h-12 items-center font-semibold text-brand underline-offset-4 hover:underline">
            {signup ? t.auth.login : t.auth.signup}
          </Link>
        </p>
      </form>
    </div>
  );
}

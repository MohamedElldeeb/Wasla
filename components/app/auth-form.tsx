'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { GoogleButton } from '@/components/app/google-button';
import { ar } from '@/lib/i18n/ar';
import type { AuthState } from '@/app/actions/auth';

export function AuthForm({ mode, action, oauthError }: { mode: 'login' | 'signup'; action: (s: AuthState, f: FormData) => Promise<AuthState>; oauthError?: boolean }) {
  const [state, run, pending] = useActionState(action, undefined);
  const signup = mode === 'signup';
  return (
    <div className="flex flex-col gap-4">
    <GoogleButton initialError={oauthError} />
    <form action={run} className="flex flex-col gap-4" noValidate>
      {signup && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="full_name">{ar.auth.fullName}</Label>
          <Input id="full_name" name="full_name" autoComplete="name" />
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">{ar.auth.email}</Label>
        <Input id="email" name="email" type="email" dir="ltr" className="text-start" autoComplete="email" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">{ar.auth.password}</Label>
        <Input id="password" name="password" type="password" dir="ltr" className="text-start" autoComplete={signup ? 'new-password' : 'current-password'} required />
      </div>
      {state?.error && <Alert variant="destructive" role="alert">{state.error}</Alert>}
      {state?.info && <Alert role="status">{state.info}</Alert>}
      <Button type="submit" variant="cta" size="lg" disabled={pending}>
        {pending ? ar.common.loading : signup ? ar.auth.signup : ar.auth.login}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {signup ? ar.auth.haveAccount : ar.auth.noAccount}{' '}
        <Link href={signup ? '/login' : '/signup'} className="font-semibold text-primary underline-offset-4 hover:underline">
          {signup ? ar.auth.login : ar.auth.signup}
        </Link>
      </p>
    </form>
    </div>
  );
}

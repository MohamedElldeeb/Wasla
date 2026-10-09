import type { Metadata } from 'next';
import { AuthForm } from '@/components/app/auth-form';
import { login } from '@/app/actions/auth';
import { ar } from '@/lib/i18n/ar';

export const metadata: Metadata = { title: ar.auth.login };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <>
      <h1 className="mb-1 text-xl">{ar.auth.loginTitle}</h1>
      <p className="mb-5 text-sm text-muted-foreground">{ar.auth.loginSub}</p>
      <AuthForm mode="login" action={login} oauthError={error === 'oauth'} />
    </>
  );
}
